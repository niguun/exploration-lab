import type { LayoutMode } from './bayes'

export type ActionPhase = 'free_explore' | 'guided_observation'
export type ActionType = 'slider_change' | 'filter_change' | 'stage_transition'

export interface TraceAction {
  id: string
  phase: ActionPhase
  type: ActionType
  timestamp: string
  detail: Record<string, unknown>
}

export interface ExplanationAnswer {
  questionId: string
  selectedOptionId: string
  timestamp: string
}

export interface StageTransition {
  stage: string
  timestamp: string
}

export interface StudentTrace {
  traceId: string
  studentId: string
  activityId: string
  prediction: { value: number; timestamp: string }
  actions: TraceAction[]
  explanationAnswers: ExplanationAnswer[]
  stageTransitions: StageTransition[]
  finalState: {
    prevalence: number
    sensitivity: number
    specificity: number
    layoutMode: LayoutMode
    posterior: number
  }
  startedAt: string
  completedAt: string | null
}

export function createTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createActionId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

export function assembleTrace(
  traceId: string,
  studentId: string,
  activityId: string,
  prediction: { value: number; timestamp: string },
  actions: TraceAction[],
  explanationAnswers: ExplanationAnswer[],
  stageTransitions: StageTransition[],
  finalState: StudentTrace['finalState'],
  startedAt: string,
): StudentTrace {
  return {
    traceId,
    studentId,
    activityId,
    prediction,
    actions: [...actions],
    explanationAnswers: [...explanationAnswers],
    stageTransitions: [...stageTransitions],
    finalState,
    startedAt,
    completedAt: new Date().toISOString(),
  }
}
