'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PhaseNav from '@/components/PhaseNav'
import LinalgSidebar from '@/components/LinalgSidebar'
import Tex from '@/components/Math'

/* ── Types ── */
interface Mat2 { a: number; b: number; c: number; d: number }
interface Vec2 { x: number; y: number }

/* ── Math ── */
function txVec(m: Mat2, v: Vec2): Vec2 {
  return { x: m.a * v.x + m.b * v.y, y: m.c * v.x + m.d * v.y }
}
function det(m: Mat2): number { return m.a * m.d - m.b * m.c }
function lerpMat(a: Mat2, b: Mat2, t: number): Mat2 {
  return { a: a.a + (b.a - a.a) * t, b: a.b + (b.b - a.b) * t, c: a.c + (b.c - a.c) * t, d: a.d + (b.d - a.d) * t }
}
const IDENTITY: Mat2 = { a: 1, b: 0, c: 0, d: 1 }

const PRESETS: { key: string; label: string; matrix: Mat2 }[] = [
  { key: 'identity', label: 'Identity', matrix: { a: 1, b: 0, c: 0, d: 1 } },
  { key: 'rotate90', label: 'Rotate 90°', matrix: { a: 0, b: -1, c: 1, d: 0 } },
  { key: 'rotate45', label: 'Rotate 45°', matrix: { a: 0.707, b: -0.707, c: 0.707, d: 0.707 } },
  { key: 'shear', label: 'Shear', matrix: { a: 1, b: 1, c: 0, d: 1 } },
  { key: 'stretchX', label: 'Stretch X', matrix: { a: 2, b: 0, c: 0, d: 1 } },
  { key: 'stretchY', label: 'Stretch Y', matrix: { a: 1, b: 0, c: 0, d: 2 } },
  { key: 'reflectX', label: 'Reflect X', matrix: { a: 1, b: 0, c: 0, d: -1 } },
  { key: 'reflectY', label: 'Reflect Y', matrix: { a: -1, b: 0, c: 0, d: 1 } },
  { key: 'collapse', label: 'Collapse', matrix: { a: 1, b: 2, c: 0.5, d: 1 } },
]

const GRID_RANGE = 4
const EXAMPLE_V: Vec2 = { x: 1, y: 1 }

const COL = {
  e1: '#E05A47', e2: '#4A90D9', ae1: '#E8845A', ae2: '#6AADE4',
  v: 'rgba(232,226,214,0.55)', av: '#E8C35A',
  gridOrig: 'rgba(212,168,71,0.04)', gridTx: 'rgba(212,168,71,0.14)',
  gridTxStrong: 'rgba(212,168,71,0.28)', axis: 'rgba(176,141,87,0.1)',
  paraPos: 'rgba(212,168,71,0.12)', paraNeg: 'rgba(74,144,217,0.1)',
  paraStrokePos: 'rgba(212,168,71,0.4)', paraStrokeNeg: 'rgba(74,144,217,0.35)',
}

type ToggleKey = 'origGrid' | 'txGrid' | 'basis' | 'unitSquare' | 'sampleVec' | 'area'
const TOGGLE_LABELS: { key: ToggleKey; label: string }[] = [
  { key: 'origGrid', label: 'ORIGINAL' },
  { key: 'txGrid', label: 'TRANSFORMED' },
  { key: 'basis', label: 'BASIS' },
  { key: 'unitSquare', label: 'UNIT SQ' },
  { key: 'sampleVec', label: 'VECTOR' },
  { key: 'area', label: 'AREA' },
]

function getInsight(m: Mat2): string {
  const d = det(m)
  const absD = Math.abs(d)
  if (absD < 0.05) return 'The unit square collapses — space loses a dimension.'
  if (Math.abs(d - 1) < 0.05 && d > 0) return 'Area is preserved. This is a rigid transformation.'
  if (d < -0.05) return `Orientation is reversed. Area scales by ${absD.toFixed(2)}×.`
  if (Math.abs(m.a - m.d) < 0.05 && Math.abs(m.b + m.c) < 0.05 && m.b !== 0) return 'This is a rotation — angles and distances are preserved.'
  if (m.b === 0 && m.c === 0) return `Independent scaling: ${m.a.toFixed(1)}× horizontal, ${m.d.toFixed(1)}× vertical.`
  return `The matrix reshapes space. Area scales by ${absD.toFixed(2)}×.`
}

/* ── Arrow ── */
function Arrow({ from, to, color, width, glow }: { from: [number, number]; to: [number, number]; color: string; width: number; glow?: boolean }) {
  const dx = to[0] - from[0]; const dy = to[1] - from[1]
  const len = Math.sqrt(dx * dx + dy * dy); if (len < 2) return null
  const ux = dx / len; const uy = dy / len; const s = 7
  return (
    <g>
      {glow && <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={color} strokeWidth={width + 6} strokeLinecap="round" opacity={0.15} />}
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon
        points={`${to[0]},${to[1]} ${to[0] - ux * s - uy * s * 0.4},${to[1] - uy * s + ux * s * 0.4} ${to[0] - ux * s + uy * s * 0.4},${to[1] - uy * s - ux * s * 0.4}`}
        fill={color} />
    </g>
  )
}

/* ── SVG Visualization ── */
function TransformViz({
  matrix, tParam, toggles, hovered, dragging, onDragStart, onDragMove, onDragEnd
}: {
  matrix: Mat2; tParam: number
  toggles: Record<ToggleKey, boolean>
  hovered: string | null
  dragging: string | null
  onDragStart: (target: string) => void
  onDragMove: (e: React.PointerEvent<SVGSVGElement>) => void
  onDragEnd: () => void
}) {
  const viewSize = 500
  const scale = viewSize / (GRID_RANGE * 2 + 2)
  const cx = viewSize / 2
  const cy = viewSize / 2

  const m = lerpMat(IDENTITY, matrix, tParam)

  const toSVG = (v: Vec2): [number, number] => [cx + v.x * scale, cy - v.y * scale]
  const txToSVG = (v: Vec2): [number, number] => {
    const tv = txVec(m, v)
    return [cx + tv.x * scale, cy - tv.y * scale]
  }

  const gridLines: React.ReactNode[] = []
  for (let i = -GRID_RANGE; i <= GRID_RANGE; i++) {
    const [x1, y1] = toSVG({ x: i, y: -GRID_RANGE })
    const [x2, y2] = toSVG({ x: i, y: GRID_RANGE })
    gridLines.push(<line key={`ov${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={COL.gridOrig} strokeWidth={1} />)
    const [hx1, hy1] = toSVG({ x: -GRID_RANGE, y: i })
    const [hx2, hy2] = toSVG({ x: GRID_RANGE, y: i })
    gridLines.push(<line key={`oh${i}`} x1={hx1} y1={hy1} x2={hx2} y2={hy2} stroke={COL.gridOrig} strokeWidth={1} />)
  }

  const txGridLines: React.ReactNode[] = []
  for (let i = -GRID_RANGE; i <= GRID_RANGE; i++) {
    const isAxis = i === 0
    const [x1, y1] = txToSVG({ x: i, y: -GRID_RANGE })
    const [x2, y2] = txToSVG({ x: i, y: GRID_RANGE })
    txGridLines.push(<line key={`tv${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={isAxis ? COL.gridTxStrong : COL.gridTx} strokeWidth={isAxis ? 1.5 : 0.8} />)
    const [hx1, hy1] = txToSVG({ x: -GRID_RANGE, y: i })
    const [hx2, hy2] = txToSVG({ x: GRID_RANGE, y: i })
    txGridLines.push(<line key={`th${i}`} x1={hx1} y1={hy1} x2={hx2} y2={hy2}
      stroke={isAxis ? COL.gridTxStrong : COL.gridTx} strokeWidth={isAxis ? 1.5 : 0.8} />)
  }

  const d = det(m)
  const [o0x, o0y] = toSVG({ x: 0, y: 0 })
  const [o1x, o1y] = toSVG({ x: 1, y: 0 })
  const [o2x, o2y] = toSVG({ x: 1, y: 1 })
  const [o3x, o3y] = toSVG({ x: 0, y: 1 })
  const [t0x, t0y] = txToSVG({ x: 0, y: 0 })
  const [t1x, t1y] = txToSVG({ x: 1, y: 0 })
  const [t2x, t2y] = txToSVG({ x: 1, y: 1 })
  const [t3x, t3y] = txToSVG({ x: 0, y: 1 })

  const ae1 = txVec(m, { x: 1, y: 0 })
  const ae2 = txVec(m, { x: 0, y: 1 })
  const av = txVec(m, EXAMPLE_V)

  const highlightE1 = hovered === 'e1'
  const highlightE2 = hovered === 'e2'
  const highlightSquare = hovered === 'square'

  return (
    <svg viewBox={`0 0 ${viewSize} ${viewSize}`} className="la-svg"
      style={{ cursor: dragging ? 'grabbing' : 'default' }}
      onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerLeave={onDragEnd}>
      <defs>
        <radialGradient id="ambientGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(212,168,71,0.05)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <rect width={viewSize} height={viewSize} fill="url(#ambientGlow)" />

      {/* Original grid */}
      {toggles.origGrid && <g>{gridLines}</g>}

      {/* Axes */}
      <line x1={toSVG({ x: -GRID_RANGE, y: 0 })[0]} y1={cy} x2={toSVG({ x: GRID_RANGE, y: 0 })[0]} y2={cy} stroke={COL.axis} strokeWidth={1.5} />
      <line x1={cx} y1={toSVG({ x: 0, y: -GRID_RANGE })[1]} x2={cx} y2={toSVG({ x: 0, y: GRID_RANGE })[1]} stroke={COL.axis} strokeWidth={1.5} />

      {/* Transformed grid */}
      {toggles.txGrid && <g>{txGridLines}</g>}

      {/* Original unit square */}
      {toggles.unitSquare && (
        <polygon points={`${o0x},${o0y} ${o1x},${o1y} ${o2x},${o2y} ${o3x},${o3y}`}
          fill="rgba(212,168,71,0.02)" stroke={highlightSquare ? 'rgba(212,168,71,0.25)' : 'rgba(176,141,87,0.08)'} strokeWidth={1} />
      )}

      {/* Transformed parallelogram */}
      {toggles.area && (
        <polygon points={`${t0x},${t0y} ${t1x},${t1y} ${t2x},${t2y} ${t3x},${t3y}`}
          fill={highlightSquare ? (d < 0 ? 'rgba(74,144,217,0.2)' : 'rgba(196,154,60,0.2)') : (d < 0 ? COL.paraNeg : COL.paraPos)}
          stroke={d < 0 ? COL.paraStrokeNeg : COL.paraStrokePos} strokeWidth={highlightSquare ? 2 : 1.5} />
      )}

      {/* Area label */}
      {toggles.area && Math.abs(d) > 0.05 && (
        <text x={(t0x + t2x) / 2} y={(t0y + t2y) / 2}
          fill={d < 0 ? 'rgba(74,144,217,0.5)' : 'rgba(196,154,60,0.5)'}
          fontSize={13} fontWeight={700} fontFamily='"Playfair Display", Georgia, serif'
          textAnchor="middle" dominantBaseline="middle">
          {Math.abs(d).toFixed(2)}
        </text>
      )}

      {/* Original basis vectors */}
      {toggles.basis && (
        <>
          <Arrow from={[cx, cy]} to={toSVG({ x: 1, y: 0 })} color={highlightE1 ? '#ff7a6a' : COL.e1} width={highlightE1 ? 3 : 2} glow={highlightE1} />
          <Arrow from={[cx, cy]} to={toSVG({ x: 0, y: 1 })} color={highlightE2 ? '#7ac0ff' : COL.e2} width={highlightE2 ? 3 : 2} glow={highlightE2} />

          {/* Labels for original basis */}
          <text x={toSVG({ x: 1, y: 0 })[0] + 5} y={toSVG({ x: 1, y: 0 })[1] + 14}
            fill={COL.e1} fontSize={11} fontWeight={600} fontFamily="Inter, system-ui, sans-serif" opacity={0.9}>e₁</text>
          <text x={toSVG({ x: 0, y: 1 })[0] - 18} y={toSVG({ x: 0, y: 1 })[1] - 6}
            fill={COL.e2} fontSize={11} fontWeight={600} fontFamily="Inter, system-ui, sans-serif" opacity={0.9}>e₂</text>
        </>
      )}

      {/* Sample vector */}
      {toggles.sampleVec && (
        <>
          <Arrow from={[cx, cy]} to={toSVG(EXAMPLE_V)} color={COL.v} width={1.5} />
          <text x={toSVG(EXAMPLE_V)[0] + 6} y={toSVG(EXAMPLE_V)[1] - 6}
            fill={COL.v} fontSize={11} fontWeight={600} fontFamily="Inter, system-ui, sans-serif" opacity={0.9}>v</text>
        </>
      )}

      {/* Transformed vectors */}
      {toggles.basis && (
        <>
          <Arrow from={[cx, cy]} to={txToSVG({ x: 1, y: 0 })} color={highlightE1 ? '#ffaa80' : COL.ae1} width={highlightE1 ? 3.5 : 2.5} glow={highlightE1} />
          <Arrow from={[cx, cy]} to={txToSVG({ x: 0, y: 1 })} color={highlightE2 ? '#90c8ff' : COL.ae2} width={highlightE2 ? 3.5 : 2.5} glow={highlightE2} />

          {/* Draggable handle: Ae₁ */}
          <circle cx={txToSVG({ x: 1, y: 0 })[0]} cy={txToSVG({ x: 1, y: 0 })[1]} r={9}
            fill={COL.ae1} fillOpacity={0.18} stroke={COL.ae1} strokeWidth={1.5}
            cursor="grab" onPointerDown={() => onDragStart('ae1')} />
          <text x={txToSVG({ x: 1, y: 0 })[0] + 10} y={txToSVG({ x: 1, y: 0 })[1] + 14}
            fill={COL.ae1} fontSize={10} fontWeight={600} fontFamily="Inter, system-ui, sans-serif">
            Ae₁ ({ae1.x.toFixed(1)}, {ae1.y.toFixed(1)})
          </text>

          {/* Draggable handle: Ae₂ */}
          <circle cx={txToSVG({ x: 0, y: 1 })[0]} cy={txToSVG({ x: 0, y: 1 })[1]} r={9}
            fill={COL.ae2} fillOpacity={0.18} stroke={COL.ae2} strokeWidth={1.5}
            cursor="grab" onPointerDown={() => onDragStart('ae2')} />
          <text x={txToSVG({ x: 0, y: 1 })[0] - 14} y={txToSVG({ x: 0, y: 1 })[1] - 12}
            fill={COL.ae2} fontSize={10} fontWeight={600} fontFamily="Inter, system-ui, sans-serif">
            Ae₂ ({ae2.x.toFixed(1)}, {ae2.y.toFixed(1)})
          </text>
        </>
      )}

      {/* Transformed sample vector */}
      {toggles.sampleVec && (
        <>
          <Arrow from={[cx, cy]} to={txToSVG(EXAMPLE_V)} color={COL.av} width={2.5} />
          <text x={txToSVG(EXAMPLE_V)[0] + 8} y={txToSVG(EXAMPLE_V)[1] - 8}
            fill={COL.av} fontSize={10} fontWeight={600} fontFamily="Inter, system-ui, sans-serif">
            Av ({av.x.toFixed(1)}, {av.y.toFixed(1)})
          </text>
        </>
      )}
    </svg>
  )
}

/* ── Main Page ── */

export default function LinalgPage() {
  const [matrix, setMatrix] = useState<Mat2>({ a: 1.2, b: 0.8, c: -0.6, d: 1.4 })
  const [tParam, setTParam] = useState(1)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    origGrid: true, txGrid: true, basis: true, unitSquare: true, sampleVec: true, area: true,
  })
  const svgRef = useRef<HTMLDivElement>(null)

  const toggle = useCallback((key: ToggleKey) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const setField = useCallback((field: keyof Mat2, val: number) => {
    setMatrix(prev => ({ ...prev, [field]: val }))
    setActivePreset(null)
    setTParam(1)
  }, [])

  const applyPreset = useCallback((key: string, m: Mat2) => {
    setMatrix(m)
    setActivePreset(key)
    setTParam(1)
  }, [])

  const handleDragStart = useCallback((target: string) => {
    setDragging(target)
    setTParam(1)
    setActivePreset(null)
  }, [])

  const handleDragMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const viewSize = 500
    const scale = viewSize / (GRID_RANGE * 2 + 2)
    const cx = viewSize / 2; const cy = viewSize / 2
    const mx = ((e.clientX - rect.left) / rect.width) * viewSize
    const my = ((e.clientY - rect.top) / rect.height) * viewSize
    const worldX = (mx - cx) / scale
    const worldY = -(my - cy) / scale

    if (dragging === 'ae1') {
      setMatrix(prev => ({ ...prev, a: worldX, c: worldY }))
    } else if (dragging === 'ae2') {
      setMatrix(prev => ({ ...prev, b: worldX, d: worldY }))
    }
  }, [dragging])

  const handleDragEnd = useCallback(() => { setDragging(null) }, [])

  const d = det(matrix)
  const insight = useMemo(() => getInsight(matrix), [matrix])

  return (
    <div className="scene">
      <PhaseNav />
      <LinalgSidebar />

      <main className="stage" style={{ gridColumn: 2, gridRow: 2 }}>
        <div className="stage-top">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="breadcrumb">Matrix Transformation Explorer</div>
              <h1 className="big-question">What does a matrix<br />do to <span className="hl">space</span>?</h1>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 24, paddingTop: 4 }}>
              <Tex tex={`A = \\begin{bmatrix} ${matrix.a.toFixed(1)} & ${matrix.b.toFixed(1)} \\\\ ${matrix.c.toFixed(1)} & ${matrix.d.toFixed(1)} \\end{bmatrix}`}
                display style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }} />
            </div>
          </div>
        </div>

        <div className="la-center">
          {/* Left controls */}
          <div className="la-controls">
            <div className="la-matrix-display">
              <div className="la-matrix-bracket-large">
                <div className="la-bracket-visual">
                  <div className="la-bracket-left" />
                  <div className="la-matrix-grid">
                    <MatrixCell label="a" value={matrix.a} color={COL.ae1} onChange={v => setField('a', v)}
                      onHover={() => setHovered('e1')} onLeave={() => setHovered(null)} />
                    <MatrixCell label="b" value={matrix.b} color={COL.ae2} onChange={v => setField('b', v)}
                      onHover={() => setHovered('e2')} onLeave={() => setHovered(null)} />
                    <MatrixCell label="c" value={matrix.c} color={COL.ae1} onChange={v => setField('c', v)}
                      onHover={() => setHovered('e1')} onLeave={() => setHovered(null)} />
                    <MatrixCell label="d" value={matrix.d} color={COL.ae2} onChange={v => setField('d', v)}
                      onHover={() => setHovered('e2')} onLeave={() => setHovered(null)} />
                  </div>
                  <div className="la-bracket-right" />
                </div>
              </div>
            </div>

            <div className="la-det-block">
              <div className="la-det-row">
                <Tex tex="\det(A)" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }} />
                <span className="la-det-eq">=</span>
                <motion.span key={d.toFixed(2)} className={`la-det-value ${d < 0 ? 'negative' : ''} ${Math.abs(d) < 0.05 ? 'singular' : ''}`}
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  {d.toFixed(2)}
                </motion.span>
              </div>
              <div className="la-area-row">
                <Tex tex={`|\\det(A)| = ${Math.abs(d).toFixed(2)}`} style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }} />
              </div>
            </div>

            {/* Interpolation */}
            <div className="la-t-control">
              <div className="la-t-endpoints">
                <Tex tex="I" style={{ fontSize: '0.9rem', fontWeight: 700 }} />
                <div className="la-t-track">
                  <input type="range" className="la-matrix-slider" min={0} max={1} step={0.01} value={tParam}
                    onChange={e => setTParam(parseFloat(e.target.value))} />
                </div>
                <Tex tex="A" style={{ fontSize: '0.9rem', fontWeight: 700 }} />
              </div>
              <div style={{ textAlign: 'center', fontSize: 7, color: 'var(--text-dim)', letterSpacing: '0.08em', marginTop: 2 }}>
                INTERPOLATION · t = {tParam.toFixed(2)}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={insight} className="la-insight"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}>
                {insight}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Visualization */}
          <div className="la-canvas-wrap" ref={svgRef}>
            <TransformViz matrix={matrix} tParam={tParam} toggles={toggles} hovered={hovered}
              dragging={dragging} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd} />
          </div>

          {/* Right summary */}
          <div className="la-summary">
            <div className="la-summary-section" onMouseEnter={() => setHovered('e1')} onMouseLeave={() => setHovered(null)}>
              <div className="la-summary-title">
                <Tex tex="Ae_1" style={{ color: COL.ae1, fontSize: '0.8rem' }} />
              </div>
              <div className="la-summary-row"><span className="la-summary-dot" style={{ background: COL.ae1 }} />({matrix.a.toFixed(1)}, {matrix.c.toFixed(1)})</div>
            </div>
            <div className="la-summary-section" onMouseEnter={() => setHovered('e2')} onMouseLeave={() => setHovered(null)}>
              <div className="la-summary-title">
                <Tex tex="Ae_2" style={{ color: COL.ae2, fontSize: '0.8rem' }} />
              </div>
              <div className="la-summary-row"><span className="la-summary-dot" style={{ background: COL.ae2 }} />({matrix.b.toFixed(1)}, {matrix.d.toFixed(1)})</div>
            </div>
            <div className="la-summary-section" onMouseEnter={() => setHovered('square')} onMouseLeave={() => setHovered(null)}>
              <div className="la-summary-title">Unit square</div>
              <div className="la-summary-area">
                <span>Area 1</span><span className="la-summary-arrow">→</span>
                <span className="la-summary-area-val" style={{ color: d < 0 ? '#4A90D9' : 'var(--gold)' }}>Area {Math.abs(d).toFixed(2)}</span>
              </div>
              {d < -0.01 && <div style={{ fontSize: '0.68rem', color: '#4A90D9', marginTop: 4 }}>↻ Orientation flipped</div>}
              {Math.abs(d) < 0.05 && <div style={{ fontSize: '0.68rem', color: 'var(--gold)', marginTop: 4 }}>Singular — collapsed</div>}
            </div>
            <div className="la-summary-section">
              <div className="la-summary-title">
                <Tex tex="Av" style={{ color: COL.av, fontSize: '0.8rem' }} />
              </div>
              <div className="la-summary-row"><span className="la-summary-dot" style={{ background: COL.av }} />v(1,1) → ({(matrix.a + matrix.b).toFixed(1)}, {(matrix.c + matrix.d).toFixed(1)})</div>
            </div>
          </div>
        </div>

        {/* Toggle strip + Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '2px 0' }}>
          <div className="la-toggle-strip">
            {TOGGLE_LABELS.map(t => (
              <button key={t.key} className={`la-toggle-btn ${toggles[t.key] ? 'on' : ''}`}
                onClick={() => toggle(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="la-presets" style={{ flex: 1 }}>
            {PRESETS.map(p => (
              <button key={p.key}
                className={`la-preset-btn ${activePreset === p.key ? 'active' : ''}`}
                onClick={() => applyPreset(p.key, p.matrix)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

/* ── Matrix Cell ── */
function MatrixCell({ label, value, color, onChange, onHover, onLeave }: {
  label: string; value: number; color: string; onChange: (v: number) => void
  onHover: () => void; onLeave: () => void
}) {
  return (
    <div className="la-matrix-cell" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <div className="la-matrix-cell-label" style={{ color }}>{label}</div>
      <input type="range" className="la-matrix-slider" min={-3} max={3} step={0.1} value={value}
        onChange={e => onChange(parseFloat(e.target.value))} />
      <div className="la-matrix-cell-value">{value.toFixed(1)}</div>
    </div>
  )
}
