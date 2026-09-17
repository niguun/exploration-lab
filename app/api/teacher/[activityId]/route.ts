import { NextResponse } from 'next/server'
import { classifyDemoTraces } from '@/lib/seed'
import { loadAllAssessments, loadTrace } from '@/lib/persistence'
import { aggregateAssessments } from '@/lib/aggregation'
import type { ReasoningPattern } from '@/lib/assessment-types'
import type { ReasoningAssessment } from '@/lib/assessment-types'
import type { StudentTrace } from '@/lib/trace'

const INTERVENTIONS: Record<ReasoningPattern, { recommendation: string; activity: string }> = {
  base_rate_neglect: {
    recommendation: 'Explore prevalence at 10% and 50% to see how base rates dominate test accuracy.',
    activity: 'bayes_prevalence_deep_dive',
  },
  sensitivity_posterior_confusion: {
    recommendation: 'Compare P(+|D) vs P(D|+) using the Positive Only view to see why sensitivity ≠ posterior.',
    activity: 'bayes_conditional_comparison',
  },
  denominator_confusion: {
    recommendation: 'Focus on the Positive Only view and count who is in the denominator: TP + FP, not just TP.',
    activity: 'bayes_denominator_focus',
  },
  correct_reasoning: {
    recommendation: 'Try an advanced challenge with prevalence near 50% where intuitions flip.',
    activity: 'bayes_high_prevalence_challenge',
  },
  insufficient_evidence: {
    recommendation: 'Review the activity, focusing on the Positive Only view and experimenting with the prevalence slider.',
    activity: 'bayes_medical_test_v1',
  },
}

const CORRECT_ANSWERS = new Set(['q1_b', 'q2_b', 'q3_a'])

function summarizeStudent(trace: StudentTrace, assessment: ReasoningAssessment) {
  const freeActions = trace.actions.filter(a => a.phase === 'free_explore')
  const sliders = new Set<string>()
  const filters = new Set<string>()
  for (const a of freeActions) {
    if (a.type === 'slider_change') sliders.add(a.detail.parameter as string)
    if (a.type === 'filter_change') filters.add(a.detail.to as string)
  }
  return {
    studentId: trace.studentId,
    traceId: trace.traceId,
    pattern: assessment.pattern,
    confidence: assessment.confidence,
    recovered: assessment.recovered,
    prediction: trace.prediction.value,
    posterior: trace.finalState.posterior,
    evidence: assessment.evidence,
    slidersExplored: Array.from(sliders),
    filtersViewed: Array.from(filters),
    explanationCorrect: trace.explanationAnswers.filter(a => CORRECT_ANSWERS.has(a.selectedOptionId)).length,
    explanationTotal: trace.explanationAnswers.length,
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const { activityId } = await params

  // Seed data (in-memory, deterministic) with fixed past timestamps
  const seedResults = classifyDemoTraces()
  const studentMap = new Map<string, { trace: StudentTrace; assessment: ReasoningAssessment }>()

  for (const { trace, assessment } of seedResults) {
    assessment.timestamp = '2024-06-15T12:00:00Z'
    studentMap.set(trace.studentId, { trace, assessment })
  }

  // Disk data overrides seed when same studentId (latest timestamp wins)
  const diskAssessments = await loadAllAssessments()
  for (const assessment of diskAssessments) {
    const existing = studentMap.get(assessment.studentId)
    if (!existing || assessment.timestamp > existing.assessment.timestamp) {
      const trace = await loadTrace(assessment.traceId)
      if (trace) {
        studentMap.set(assessment.studentId, { trace, assessment })
      }
    }
  }

  const merged = Array.from(studentMap.values())
  const assessments = merged.map(m => m.assessment)
  const aggregation = aggregateAssessments(activityId, assessments)

  const students = merged.map(({ trace, assessment }) =>
    summarizeStudent(trace, assessment),
  )

  return NextResponse.json({ aggregation, students, interventions: INTERVENTIONS })
}
