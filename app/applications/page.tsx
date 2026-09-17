'use client'

import { useState, useMemo } from 'react'
import PhaseNav from '@/components/PhaseNav'
import LeftSidebar from '@/components/LeftSidebar'
import BottomPhaseNav from '@/components/BottomPhaseNav'
import { computeBayes } from '@/lib/bayes'

interface Scenario {
  key: string
  title: string
  icon: string
  conditionLabel: string
  testLabel: string
  positiveLabel: string
  prevalenceLabel: string
  prevalence: number
  sensitivity: number
  specificity: number
  question: string
  insight: string
}

const SCENARIOS: Scenario[] = [
  {
    key: 'medical', title: 'Medical Screening', icon: '⊕',
    conditionLabel: 'Disease', testLabel: 'Diagnostic Test', positiveLabel: 'Positive Result',
    prevalenceLabel: 'Disease Prevalence', prevalence: 0.01, sensitivity: 0.95, specificity: 0.95,
    question: 'If the test is positive, what is the probability of actually having the disease?',
    insight: 'Even accurate tests produce many false positives when the condition is rare.',
  },
  {
    key: 'spam', title: 'Spam Filtering', icon: '✉',
    conditionLabel: 'Spam', testLabel: 'Spam Filter', positiveLabel: 'Flagged as Spam',
    prevalenceLabel: 'Spam Rate', prevalence: 0.20, sensitivity: 0.98, specificity: 0.92,
    question: 'If an email is flagged, what is the probability it is actually spam?',
    insight: 'High spam rates make the filter more reliable — base rate works in your favor.',
  },
  {
    key: 'manufacturing', title: 'Manufacturing QC', icon: '⚙',
    conditionLabel: 'Defective', testLabel: 'Inspection', positiveLabel: 'Flagged Defective',
    prevalenceLabel: 'Defect Rate', prevalence: 0.02, sensitivity: 0.90, specificity: 0.97,
    question: 'If an item is flagged by inspection, what is the probability it is actually defective?',
    insight: 'Low defect rates mean most flagged items are actually fine — costly false alarms.',
  },
  {
    key: 'fraud', title: 'Fraud Detection', icon: '⚑',
    conditionLabel: 'Fraud', testLabel: 'Algorithm', positiveLabel: 'Flagged Transaction',
    prevalenceLabel: 'Fraud Rate', prevalence: 0.005, sensitivity: 0.99, specificity: 0.99,
    question: 'If a transaction is flagged, what is the probability it is actually fraudulent?',
    insight: 'Even with 99% accuracy, extremely rare events produce surprisingly low posterior probabilities.',
  },
]

export default function ApplicationsPage() {
  const [activeIdx, setActiveIdx] = useState(0)
  const scenario = SCENARIOS[activeIdx]

  const [prevalence, setPrevalence] = useState(scenario.prevalence)
  const [sensitivity, setSensitivity] = useState(scenario.sensitivity)
  const [specificity, setSpecificity] = useState(scenario.specificity)

  const switchScenario = (idx: number) => {
    setActiveIdx(idx)
    const s = SCENARIOS[idx]
    setPrevalence(s.prevalence); setSensitivity(s.sensitivity); setSpecificity(s.specificity)
  }

  const result = useMemo(() => computeBayes({ prevalence, sensitivity, specificity, population: 1000 }), [prevalence, sensitivity, specificity])
  const posteriorPct = (result.posterior * 100).toFixed(1)

  return (
    <div className="scene">
      <PhaseNav />
      <LeftSidebar />
      <div className="stage">
        <div className="stage-top">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="breadcrumb">Applications</div>
              <h1 className="big-question">Different context.<br /><span className="hl">Same reasoning.</span></h1>
            </div>
            <div className="floating-quote" style={{ textAlign: 'right', flexShrink: 0, marginLeft: 32, marginTop: 4 }}>
              &ldquo;Understanding transfers<br />across domains.&rdquo;
            </div>
          </div>
        </div>

        <div className="stage-center">
          <div className="canvas-area" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Scenario selector */}
            <div style={{ display: 'flex', gap: 8, padding: '8px 0', flexShrink: 0, justifyContent: 'center' }}>
              {SCENARIOS.map((s, i) => (
                <button key={s.key} onClick={() => switchScenario(i)}
                  className={`dist-preset-btn ${i === activeIdx ? 'active' : ''}`}
                  style={i === activeIdx ? { background: 'rgba(196,154,60,0.12)', color: 'var(--gold)' } : {}}>
                  <span style={{ marginRight: 4 }}>{s.icon}</span> {s.title}
                </button>
              ))}
            </div>

            {/* Main content */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '200px 1fr 220px', gap: 20, padding: '12px 16px', minHeight: 0 }}>
              {/* Left: Parameters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
                <div className="param-group">
                  <div className="param-header">
                    <span className="param-name">{scenario.prevalenceLabel}</span>
                  </div>
                  <div className="param-value-display">{(prevalence * 100).toFixed(1)}%</div>
                  <input type="range" className="param-slider" min={0.1} max={50} step={0.1} value={prevalence * 100}
                    onChange={e => setPrevalence(parseFloat(e.target.value) / 100)} />
                </div>
                <div className="param-group">
                  <div className="param-header"><span className="param-name">Sensitivity</span><span className="param-notation">P(+|{scenario.conditionLabel})</span></div>
                  <div className="param-value-display">{(sensitivity * 100).toFixed(0)}%</div>
                  <input type="range" className="param-slider" min={50} max={99.9} step={0.1} value={sensitivity * 100}
                    onChange={e => setSensitivity(parseFloat(e.target.value) / 100)} />
                </div>
                <div className="param-group">
                  <div className="param-header"><span className="param-name">Specificity</span><span className="param-notation">P(−|¬{scenario.conditionLabel})</span></div>
                  <div className="param-value-display">{(specificity * 100).toFixed(0)}%</div>
                  <input type="range" className="param-slider" min={50} max={99.9} step={0.1} value={specificity * 100}
                    onChange={e => setSpecificity(parseFloat(e.target.value) / 100)} />
                </div>
              </div>

              {/* Center: Visual result */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: '0.9rem', color: 'var(--text-dim)', fontStyle: 'italic', maxWidth: 420, lineHeight: 1.5 }}>
                    {scenario.question}
                  </div>
                </div>

                {/* Big posterior display */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 900, fontSize: 'clamp(3rem, 8vw, 5.5rem)', color: 'var(--gold-bright)', lineHeight: 1, transition: 'all 0.3s' }}>
                    {posteriorPct}%
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                    P({scenario.conditionLabel} | {scenario.positiveLabel})
                  </div>
                </div>

                {/* Breakdown */}
                <div style={{ display: 'flex', gap: 32, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: 'var(--gold-bright)', fontSize: '1.1rem' }}>{result.truePositive}</div>
                    <div>True {scenario.positiveLabel.split(' ')[0]}</div>
                  </div>
                  <div style={{ color: 'var(--text-dim)', alignSelf: 'center' }}>of</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '1.1rem' }}>{result.totalPositive}</div>
                    <div>Total {scenario.positiveLabel}</div>
                  </div>
                </div>

                {/* Insight */}
                <div style={{
                  maxWidth: 400, textAlign: 'center', padding: '12px 16px',
                  borderLeft: '2px solid rgba(196,154,60,0.2)',
                  fontFamily: '"Source Serif 4", Georgia, serif',
                  fontSize: '0.82rem', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.55,
                }}>
                  {scenario.insight}
                </div>
              </div>

              {/* Right: Bayes equation + summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
                <div>
                  <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-dim)', marginBottom: 8 }}>Bayes&apos; Rule</div>
                  <div className="equation-inline" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                    <div>
                      <span className="equation-var" style={{ color: 'var(--text-secondary)' }}>P({scenario.conditionLabel}|+)</span>
                      <span className="equation-eq"> = </span>
                    </div>
                    <div className="equation-fraction">
                      <span className="equation-num">
                        <span className="equation-var gold">P(+|{scenario.conditionLabel})</span>
                        <span className="equation-eq"> · </span>
                        <span className="equation-var gold">P({scenario.conditionLabel})</span>
                      </span>
                      <span className="equation-den">
                        <span className="equation-var gold">P(+|{scenario.conditionLabel}) · P({scenario.conditionLabel})</span>
                        <span className="equation-eq"> + </span>
                        <span className="equation-var blue">P(+|¬{scenario.conditionLabel}) · P(¬{scenario.conditionLabel})</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(176,141,87,0.06)', paddingTop: 12 }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-dim)', marginBottom: 6 }}>Population of 1,000</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.8 }}>
                    <div>{scenario.conditionLabel}: <strong style={{ color: 'var(--gold-bright)' }}>{result.diseased}</strong></div>
                    <div>Not {scenario.conditionLabel}: <strong style={{ color: 'var(--text-secondary)' }}>{result.healthy}</strong></div>
                    <div>True +: <strong style={{ color: 'var(--gold-bright)' }}>{result.truePositive}</strong> · False +: <strong style={{ color: 'var(--dot-healthy)' }}>{result.falsePositive}</strong></div>
                    <div>True −: <strong>{result.trueNegative}</strong> · False −: <strong>{result.falseNegative}</strong></div>
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', opacity: 0.6, fontStyle: 'italic' }}>
                  Same mathematical structure.<br />Different real-world stakes.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bottom-strip">
          <div className="bottom-strip-left">
            <span className="result-label">{scenario.title}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="result-big">{posteriorPct}%</span>
              <span className="result-context">posterior probability</span>
            </div>
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
            Different context · Same reasoning structure
          </div>
        </div>
      </div>
      <BottomPhaseNav activeIndex={4} />
    </div>
  )
}
