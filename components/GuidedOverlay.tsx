'use client'

import type { LayoutMode } from '@/lib/bayes'
import { GUIDED_STEPS } from '@/lib/questions'

interface GuidedOverlayProps {
  currentFilter: LayoutMode
  stepsCompleted: number
  onStepComplete: () => void
  onFinish: () => void
}

export default function GuidedOverlay({ currentFilter, stepsCompleted, onStepComplete, onFinish }: GuidedOverlayProps) {
  const currentStep = GUIDED_STEPS[stepsCompleted]

  if (!currentStep) {
    return (
      <div className="guided-bar">
        <div className="guided-step-num">Complete</div>
        <div className="guided-text">All observations complete. Ready to check your understanding?</div>
        <button className="guided-btn" onClick={onFinish}>Continue to questions &rarr;</button>
      </div>
    )
  }

  const isConditionMet = currentFilter === currentStep.requiredFilter

  return (
    <div className="guided-bar">
      <div className="guided-step-num">Step {stepsCompleted + 1} of {GUIDED_STEPS.length}</div>
      <div className="guided-text">{currentStep.instruction}</div>
      {isConditionMet && (
        <button className="guided-btn" onClick={onStepComplete}>
          {stepsCompleted + 1 < GUIDED_STEPS.length ? 'Next →' : 'Done →'}
        </button>
      )}
    </div>
  )
}
