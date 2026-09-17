'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PhaseNav from '@/components/PhaseNav'
import LinalgSidebar from '@/components/LinalgSidebar'
import Tex from '@/components/Math'

interface Vec2 { x: number; y: number }
interface Mat2 { a: number; b: number; c: number; d: number }

function txVec(m: Mat2, v: Vec2): Vec2 { return { x: m.a * v.x + m.b * v.y, y: m.c * v.x + m.d * v.y } }
function det(m: Mat2): number { return m.a * m.d - m.b * m.c }

const VS = 500; const RANGE = 3; const S = VS / (RANGE * 2 + 1)
const cx = VS / 2; const cy = VS / 2
const toSVG = (v: Vec2): [number, number] => [cx + v.x * S, cy - v.y * S]

const PRESETS: { label: string; m: Mat2 }[] = [
  { label: 'Scale 2×', m: { a: 2, b: 0, c: 0, d: 2 } },
  { label: 'Shear', m: { a: 1, b: 1.5, c: 0, d: 1 } },
  { label: 'Reflect', m: { a: 1, b: 0, c: 0, d: -1 } },
  { label: 'Rotate 45°', m: { a: 0.707, b: -0.707, c: 0.707, d: 0.707 } },
  { label: 'Collapse', m: { a: 1, b: 2, c: 0.5, d: 1 } },
]

function orientationArcPath(center: [number, number], radius: number, clockwise: boolean): string {
  const [cx, cy] = center
  if (clockwise) {
    return `M ${cx + radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx - radius} ${cy}`
  }
  return `M ${cx + radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx - radius} ${cy}`
}

export default function DeterminantPage() {
  const [matrix, setMatrix] = useState<Mat2>({ a: 1.5, b: 0.5, c: -0.3, d: 1.2 })
  const [dragging, setDragging] = useState<string | null>(null)
  const d = det(matrix)
  const absD = Math.abs(d)

  const handleDrag = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return
    const svg = e.currentTarget; const rect = svg.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * VS
    const my = ((e.clientY - rect.top) / rect.height) * VS
    const worldX = (mx - cx) / S
    const worldY = -(my - cy) / S
    if (dragging === 'ae1') setMatrix(prev => ({ ...prev, a: worldX, c: worldY }))
    else if (dragging === 'ae2') setMatrix(prev => ({ ...prev, b: worldX, d: worldY }))
  }, [dragging])

  const [o0x, o0y] = toSVG({ x: 0, y: 0 })
  const [o1x, o1y] = toSVG({ x: 1, y: 0 })
  const [o2x, o2y] = toSVG({ x: 1, y: 1 })
  const [o3x, o3y] = toSVG({ x: 0, y: 1 })
  const t0 = toSVG(txVec(matrix, { x: 0, y: 0 }))
  const t1 = toSVG(txVec(matrix, { x: 1, y: 0 }))
  const t2 = toSVG(txVec(matrix, { x: 1, y: 1 }))
  const t3 = toSVG(txVec(matrix, { x: 0, y: 1 }))
  const paraCenter: [number, number] = [(t0[0] + t2[0]) / 2, (t0[1] + t2[1]) / 2]

  const ae1 = txVec(matrix, { x: 1, y: 0 })
  const ae2 = txVec(matrix, { x: 0, y: 1 })
  const [ae1x, ae1y] = toSVG(ae1)
  const [ae2x, ae2y] = toSVG(ae2)

  const insight = absD < 0.05 ? null
    : d < 0 ? `Orientation reversed · area × ${absD.toFixed(2)}`
    : Math.abs(d - 1) < 0.05 ? 'Area perfectly preserved'
    : `Area × ${absD.toFixed(2)}`

  return (
    <div className="scene">
      <PhaseNav />
      <LinalgSidebar />
      <main className="stage" style={{ gridColumn: 2, gridRow: 2 }}>
        <div className="stage-top">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="breadcrumb">Determinant Explorer</div>
              <h1 className="big-question">What does the <span className="hl">determinant</span><br />actually measure?</h1>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              <div>
                <Tex tex="\det(A)" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }} />
                <motion.div key={d.toFixed(2)} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: '1.8rem', color: d < 0 ? '#4A90D9' : absD < 0.05 ? 'var(--gold)' : 'var(--text)' }}>
                  {d.toFixed(2)}
                </motion.div>
              </div>
              <div>
                <Tex tex="|\det(A)|" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }} />
                <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: '1.8rem', color: 'var(--gold-bright)' }}>{absD.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="la-center" style={{ gridTemplateColumns: '160px 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
            {(['a', 'b', 'c', 'd'] as const).map(k => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: '"Source Serif 4", serif', fontStyle: 'italic', fontSize: 11, color: 'var(--text-dim)' }}>{k}</span>
                  <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: '1.1rem' }}>{matrix[k].toFixed(1)}</span>
                </div>
                <input type="range" className="la-matrix-slider" min={-3} max={3} step={0.1} value={matrix[k]}
                  onChange={e => setMatrix(prev => ({ ...prev, [k]: parseFloat(e.target.value) }))} />
              </div>
            ))}
            <div style={{ borderTop: '1px solid rgba(176,141,87,0.06)', paddingTop: 8, marginTop: 4 }}>
              <Tex tex={`\\det(A) = ad - bc`} style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }} />
            </div>
            <AnimatePresence mode="wait">
              {insight && (
                <motion.div key={insight} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.4 }}>
                  {insight}
                </motion.div>
              )}
              {absD < 0.05 && (
                <motion.div key="collapse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.06em' }}>AREA → 0</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Space collapses to a line</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="la-canvas-wrap" style={{ position: 'relative' }}>
            <svg viewBox={`0 0 ${VS} ${VS}`} className="la-svg"
              style={{ cursor: dragging ? 'grabbing' : 'default' }}
              onPointerMove={handleDrag} onPointerUp={() => setDragging(null)} onPointerLeave={() => setDragging(null)}>
              <defs>
                <radialGradient id="bgDet" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(212,168,71,0.04)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
              </defs>
              <rect width={VS} height={VS} fill="url(#bgDet)" />
              {/* Grid */}
              {Array.from({ length: RANGE * 2 + 1 }, (_, i) => i - RANGE).map(i => (
                <g key={i}>
                  <line x1={toSVG({ x: i, y: -RANGE })[0]} y1={toSVG({ x: i, y: -RANGE })[1]} x2={toSVG({ x: i, y: RANGE })[0]} y2={toSVG({ x: i, y: RANGE })[1]} stroke="rgba(176,141,87,0.035)" />
                  <line x1={toSVG({ x: -RANGE, y: i })[0]} y1={toSVG({ x: -RANGE, y: i })[1]} x2={toSVG({ x: RANGE, y: i })[0]} y2={toSVG({ x: RANGE, y: i })[1]} stroke="rgba(176,141,87,0.035)" />
                </g>
              ))}
              {/* Axes */}
              <line x1={toSVG({ x: -RANGE, y: 0 })[0]} y1={cy} x2={toSVG({ x: RANGE, y: 0 })[0]} y2={cy} stroke="rgba(176,141,87,0.08)" strokeWidth={1} />
              <line x1={cx} y1={toSVG({ x: 0, y: -RANGE })[1]} x2={cx} y2={toSVG({ x: 0, y: RANGE })[1]} stroke="rgba(176,141,87,0.08)" strokeWidth={1} />

              {/* Unit square */}
              <polygon points={`${o0x},${o0y} ${o1x},${o1y} ${o2x},${o2y} ${o3x},${o3y}`} fill="rgba(212,168,71,0.03)" stroke="rgba(176,141,87,0.12)" strokeWidth={1} />
              <text x={(o0x + o2x) / 2} y={(o0y + o2y) / 2} fill="rgba(212,168,71,0.25)" fontSize={14} fontWeight={700} fontFamily='"Playfair Display"' textAnchor="middle" dominantBaseline="middle">1</text>

              {/* Transformed parallelogram */}
              <polygon points={`${t0[0]},${t0[1]} ${t1[0]},${t1[1]} ${t2[0]},${t2[1]} ${t3[0]},${t3[1]}`}
                fill={d < 0 ? 'rgba(74,144,217,0.12)' : 'rgba(212,168,71,0.14)'} stroke={d < 0 ? 'rgba(74,144,217,0.4)' : 'rgba(212,168,71,0.45)'} strokeWidth={2} />
              {absD > 0.05 && (
                <text x={paraCenter[0]} y={paraCenter[1]} fill={d < 0 ? 'rgba(74,144,217,0.7)' : 'rgba(212,168,71,0.75)'}
                  fontSize={20} fontWeight={900} fontFamily='"Playfair Display"' textAnchor="middle" dominantBaseline="middle">
                  {absD.toFixed(2)}
                </text>
              )}
              {absD < 0.05 && <text x={paraCenter[0]} y={paraCenter[1] - 8} fill="rgba(212,168,71,0.75)" fontSize={10} fontWeight={700} textAnchor="middle" fontFamily="Inter" letterSpacing="0.08em">COLLAPSED</text>}

              {/* Orientation indicator circle */}
              {absD > 0.1 && (
                <g>
                  <path d={orientationArcPath(paraCenter, 14, d < 0)}
                    fill="none" stroke={d < 0 ? 'rgba(74,144,217,0.35)' : 'rgba(212,168,71,0.3)'} strokeWidth={1.5}
                    markerEnd={`url(#orient-arrow-${d < 0 ? 'neg' : 'pos'})`} />
                  <defs>
                    <marker id="orient-arrow-neg" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                      <path d="M0 0L6 3L0 6" fill="rgba(74,144,217,0.4)" />
                    </marker>
                    <marker id="orient-arrow-pos" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                      <path d="M0 0L6 3L0 6" fill="rgba(212,168,71,0.35)" />
                    </marker>
                  </defs>
                </g>
              )}

              {/* Basis vectors — draggable */}
              <line x1={o0x} y1={o0y} x2={ae1x} y2={ae1y} stroke="#E8845A" strokeWidth={2} strokeLinecap="round" />
              <circle cx={ae1x} cy={ae1y} r={8} fill="#E8845A" fillOpacity={0.18} stroke="#E8845A" strokeWidth={1.5}
                cursor="grab" onPointerDown={() => setDragging('ae1')} />
              <text x={ae1x + 8} y={ae1y + 14} fill="#E8845A" fontSize={10} fontWeight={600} fontFamily="Inter">Ae₁</text>

              <line x1={o0x} y1={o0y} x2={ae2x} y2={ae2y} stroke="#6AADE4" strokeWidth={2} strokeLinecap="round" />
              <circle cx={ae2x} cy={ae2y} r={8} fill="#6AADE4" fillOpacity={0.18} stroke="#6AADE4" strokeWidth={1.5}
                cursor="grab" onPointerDown={() => setDragging('ae2')} />
              <text x={ae2x + 8} y={ae2y - 8} fill="#6AADE4" fontSize={10} fontWeight={600} fontFamily="Inter">Ae₂</text>
            </svg>
          </div>
        </div>
        <div className="la-presets">
          {PRESETS.map(p => (
            <button key={p.label} className="la-preset-btn" onClick={() => setMatrix(p.m)}>{p.label}</button>
          ))}
        </div>
      </main>
    </div>
  )
}
