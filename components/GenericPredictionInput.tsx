'use client'

import { useState } from 'react'
import type { PredictionConfig } from '@/lib/activity-spec'

interface Props {
  config: PredictionConfig
  onCommit: (value: number) => void
}

export default function GenericPredictionInput({ config, onCommit }: Props) {
  const isCustom = config.inputType === 'slider_custom'
  const min = isCustom ? (config.min ?? 0) : 0
  const max = isCustom ? (config.max ?? 100) : 100
  const step = isCustom ? (config.step ?? 1) : 1
  const mid = (min + max) / 2
  const [value, setValue] = useState(mid)

  const displayValue = isCustom
    ? `${value.toFixed(step < 1 ? 1 : 0)}${config.unit ?? ''}`
    : `${Math.round(value)}%`

  return (
    <div className="predict-overlay">
      <div className="predict-card">
        {config.contextLines.map((line, i) => (
          <div key={i} style={{
            fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5,
            textAlign: 'center', marginBottom: i === config.contextLines.length - 1 ? 12 : 2,
          }}>{line}</div>
        ))}
        <h2 style={{
          fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 900,
          fontSize: '1.1rem', textAlign: 'center', marginBottom: 16, lineHeight: 1.3,
          color: 'var(--text)',
        }}>{config.prompt}</h2>
        <div style={{
          fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 900,
          fontSize: '2.4rem', textAlign: 'center', color: 'var(--gold-bright)',
          marginBottom: 12, fontVariantNumeric: 'tabular-nums',
        }}>{displayValue}</div>
        <input type="range" className="la-matrix-slider"
          min={min} max={max} step={step} value={value}
          onChange={e => setValue(parseFloat(e.target.value))}
          style={{ width: '100%', marginBottom: 16 }} />
        <button className="predict-commit-btn"
          onClick={() => onCommit(isCustom ? value / max : value / 100)}>
          LOCK IN MY PREDICTION
        </button>
      </div>
    </div>
  )
}
