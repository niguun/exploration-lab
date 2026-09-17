'use client'

import { useState } from 'react'
import type { ExplanationQuestionSpec } from '@/lib/activity-spec'
import type { ExplanationAnswer } from '@/lib/trace'

interface Props {
  questions: ExplanationQuestionSpec[]
  contextTitle: string
  onComplete: (answers: ExplanationAnswer[]) => void
}

export default function GenericExplanationStep({ questions, contextTitle, onComplete }: Props) {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<ExplanationAnswer[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  const question = questions[currentQ]
  const isLast = currentQ === questions.length - 1

  const handleNext = () => {
    if (!selected) return
    const answer: ExplanationAnswer = {
      questionId: question.id,
      selectedOptionId: selected,
      timestamp: new Date().toISOString(),
    }
    const newAnswers = [...answers, answer]
    if (isLast) {
      onComplete(newAnswers)
    } else {
      setAnswers(newAnswers)
      setCurrentQ(prev => prev + 1)
      setSelected(null)
    }
  }

  return (
    <div className="explain-overlay">
      <div className="explain-card">
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--text-dim)', marginBottom: 8 }}>
          Question {currentQ + 1} of {questions.length}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: 12 }}>
          {contextTitle}
        </div>
        <div style={{
          fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 900,
          fontSize: '1rem', lineHeight: 1.35, marginBottom: 16, color: 'var(--text)',
        }}>{question.text}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {question.options.map(opt => (
            <button key={opt.id}
              className={`explain-option ${selected === opt.id ? 'selected' : ''}`}
              onClick={() => setSelected(opt.id)}>
              {opt.text}
            </button>
          ))}
        </div>
        <button className="explain-next-btn"
          disabled={!selected}
          onClick={handleNext}>
          {isLast ? 'Complete' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
