import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import type { PDFExtraction } from './pdf-extract'
import type { ActivitySpec, RendererType } from './activity-spec'
import { validateActivitySpec, RENDERER_TYPES } from './activity-spec'
import { buildConceptAnalysisPrompt, buildGenerationPrompt } from './bedrock-prompt'

export interface ConceptAnalysis {
  name: string
  rendererType: RendererType
  pageNumbers: number[]
  learningObjective: string
}

function getClient(): BedrockRuntimeClient {
  const region = process.env.AWS_REGION || 'us-east-1'
  return new BedrockRuntimeClient({ region })
}

function getModelId(): string {
  return process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-20250514'
}

async function invokeModel(system: string, user: string, maxTokens = 4096): Promise<string> {
  const client = getClient()
  const response = await client.send(new InvokeModelCommand({
    modelId: getModelId(),
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  }))
  const result = JSON.parse(new TextDecoder().decode(response.body))
  return result.content[0].text
}

function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()

  const bracketMatch = text.match(/[\[{][\s\S]*[\]}]/)
  if (bracketMatch) return bracketMatch[0]

  return text.trim()
}

export async function isBedrockAvailable(): Promise<boolean> {
  try {
    const client = getClient()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    await client.send(new InvokeModelCommand({
      modelId: getModelId(),
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    }), { abortSignal: controller.signal })
    clearTimeout(timeout)
    return true
  } catch {
    return false
  }
}

export async function analyzeConceptsFromPDF(
  extraction: PDFExtraction,
): Promise<ConceptAnalysis[]> {
  const { system, user } = buildConceptAnalysisPrompt(extraction, RENDERER_TYPES)
  const raw = await invokeModel(system, user)

  try {
    const parsed = JSON.parse(extractJSON(raw))
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (c: Record<string, unknown>) =>
        typeof c.name === 'string' &&
        typeof c.rendererType === 'string' &&
        RENDERER_TYPES.includes(c.rendererType as RendererType) &&
        Array.isArray(c.pageNumbers) &&
        typeof c.learningObjective === 'string'
    ) as ConceptAnalysis[]
  } catch {
    console.error('Failed to parse concept analysis response:', raw.slice(0, 200))
    return []
  }
}

export async function generateActivitySpec(
  extraction: PDFExtraction,
  rendererType: RendererType,
  conceptName: string,
  teacherHint?: string,
): Promise<{ spec: ActivitySpec | null; error?: string; rawResponse?: string }> {
  try {
    const { system, user } = buildGenerationPrompt(extraction, rendererType, conceptName, teacherHint)
    const raw = await invokeModel(system, user, 8192)

    let parsed: unknown
    try {
      parsed = JSON.parse(extractJSON(raw))
    } catch {
      return { spec: null, error: 'AI returned invalid JSON', rawResponse: raw.slice(0, 500) }
    }

    const validation = validateActivitySpec(parsed)
    if (!validation.valid) {
      return { spec: null, error: `Validation failed: ${validation.errors.join(', ')}`, rawResponse: raw.slice(0, 500) }
    }

    return { spec: validation.spec, rawResponse: raw }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    if (message.includes('credentials') || message.includes('Credential')) {
      return { spec: null, error: 'AWS credentials not configured or expired. Reauthenticate and retry.' }
    }
    if (message.includes('timeout') || message.includes('abort')) {
      return { spec: null, error: 'Request timed out. Try again.' }
    }
    if (message.includes('AccessDenied') || message.includes('not authorized')) {
      return { spec: null, error: 'AWS access denied. Check IAM permissions for Bedrock.' }
    }

    return { spec: null, error: `Bedrock error: ${message}` }
  }
}
