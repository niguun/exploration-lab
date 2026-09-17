'use client'

import type { GuidedStepSpec } from '@/lib/activity-spec'

interface Props {
  steps: GuidedStepSpec[]
  stepsCompleted: number
  hasInteracted: boolean
  onStepComplete: () => void
  onFinish: () => void
}

export default function GenericGuidedOverlay({ steps, stepsCompleted, hasInteracted, onStepComplete, onFinish }: Props) {
  const currentStep = steps[stepsCompleted]
  const isLast = stepsCompleted === steps.length - 1
  const allDone = stepsCompleted >= steps.length

  if (allDone) {
    return (
      <div className="guided-bar">
        <div className="guided-bar-inner">
          <div className="guided-complete-text">Guided observation complete</div>
          <button className="guided-next-btn" onClick={onFinish}>
            Continue to questions →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="guided-bar">
      <div className="guided-bar-inner">
        <div className="guided-step-counter">
          Step {stepsCompleted + 1} of {steps.length}
        </div>
        <div className="guided-instruction">{currentStep.instruction}</div>
        {hasInteracted && (
          <button className="guided-next-btn" onClick={onStepComplete}>
            {isLast ? 'Done' : 'Next →'}
          </button>
        )}
        {!hasInteracted && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
            Interact with the visualization to continue
          </span>
        )}
      </div>
    </div>
  )
}
