'use client'

import type { StudentTrace } from '@/lib/trace'

interface CompleteSummaryProps {
  trace: StudentTrace
  submitted?: boolean
}

export default function CompleteSummary({ trace, submitted }: CompleteSummaryProps) {
  const predPct = Math.round(trace.prediction.value * 100)
  const actualPct = (trace.finalState.posterior * 100).toFixed(1)

  return (
    <div className="explain-overlay">
      <div className="explain-card" style={{ maxWidth: 480 }}>
        <div className="explain-step">Activity Complete</div>

        <div className="complete-comparison">
          <div className="complete-stat">
            <div className="complete-stat-label">Your Prediction</div>
            <div className="complete-stat-value">{predPct}%</div>
          </div>
          <div className="complete-arrow">&rarr;</div>
          <div className="complete-stat">
            <div className="complete-stat-label">Actual Answer</div>
            <div className="complete-stat-value gold">{actualPct}%</div>
          </div>
        </div>

        <p className="complete-insight">
          When a condition is rare, even accurate tests produce many false positives
          relative to true positives. The posterior probability P(Disease | Positive)
          depends critically on prevalence — not just test accuracy.
        </p>

        <div className="complete-meta">
          {submitted
            ? 'Trace submitted to your teacher'
            : 'Submitting trace…'}
          &nbsp;&middot; {trace.actions.length} actions &middot; {trace.explanationAnswers.length} questions answered
        </div>
      </div>
    </div>
  )
}
