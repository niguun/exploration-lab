'use client'

const PHASES = [
  { num: '01', label: 'Predict' },
  { num: '02', label: 'Explore' },
  { num: '03', label: 'Observe' },
  { num: '04', label: 'Explain' },
  { num: '05', label: 'Review' },
]

interface BottomPhaseNavProps {
  activeIndex: number
}

export default function BottomPhaseNav({ activeIndex }: BottomPhaseNavProps) {
  return (
    <footer className="scene-footer">
      <div className="phase-steps">
        {PHASES.map((p, i) => (
          <div
            key={p.num}
            className={`phase-step-item ${i === activeIndex ? 'active' : ''} ${i < activeIndex ? 'done' : ''}`}
          >
            <span className="phase-step-dot" />
            <span className="phase-step-num">{p.num}</span>
            {p.label}
          </div>
        ))}
      </div>
      <span className="footer-tagline">Probability Builds Judgment</span>
    </footer>
  )
}
