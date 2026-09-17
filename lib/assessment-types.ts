export type ReasoningPattern =
  | 'base_rate_neglect'
  | 'sensitivity_posterior_confusion'
  | 'denominator_confusion'
  | 'correct_reasoning'
  | 'insufficient_evidence'

export type Confidence = 'strong' | 'moderate' | 'weak'

export interface EvidenceItem {
  signal: string
  observed: string
  supports_pattern: ReasoningPattern
}

export interface ClassifierSignal extends EvidenceItem {
  group: 'prediction' | 'free_explore' | 'explanation'
}

export interface ReasoningAssessment {
  traceId: string
  studentId: string
  activityId: string
  pattern: ReasoningPattern
  confidence: Confidence
  recovered: boolean
  evidence: EvidenceItem[]
  timestamp: string
}

export interface ClassAggregation {
  activityId: string
  totalStudents: number
  patternCounts: Record<ReasoningPattern, number>
  recoveryCounts: Record<ReasoningPattern, number>
  confidenceBreakdown: Record<Confidence, number>
  insufficientEvidenceCount: number
  studentsByPattern: Record<ReasoningPattern, string[]>
  evidenceSummaries: Record<ReasoningPattern, string[]>
  timestamp: string
}
