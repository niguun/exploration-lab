export type RendererType =
  | 'distributions'
  | 'simulation'
  | 'inference'
  | 'matrix_transform'
  | 'basis'
  | 'determinant'
  | 'eigenvectors'
  | 'projections'

export const RENDERER_TYPES: RendererType[] = [
  'distributions', 'simulation', 'inference',
  'matrix_transform', 'basis', 'determinant', 'eigenvectors', 'projections',
]

export interface PredictionConfig {
  prompt: string
  inputType: 'slider_0_100' | 'slider_custom'
  min?: number
  max?: number
  step?: number
  unit?: string
  contextLines: string[]
}

export interface GuidedStepSpec {
  id: string
  instruction: string
  actionHint?: string
}

export interface ExplanationOptionSpec {
  id: string
  text: string
  tag: string
}

export interface ExplanationQuestionSpec {
  id: string
  text: string
  options: ExplanationOptionSpec[]
  correctOptionId: string
}

export interface SourceEvidence {
  page: number
  excerpt: string
}

export interface SourceGrounding {
  filename: string
  pagesCited: number[]
  evidence: SourceEvidence[]
}

export interface ActivitySpec {
  id: string
  version: 1
  title: string
  bigQuestion: string
  domain: string
  concept: string
  learningObjective: string
  rendererType: RendererType
  rendererConfig: Record<string, unknown>
  prediction: PredictionConfig
  guidedSteps: GuidedStepSpec[]
  explanationQuestions: ExplanationQuestionSpec[]
  completionInsight: string
  sourceGrounding?: SourceGrounding
  createdAt: string
}

export function validateActivitySpec(
  data: unknown
): { valid: true; spec: ActivitySpec } | { valid: false; errors: string[] } {
  const errors: string[] = []
  if (!data || typeof data !== 'object') return { valid: false, errors: ['Not an object'] }

  const d = data as Record<string, unknown>

  if (typeof d.id !== 'string' || !d.id) errors.push('Missing id')
  if (typeof d.title !== 'string' || !d.title) errors.push('Missing title')
  if (typeof d.bigQuestion !== 'string') errors.push('Missing bigQuestion')
  if (typeof d.rendererType !== 'string' || !RENDERER_TYPES.includes(d.rendererType as RendererType)) {
    errors.push(`Invalid rendererType: ${d.rendererType}. Must be one of: ${RENDERER_TYPES.join(', ')}`)
  }
  if (!d.rendererConfig || typeof d.rendererConfig !== 'object') errors.push('Missing rendererConfig')

  if (!d.prediction || typeof d.prediction !== 'object') {
    errors.push('Missing prediction config')
  } else {
    const p = d.prediction as Record<string, unknown>
    if (typeof p.prompt !== 'string' || !p.prompt) errors.push('Missing prediction.prompt')
    if (!Array.isArray(p.contextLines)) errors.push('prediction.contextLines must be array')
  }

  if (!Array.isArray(d.guidedSteps) || d.guidedSteps.length === 0) {
    errors.push('Must have at least 1 guided step')
  } else {
    const ids = new Set<string>()
    for (const step of d.guidedSteps as Record<string, unknown>[]) {
      if (typeof step.id !== 'string') errors.push('Guided step missing id')
      else if (ids.has(step.id)) errors.push(`Duplicate guided step id: ${step.id}`)
      else ids.add(step.id)
      if (typeof step.instruction !== 'string') errors.push('Guided step missing instruction')
    }
  }

  if (!Array.isArray(d.explanationQuestions) || d.explanationQuestions.length === 0) {
    errors.push('Must have at least 1 explanation question')
  } else {
    const qIds = new Set<string>()
    for (const q of d.explanationQuestions as Record<string, unknown>[]) {
      if (typeof q.id !== 'string') errors.push('Question missing id')
      else if (qIds.has(q.id)) errors.push(`Duplicate question id: ${q.id}`)
      else qIds.add(q.id)
      if (!Array.isArray(q.options) || q.options.length < 2) errors.push(`Question ${q.id}: needs >= 2 options`)
      if (typeof q.correctOptionId !== 'string') errors.push(`Question ${q.id}: missing correctOptionId`)
    }
  }

  if (errors.length > 0) return { valid: false, errors }
  return { valid: true, spec: data as ActivitySpec }
}
