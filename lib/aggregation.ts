import type {
  ReasoningPattern, Confidence, ReasoningAssessment, ClassAggregation,
} from './assessment-types'

const ALL_PATTERNS: ReasoningPattern[] = [
  'base_rate_neglect', 'sensitivity_posterior_confusion',
  'denominator_confusion', 'correct_reasoning', 'insufficient_evidence',
]
const ALL_CONFIDENCES: Confidence[] = ['strong', 'moderate', 'weak']

export function aggregateAssessments(
  activityId: string,
  assessments: ReasoningAssessment[],
): ClassAggregation {
  const patternCounts = Object.fromEntries(ALL_PATTERNS.map(p => [p, 0])) as Record<ReasoningPattern, number>
  const recoveryCounts = Object.fromEntries(ALL_PATTERNS.map(p => [p, 0])) as Record<ReasoningPattern, number>
  const confidenceBreakdown = Object.fromEntries(ALL_CONFIDENCES.map(c => [c, 0])) as Record<Confidence, number>
  const studentsByPattern = Object.fromEntries(ALL_PATTERNS.map(p => [p, [] as string[]])) as Record<ReasoningPattern, string[]>
  const evidenceSummaries = Object.fromEntries(ALL_PATTERNS.map(p => [p, [] as string[]])) as Record<ReasoningPattern, string[]>

  for (const a of assessments) {
    patternCounts[a.pattern]++
    confidenceBreakdown[a.confidence]++
    studentsByPattern[a.pattern].push(a.studentId)

    if (a.recovered) {
      recoveryCounts[a.pattern]++
    }

    for (const ev of a.evidence) {
      if (ev.supports_pattern === a.pattern) {
        const desc = ev.observed
        if (!evidenceSummaries[a.pattern].includes(desc)) {
          evidenceSummaries[a.pattern].push(desc)
        }
      }
    }
  }

  return {
    activityId,
    totalStudents: assessments.length,
    patternCounts,
    recoveryCounts,
    confidenceBreakdown,
    insufficientEvidenceCount: patternCounts.insufficient_evidence,
    studentsByPattern,
    evidenceSummaries,
    timestamp: new Date().toISOString(),
  }
}
