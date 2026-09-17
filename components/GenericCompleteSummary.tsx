'use client'

interface Props {
  title: string
  insight: string
  submitted: boolean
}

export default function GenericCompleteSummary({ title, insight, submitted }: Props) {
  return (
    <div className="complete-overlay">
      <div className="complete-card">
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'var(--gold)', marginBottom: 10 }}>
          ACTIVITY COMPLETE
        </div>
        <div style={{
          fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 900,
          fontSize: '1.2rem', lineHeight: 1.2, marginBottom: 16, color: 'var(--text)',
        }}>{title}</div>
        <div style={{
          fontFamily: '"Source Serif 4", Georgia, serif', fontStyle: 'italic',
          fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55,
          maxWidth: 440, textAlign: 'center', marginBottom: 20,
        }}>{insight}</div>
        <div style={{ fontSize: '0.72rem', color: submitted ? 'var(--gold)' : 'var(--text-dim)' }}>
          {submitted ? 'Trace submitted to your teacher.' : 'Submitting trace...'}
        </div>
      </div>
    </div>
  )
}
