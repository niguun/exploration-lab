import type { ActivityTrace } from './activity-trace'
import type { ActivitySpec } from './activity-spec'

export interface ActivityAssessment {
  traceId: string
  studentId: string
  activityId: string
  tags: string[]
  correctCount: number
  totalCount: number
  exploredActions: number
  completedAllStages: boolean
  evidenceSummary: string
  timestamp: string
}

export function assessActivity(trace: ActivityTrace, spec: ActivitySpec): ActivityAssessment {
  const optionTagMap = new Map<string, string>()
  const correctSet = new Set<string>()
  for (const q of spec.explanationQuestions) {
    correctSet.add(q.correctOptionId)
    for (const opt of q.options) {
      optionTagMap.set(opt.id, opt.tag)
    }
  }

  const tags: string[] = []
  let correctCount = 0
  for (const answer of trace.explanationAnswers) {
    const tag = optionTagMap.get(answer.selectedOptionId)
    if (tag) tags.push(tag)
    if (correctSet.has(answer.selectedOptionId)) correctCount++
  }

  const totalCount = spec.explanationQuestions.length
  const exploredActions = trace.actions.length
  const completedAllStages = trace.completedAt !== null

  let evidenceSummary: string
  if (totalCount === 0) {
    evidenceSummary = 'Insufficient evidence'
  } else if (correctCount === totalCount) {
    evidenceSummary = 'Demonstrated understanding'
  } else if (correctCount >= totalCount / 2) {
    evidenceSummary = 'Partial understanding — some concept confusion'
  } else {
    evidenceSummary = 'Likely concept confusion'
  }

  if (exploredActions < 2 && correctCount < totalCount) {
    evidenceSummary = 'Insufficient exploration — evidence inconclusive'
  }

  return {
    traceId: trace.traceId,
    studentId: trace.studentId,
    activityId: trace.activityId,
    tags,
    correctCount,
    totalCount,
    exploredActions,
    completedAllStages,
    evidenceSummary,
    timestamp: new Date().toISOString(),
  }
}
