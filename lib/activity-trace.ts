import { createTraceId, createActionId } from './trace'
import type { TraceAction, ExplanationAnswer, StageTransition } from './trace'

export type { TraceAction, ExplanationAnswer, StageTransition }
export { createTraceId, createActionId }

export interface ActivityTrace {
  traceId: string
  studentId: string
  activityId: string
  specVersion: number
  prediction: { value: number; timestamp: string }
  actions: TraceAction[]
  explanationAnswers: ExplanationAnswer[]
  stageTransitions: StageTransition[]
  finalState: Record<string, unknown>
  startedAt: string
  completedAt: string | null
}

export function assembleActivityTrace(
  traceId: string,
  studentId: string,
  activityId: string,
  specVersion: number,
  prediction: { value: number; timestamp: string },
  actions: TraceAction[],
  explanationAnswers: ExplanationAnswer[],
  stageTransitions: StageTransition[],
  finalState: Record<string, unknown>,
  startedAt: string,
): ActivityTrace {
  return {
    traceId,
    studentId,
    activityId,
    specVersion,
    prediction,
    actions: [...actions],
    explanationAnswers: [...explanationAnswers],
    stageTransitions: [...stageTransitions],
    finalState,
    startedAt,
    completedAt: new Date().toISOString(),
  }
}

export function validateActivityTrace(
  data: unknown
): { valid: true; trace: ActivityTrace } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Not an object' }
  const d = data as Record<string, unknown>

  if (typeof d.traceId !== 'string' || !d.traceId) return { valid: false, error: 'Missing traceId' }
  if (typeof d.studentId !== 'string') return { valid: false, error: 'Missing studentId' }
  if (typeof d.activityId !== 'string') return { valid: false, error: 'Missing activityId' }

  if (!d.prediction || typeof d.prediction !== 'object') return { valid: false, error: 'Missing prediction' }
  const pred = d.prediction as Record<string, unknown>
  if (typeof pred.value !== 'number' || pred.value < 0 || pred.value > 1) {
    return { valid: false, error: 'prediction.value must be 0-1' }
  }
  if (typeof pred.timestamp !== 'string') return { valid: false, error: 'prediction.timestamp required' }

  if (!Array.isArray(d.actions)) return { valid: false, error: 'actions must be array' }
  if (!Array.isArray(d.explanationAnswers)) return { valid: false, error: 'explanationAnswers must be array' }
  if (!Array.isArray(d.stageTransitions)) return { valid: false, error: 'stageTransitions must be array' }
  if (typeof d.startedAt !== 'string') return { valid: false, error: 'Missing startedAt' }

  return { valid: true, trace: data as ActivityTrace }
}
