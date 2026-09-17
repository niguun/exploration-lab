'use client'

import { useState } from 'react'

interface PredictionInputProps {
  prevalence: number
  sensitivity: number
  specificity: number
  onCommit: (value: number) => void
}

export default function PredictionInput({ prevalence, sensitivity, specificity, onCommit }: PredictionInputProps) {
  const [value, setValue] = useState(50)

  return (
    <div className="predict-overlay">
      <div className="predict-card">
        <div className="predict-heading">Before you see the answer&hellip;</div>
        <div className="predict-context">
          A disease affects <strong>{(prevalence * 100).toFixed(1)}%</strong> of the population.
          A test has <strong>{Math.round(sensitivity * 100)}%</strong> sensitivity
          and <strong>{Math.round(specificity * 100)}%</strong> specificity.
        </div>
        <div className="predict-prompt">
          If someone tests <span style={{ color: 'var(--gold-bright)' }}>positive</span>,
          what&rsquo;s the probability they actually have the disease?
        </div>
        <div className="predict-value-display">{value}%</div>
        <input
          type="range"
          className="param-slider predict-slider"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={e => setValue(parseInt(e.target.value))}
        />
        <div className="predict-ticks">
          <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
        </div>
        <button className="predict-commit" onClick={() => onCommit(value / 100)}>
          Lock In My Prediction
        </button>
      </div>
    </div>
  )
}
