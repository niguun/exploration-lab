'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

/* ── Types ── */

interface EvidenceItem {
  signal: string
  observed: string
  supports_pattern: string
}

interface StudentData {
  studentId: string
  traceId: string
  pattern: string
  confidence: string
  recovered: boolean
  prediction: number
  posterior: number
  evidence: EvidenceItem[]
  slidersExplored: string[]
  filtersViewed: string[]
  explanationCorrect: number
  explanationTotal: number
}

interface Aggregation {
  totalStudents: number
  patternCounts: Record<string, number>
  recoveryCounts: Record<string, number>
  confidenceBreakdown: Record<string, number>
}

interface Intervention {
  recommendation: string
  activity: string
}

interface TeacherData {
  aggregation: Aggregation
  students: StudentData[]
  interventions: Record<string, Intervention>
}

interface DotData {
  studentId: string
  x: number
  y: number
  originX: number
  originY: number
  color: string
  size: number
  opacity: number
  pattern: string
  confidence: string
  recovered: boolean
  isLive: boolean
}

/* ── Pattern Configuration ── */

interface PatternConfig {
  label: string
  color: string
  x: number
  y: number
  description: string
}

const PATTERN_CONFIG: Record<string, PatternConfig> = {
  base_rate_neglect: {
    label: 'Base Rate Neglect',
    color: '#E8B84B',
    x: 18, y: 28,
    description: 'Students predict high accuracy, overlooking the low disease prevalence.',
  },
  sensitivity_posterior_confusion: {
    label: 'Sensitivity–Posterior Confusion',
    color: '#A78BDA',
    x: 18, y: 72,
    description: 'Students confuse test sensitivity P(+|D) with the posterior P(D|+).',
  },
  denominator_confusion: {
    label: 'Denominator Confusion',
    color: '#4ECDC4',
    x: 36, y: 50,
    description: 'Students examine disease groups but not the positive-test subgroup.',
  },
  insufficient_evidence: {
    label: 'Insufficient Evidence',
    color: '#6B7D94',
    x: 52, y: 50,
    description: 'Not enough convergent evidence to classify a specific reasoning pattern.',
  },
  correct_reasoning: {
    label: 'Correct Understanding',
    color: '#7CD992',
    x: 80, y: 50,
    description: 'Students identified prevalence as the key factor and verified it.',
  },
}

const CORRECT_POS = PATTERN_CONFIG.correct_reasoning

const DOT_SIZES: Record<string, number> = { strong: 14, moderate: 11, weak: 8 }
const DOT_OPACITIES: Record<string, number> = { strong: 1, moderate: 0.8, weak: 0.55 }
const RECOVERY_PULL = 0.35
const GOLDEN_ANGLE = 137.508 * (Math.PI / 180)

function isSeedStudent(id: string): boolean {
  return id.startsWith('demo_student_')
}

/* ── Dot Positioning ── */

function scatterPositions(
  count: number, cx: number, cy: number,
): { x: number; y: number }[] {
  if (count === 0) return []
  if (count === 1) return [{ x: cx, y: cy }]
  const baseRadius = 1.8 + Math.sqrt(count) * 1.3
  return Array.from({ length: count }, (_, i) => {
    const r = baseRadius * (0.35 + 0.65 * Math.sqrt((i + 0.5) / count))
    const theta = i * GOLDEN_ANGLE
    return {
      x: cx + r * Math.cos(theta),
      y: cy + r * Math.sin(theta),
    }
  })
}

function computeDots(students: StudentData[]): DotData[] {
  const grouped: Record<string, StudentData[]> = {}
  const recovered: StudentData[] = []

  for (const s of students) {
    if (s.recovered) {
      recovered.push(s)
    } else {
      if (!grouped[s.pattern]) grouped[s.pattern] = []
      grouped[s.pattern].push(s)
    }
  }

  const dots: DotData[] = []

  for (const [pattern, group] of Object.entries(grouped)) {
    const config = PATTERN_CONFIG[pattern]
    if (!config) continue
    const positions = scatterPositions(group.length, config.x, config.y)
    for (let i = 0; i < group.length; i++) {
      const s = group[i]
      dots.push({
        studentId: s.studentId,
        x: positions[i].x,
        y: positions[i].y,
        originX: config.x,
        originY: config.y,
        color: config.color,
        size: DOT_SIZES[s.confidence] || 11,
        opacity: DOT_OPACITIES[s.confidence] || 0.8,
        pattern: s.pattern,
        confidence: s.confidence,
        recovered: false,
        isLive: !isSeedStudent(s.studentId),
      })
    }
  }

  const recoveredByPattern: Record<string, StudentData[]> = {}
  for (const s of recovered) {
    if (!recoveredByPattern[s.pattern]) recoveredByPattern[s.pattern] = []
    recoveredByPattern[s.pattern].push(s)
  }

  for (const [pattern, group] of Object.entries(recoveredByPattern)) {
    const config = PATTERN_CONFIG[pattern]
    if (!config) continue
    const midX = config.x + (CORRECT_POS.x - config.x) * RECOVERY_PULL
    const midY = config.y + (CORRECT_POS.y - config.y) * RECOVERY_PULL
    const positions = scatterPositions(group.length, midX, midY)
    for (let i = 0; i < group.length; i++) {
      const s = group[i]
      dots.push({
        studentId: s.studentId,
        x: positions[i].x,
        y: positions[i].y,
        originX: config.x,
        originY: config.y,
        color: config.color,
        size: DOT_SIZES[s.confidence] || 11,
        opacity: DOT_OPACITIES[s.confidence] || 0.8,
        pattern: s.pattern,
        confidence: s.confidence,
        recovered: true,
        isLive: !isSeedStudent(s.studentId),
      })
    }
  }

  dots.sort((a, b) => a.x - b.x)
  return dots
}

/* ── Format Helpers ── */

function fmtStudentName(id: string): string {
  if (isSeedStudent(id)) {
    return `Student ${id.replace('demo_student_', '')}`
  }
  return id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' ')
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(0)}%`
}

function fmtSlider(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function fmtFilter(f: string): string {
  return f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const ALL_SLIDERS = ['prevalence', 'sensitivity', 'specificity']
const KEY_FILTERS = ['condition', 'positive_only']

/* ── Main Page ── */

export default function TeacherPage() {
  const [data, setData] = useState<TeacherData | null>(null)
  const [error, setError] = useState(false)
  const [activeCluster, setActiveCluster] = useState<string | null>(null)
  const [activeStudent, setActiveStudent] = useState<string | null>(null)
  const [pushedPatterns, setPushedPatterns] = useState<Record<string, boolean>>({})
  const [loaded, setLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const prevStudentIdsRef = useRef<Set<string>>(new Set())
  const [newStudentIds, setNewStudentIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/teacher/bayes_medical_test_v1')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((d: TeacherData) => {
        setData(d)
        const ids = new Set(d.students.map(s => s.studentId))
        prevStudentIdsRef.current = ids
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setLoaded(true))
        })
      })
      .catch(() => setError(true))
  }, [])

  const dots = useMemo(() => (data ? computeDots(data.students) : []), [data])

  const handleClusterClick = useCallback((pattern: string) => {
    setActiveStudent(null)
    setActiveCluster(prev => (prev === pattern ? null : pattern))
  }, [])

  const handleDotClick = useCallback((studentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveCluster(null)
    setActiveStudent(prev => (prev === studentId ? null : studentId))
  }, [])

  const handleBgClick = useCallback(() => {
    setActiveCluster(null)
    setActiveStudent(null)
  }, [])

  const handlePush = useCallback(async (pattern: string) => {
    if (!data) return
    const students = data.students.filter(s => s.pattern === pattern)
    const intervention = data.interventions[pattern]
    if (!intervention) return

    await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId: 'bayes_medical_test_v1',
        pattern,
        recommendation: intervention.recommendation,
        studentIds: students.map(s => s.studentId),
      }),
    })

    setPushedPatterns(prev => ({ ...prev, [pattern]: true }))
  }, [data])

  const refreshData = useCallback(() => {
    setRefreshing(true)
    setActiveCluster(null)
    setActiveStudent(null)
    fetch('/api/teacher/bayes_medical_test_v1')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((d: TeacherData) => {
        const currentIds = new Set(d.students.map(s => s.studentId))
        const arrivals = new Set<string>()
        for (const id of currentIds) {
          if (!prevStudentIdsRef.current.has(id)) arrivals.add(id)
        }
        const movedIds = new Set<string>()
        if (data) {
          const prevPatterns = new Map(data.students.map(s => [s.studentId, s.pattern]))
          for (const s of d.students) {
            const prev = prevPatterns.get(s.studentId)
            if (prev && prev !== s.pattern) movedIds.add(s.studentId)
          }
        }
        prevStudentIdsRef.current = currentIds
        setNewStudentIds(new Set([...arrivals, ...movedIds]))
        setData(d)
        setRefreshing(false)
        if (arrivals.size > 0 || movedIds.size > 0) {
          setTimeout(() => setNewStudentIds(new Set()), 3000)
        }
      })
      .catch(() => setRefreshing(false))
  }, [data])

  if (error) {
    return (
      <main className="tl">
        <div className="tl-loading">
          Failed to load data. Start the dev server and try again.
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="tl">
        <div className="tl-loading">Loading reasoning landscape…</div>
      </main>
    )
  }

  const clusterStudents = activeCluster
    ? data.students.filter(s => s.pattern === activeCluster)
    : []

  const selectedStudent = activeStudent
    ? data.students.find(s => s.studentId === activeStudent) ?? null
    : null

  const selectedDot = activeStudent
    ? dots.find(d => d.studentId === activeStudent) ?? null
    : null

  return (
    <main className="tl" onClick={handleBgClick}>
      {/* Recovery path lines */}
      <svg
        className="tl-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {loaded && dots.filter(d => d.recovered).map(d => (
          <line
            key={d.studentId}
            x1={d.originX} y1={d.originY}
            x2={CORRECT_POS.x} y2={CORRECT_POS.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.15"
            strokeDasharray="0.6 0.8"
          />
        ))}
      </svg>

      {/* Cluster glow regions */}
      {Object.entries(PATTERN_CONFIG).map(([pattern, cfg]) => {
        const count = data.aggregation.patternCounts[pattern] || 0
        if (count === 0) return null
        const glowSize = 180 + count * 30
        return (
          <div
            key={`glow-${pattern}`}
            className={`tl-glow ${activeCluster && activeCluster !== pattern ? 'dimmed' : ''}`}
            style={{
              left: `${cfg.x}%`,
              top: `${cfg.y}%`,
              width: `${glowSize}px`,
              height: `${glowSize}px`,
              background: `radial-gradient(ellipse, ${cfg.color}10 0%, ${cfg.color}06 40%, transparent 70%)`,
            }}
          />
        )
      })}

      {/* Cluster labels */}
      {Object.entries(PATTERN_CONFIG).map(([pattern, cfg]) => {
        const count = data.aggregation.patternCounts[pattern] || 0
        if (count === 0) return null
        const recoveryCount = data.aggregation.recoveryCounts[pattern] || 0
        return (
          <button
            key={`label-${pattern}`}
            className={`tl-cluster-label ${activeCluster === pattern ? 'active' : ''} ${activeCluster && activeCluster !== pattern ? 'dimmed' : ''}`}
            style={{
              left: `${cfg.x}%`,
              top: `${cfg.y + 9}%`,
              color: cfg.color,
            }}
            onClick={e => {
              e.stopPropagation()
              handleClusterClick(pattern)
            }}
          >
            <span className="tl-cluster-name">{cfg.label}</span>
            <span className="tl-cluster-count">{count}</span>
            {recoveryCount > 0 && (
              <span className="tl-cluster-recovery">{recoveryCount} recovered</span>
            )}
          </button>
        )
      })}

      {/* Student dots */}
      {dots.map((d, i) => {
        const isDimmed = activeCluster
          ? d.pattern !== activeCluster
          : activeStudent
            ? d.studentId !== activeStudent
            : false
        const isNew = newStudentIds.has(d.studentId)
        return (
          <button
            key={d.studentId}
            className={`tl-dot ${isDimmed ? 'dimmed' : ''} ${d.recovered ? 'recovered' : ''} ${activeStudent === d.studentId ? 'selected' : ''} ${d.isLive ? 'live' : ''} ${isNew ? 'arriving' : ''}`}
            style={{
              left: loaded ? `${d.x}%` : '50%',
              top: loaded ? `${d.y}%` : '50%',
              width: `${d.size}px`,
              height: `${d.size}px`,
              backgroundColor: d.color,
              color: d.color,
              opacity: loaded ? (isDimmed ? 0.15 : d.opacity) : 0,
              transitionDelay: loaded ? '0ms' : `${i * 25}ms`,
            }}
            onClick={e => handleDotClick(d.studentId, e)}
            aria-label={fmtStudentName(d.studentId)}
          />
        )
      })}

      {/* Header */}
      <header className="tl-header">
        <h1 className="tl-title">Reasoning Landscape</h1>
        <p className="tl-subtitle">
          {data.aggregation.totalStudents} students · Bayesian Medical Test
        </p>
        <button
          className={`tl-refresh ${refreshing ? 'spinning' : ''}`}
          onClick={e => { e.stopPropagation(); refreshData() }}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {/* Legend */}
      <div className="tl-legend">
        <div className="tl-legend-row">
          <span className="tl-legend-dot" style={{ width: 14, height: 14 }} />
          <span>Strong</span>
        </div>
        <div className="tl-legend-row">
          <span className="tl-legend-dot" style={{ width: 11, height: 11 }} />
          <span>Moderate</span>
        </div>
        <div className="tl-legend-row">
          <span className="tl-legend-dot" style={{ width: 8, height: 8 }} />
          <span>Weak</span>
        </div>
        <div className="tl-legend-row tl-legend-live">
          <span className="tl-legend-dot live-indicator" style={{ width: 10, height: 10 }} />
          <span>Live</span>
        </div>
      </div>

      {/* Detail Panel */}
      <aside
        className={`tl-panel ${activeCluster ? 'open' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {activeCluster && (
          <DetailPanel
            pattern={activeCluster}
            config={PATTERN_CONFIG[activeCluster]}
            students={clusterStudents}
            intervention={data.interventions[activeCluster]}
            pushed={!!pushedPatterns[activeCluster]}
            onPush={() => handlePush(activeCluster)}
            onClose={() => setActiveCluster(null)}
          />
        )}
      </aside>

      {/* Student Card */}
      {selectedStudent && selectedDot && (
        <div
          className="tl-student-card"
          style={{
            left: `${selectedDot.x}%`,
            top: `${selectedDot.y}%`,
            transform: selectedDot.x > 60
              ? 'translate(calc(-100% - 16px), -50%)'
              : 'translate(16px, -50%)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <StudentCard student={selectedStudent} />
        </div>
      )}
    </main>
  )
}

/* ── Detail Panel ── */

function DetailPanel({
  pattern,
  config,
  students,
  intervention,
  pushed,
  onPush,
  onClose,
}: {
  pattern: string
  config: PatternConfig
  students: StudentData[]
  intervention: Intervention
  pushed: boolean
  onPush: () => void
  onClose: () => void
}) {
  const recoveredCount = students.filter(s => s.recovered).length
  const strongCount = students.filter(s => s.confidence === 'strong').length
  const modCount = students.filter(s => s.confidence === 'moderate').length

  const confParts: string[] = []
  if (strongCount) confParts.push(`${strongCount} strong`)
  if (modCount) confParts.push(`${modCount} moderate`)
  const weakCount = students.length - strongCount - modCount
  if (weakCount) confParts.push(`${weakCount} weak`)

  const evidenceSet = new Set<string>()
  for (const s of students) {
    for (const ev of s.evidence) {
      if (ev.supports_pattern === pattern) {
        evidenceSet.add(ev.observed)
      }
    }
  }

  return (
    <div className="tl-panel-inner">
      <button className="tl-panel-close" onClick={onClose} aria-label="Close">
        ×
      </button>

      <div className="tl-panel-header" style={{ color: config.color }}>
        <h2 className="tl-panel-title">{config.label}</h2>
        <p className="tl-panel-stats">
          {students.length} student{students.length !== 1 ? 's' : ''}
          {confParts.length > 0 && <span className="tl-panel-conf"> · {confParts.join(', ')}</span>}
        </p>
      </div>

      <p className="tl-panel-desc">{config.description}</p>

      {evidenceSet.size > 0 && (
        <section className="tl-panel-section">
          <h3 className="tl-panel-section-title">Why this pattern</h3>
          <ul className="tl-panel-evidence">
            {Array.from(evidenceSet).slice(0, 5).map((ev, i) => (
              <li key={i}>{ev}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="tl-panel-section">
        <h3 className="tl-panel-section-title">Students</h3>
        <div className="tl-panel-students">
          {students.map(s => (
            <div key={s.studentId} className="tl-panel-student-row">
              <span
                className="tl-panel-student-pip"
                style={{
                  backgroundColor: config.color,
                  width: DOT_SIZES[s.confidence],
                  height: DOT_SIZES[s.confidence],
                  opacity: DOT_OPACITIES[s.confidence],
                }}
              />
              <span className="tl-panel-student-name">
                {fmtStudentName(s.studentId)}
                {!isSeedStudent(s.studentId) && (
                  <span className="tl-panel-live-tag">LIVE</span>
                )}
              </span>
              <span className="tl-panel-student-pred">
                pred {fmtPct(s.prediction)}
              </span>
              {s.recovered && (
                <span className="tl-panel-student-badge">recovered</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {recoveredCount > 0 && (
        <div className="tl-panel-recovery-note">
          {recoveredCount} student{recoveredCount !== 1 ? 's' : ''} showed this
          pattern initially but demonstrated correct understanding after guided
          observation.
        </div>
      )}

      <section className="tl-panel-section tl-panel-intervention">
        <h3 className="tl-panel-section-title">Recommended next step</h3>
        <p className="tl-panel-intervention-text">
          {intervention.recommendation}
        </p>
        {pushed ? (
          <div className="tl-panel-pushed">
            <span className="tl-pushed-check">&#10003;</span>
            Follow-up sent to {students.length} student{students.length !== 1 ? 's' : ''}
          </div>
        ) : (
          <button className="tl-panel-push-btn" onClick={onPush}>
            Send to {students.length} student{students.length !== 1 ? 's' : ''}
          </button>
        )}
      </section>
    </div>
  )
}

/* ── Student Card ── */

function StudentCard({ student }: { student: StudentData }) {
  const config = PATTERN_CONFIG[student.pattern]
  const isLive = !isSeedStudent(student.studentId)
  const missedSliders = ALL_SLIDERS.filter(
    s => !student.slidersExplored.includes(s),
  )
  const missedFilters = KEY_FILTERS.filter(
    f => !student.filtersViewed.includes(f),
  )

  return (
    <>
      <div className="tl-card-header" style={{ color: config?.color }}>
        <strong>
          {fmtStudentName(student.studentId)}
          {isLive && <span className="tl-card-live-badge">LIVE</span>}
        </strong>
        <span className="tl-card-pattern">
          {config?.label} · {student.confidence}
        </span>
      </div>

      <div className="tl-card-comparison">
        <div className="tl-card-stat">
          <span className="tl-card-stat-label">Predicted</span>
          <span className="tl-card-stat-value">{fmtPct(student.prediction)}</span>
        </div>
        <span className="tl-card-arrow">&rarr;</span>
        <div className="tl-card-stat">
          <span className="tl-card-stat-label">Actual</span>
          <span className="tl-card-stat-value">{fmtPct(student.posterior)}</span>
        </div>
      </div>

      <div className="tl-card-section">
        {student.slidersExplored.length > 0 ? (
          <p>
            <span className="tl-card-dim">Explored:</span>{' '}
            {student.slidersExplored.map(fmtSlider).join(', ')}
          </p>
        ) : (
          <p className="tl-card-dim">No slider exploration</p>
        )}
        {student.filtersViewed.length > 0 ? (
          <p>
            <span className="tl-card-dim">Viewed:</span>{' '}
            {student.filtersViewed.map(fmtFilter).join(', ')}
          </p>
        ) : (
          <p className="tl-card-dim">No filter views</p>
        )}
        {missedSliders.length > 0 && (
          <p className="tl-card-missed">
            Missed: {missedSliders.map(fmtSlider).join(', ')}
          </p>
        )}
        {missedFilters.length > 0 && (
          <p className="tl-card-missed">
            Did not view: {missedFilters.map(fmtFilter).join(', ')}
          </p>
        )}
      </div>

      <div className="tl-card-section tl-card-expl">
        Explanations: {student.explanationCorrect}/{student.explanationTotal} correct
      </div>

      {student.recovered && (
        <div className="tl-card-recovered">
          &#8635; Recovered after guided observation
        </div>
      )}
    </>
  )
}
