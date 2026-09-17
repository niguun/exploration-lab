'use client'

import { useState } from 'react'
import { EXPLANATION_QUESTIONS } from '@/lib/questions'
import type { ExplanationAnswer } from '@/lib/trace'

interface ExplanationStepProps {
  predictionValue: number
  posterior: number
  onComplete: (answers: ExplanationAnswer[]) => void
}

export default function ExplanationStep({ predictionValue, posterior, onComplete }: ExplanationStepProps) {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<ExplanationAnswer[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  const question = EXPLANATION_QUESTIONS[currentQ]

  const handleNext = () => {
    if (!selected) return
    const answer: ExplanationAnswer = {
      questionId: question.id,
      selectedOptionId: selected,
      timestamp: new Date().toISOString(),
    }
    const newAnswers = [...answers, answer]

    if (currentQ + 1 >= EXPLANATION_QUESTIONS.length) {
      onComplete(newAnswers)
    } else {
      setAnswers(newAnswers)
      setSelected(null)
      setCurrentQ(currentQ + 1)
    }
  }

  return (
    <div className="explain-overlay">
      <div className="explain-card">
        <div className="explain-header">
          <div className="explain-step">Question {currentQ + 1} of {EXPLANATION_QUESTIONS.length}</div>
          <div className="explain-comparison">
            <span>Your prediction: <strong>{Math.round(predictionValue * 100)}%</strong></span>
            <span className="explain-sep">&rarr;</span>
            <span>Actual: <strong style={{ color: 'var(--gold)' }}>{(posterior * 100).toFixed(1)}%</strong></span>
          </div>
        </div>

        <div className="explain-question">{question.text}</div>

        <div className="explain-options">
          {question.options.map(opt => (
            <button
              key={opt.id}
              className={`explain-option ${selected === opt.id ? 'selected' : ''}`}
              onClick={() => setSelected(opt.id)}
            >
              {opt.text}
            </button>
          ))}
        </div>

        <button
          className="explain-next"
          disabled={!selected}
          onClick={handleNext}
        >
          {currentQ + 1 >= EXPLANATION_QUESTIONS.length ? 'Complete' : 'Next Question'}
        </button>
      </div>
    </div>
  )
}
