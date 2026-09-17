import { NextResponse } from 'next/server'
import { validateTrace, classify } from '@/lib/classifier'
import { saveTrace, saveAssessment, loadAssessment } from '@/lib/persistence'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = validateTrace(body)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const trace = validation.trace
  const { saved, duplicate } = await saveTrace(trace)

  if (duplicate) {
    const existing = await loadAssessment(trace.traceId)
    if (existing) {
      return NextResponse.json({ assessment: existing, duplicate: true })
    }
  }

  const assessment = classify(trace)
  await saveAssessment(assessment)

  return NextResponse.json({ assessment, duplicate: false }, { status: saved ? 201 : 200 })
}
