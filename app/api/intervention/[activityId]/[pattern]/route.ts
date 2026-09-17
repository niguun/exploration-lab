import { NextResponse } from 'next/server'
import type { ReasoningPattern } from '@/lib/assessment-types'

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

const VALID_PATTERNS: Set<string> = new Set(Object.keys(INTERVENTIONS))

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ activityId: string; pattern: string }> },
) {
  const { activityId, pattern } = await params

  if (!VALID_PATTERNS.has(pattern)) {
    return NextResponse.json({ error: `Unknown pattern: ${pattern}` }, { status: 400 })
  }

  const intervention = INTERVENTIONS[pattern as ReasoningPattern]
  return NextResponse.json({
    activityId,
    pattern,
    ...intervention,
  })
}
