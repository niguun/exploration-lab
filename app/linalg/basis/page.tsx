'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PhaseNav from '@/components/PhaseNav'
import LinalgSidebar from '@/components/LinalgSidebar'
import Tex from '@/components/Math'

interface Vec2 { x: number; y: number }

function basisCoords(b1: Vec2, b2: Vec2, v: Vec2): { alpha: number; beta: number } | null {
  const d = b1.x * b2.y - b1.y * b2.x
  if (Math.abs(d) < 1e-10) return null
  return { alpha: (v.x * b2.y - v.y * b2.x) / d, beta: (b1.x * v.y - b1.y * v.x) / d }
}

const VS = 500; const RANGE = 4; const S = VS / (RANGE * 2 + 1)
const cxC = VS / 2; const cyC = VS / 2
const toSVG = (v: Vec2): [number, number] => [cxC + v.x * S, cyC - v.y * S]

type DegenerateState = 'valid' | 'approaching' | 'degenerate'

function getDegenerateState(b1: Vec2, b2: Vec2): DegenerateState {
  const cross = Math.abs(b1.x * b2.y - b1.y * b2.x)
  const l1 = Math.sqrt(b1.x ** 2 + b1.y ** 2)
  const l2 = Math.sqrt(b2.x ** 2 + b2.y ** 2)
  const maxCross = l1 * l2
  if (maxCross < 1e-6) return 'degenerate'
  const ratio = cross / maxCross
  if (ratio < 0.02) return 'degenerate'
  if (ratio < 0.2) return 'approaching'
  return 'valid'
}

export default function BasisPage() {
  const [b1, setB1] = useState<Vec2>({ x: 1.5, y: 0.3 })
  const [b2, setB2] = useState<Vec2>({ x: -0.4, y: 1.2 })
  const v: Vec2 = { x: 2, y: 1.5 }
  const coords = basisCoords(b1, b2, v)
  const degState = useMemo(() => getDegenerateState(b1, b2), [b1, b2])
  const [dragging, setDragging] = useState<string | null>(null)

  const handleDrag = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return
    const svg = e.currentTarget; const rect = svg.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * VS
    const my = ((e.clientY - rect.top) / rect.height) * VS
    const pt: Vec2 = { x: (mx - cxC) / S, y: -(my - cyC) / S }
    if (dragging === 'b1') setB1(pt)
    else if (dragging === 'b2') setB2(pt)
  }, [dragging])

  const gridLines: React.ReactNode[] = []
  const gridOpacity = degState === 'degenerate' ? 0.15 : degState === 'approaching' ? 0.4 : 1
  for (let i = -6; i <= 6; i++) {
    const [ax, ay] = toSVG({ x: b1.x * i + b2.x * (-6), y: b1.y * i + b2.y * (-6) })
    const [bx, by] = toSVG({ x: b1.x * i + b2.x * 6, y: b1.y * i + b2.y * 6 })
    gridLines.push(<line key={`g1-${i}`} x1={ax} y1={ay} x2={bx} y2={by} stroke="rgba(212,168,71,0.16)" strokeWidth={i === 0 ? 1 : 0.6} />)
    const [cx2, cy2] = toSVG({ x: b1.x * (-6) + b2.x * i, y: b1.y * (-6) + b2.y * i })
    const [dx, dy] = toSVG({ x: b1.x * 6 + b2.x * i, y: b1.y * 6 + b2.y * i })
    gridLines.push(<line key={`g2-${i}`} x1={cx2} y1={cy2} x2={dx} y2={dy} stroke="rgba(212,168,71,0.16)" strokeWidth={i === 0 ? 1 : 0.6} />)
  }

  const [vx, vy] = toSVG(v)
  const [b1x, b1y] = toSVG(b1)
  const [b2x, b2y] = toSVG(b2)
  const [ox, oy] = toSVG({ x: 0, y: 0 })

  return (
    <div className="scene">
      <PhaseNav />
      <LinalgSidebar />
      <main className="stage" style={{ gridColumn: 2, gridRow: 2 }}>
        <div className="stage-top">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="breadcrumb">Basis Explorer</div>
              <h1 className="big-question">Why do <span className="hl">two vectors</span><br />define the whole plane?</h1>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              {coords && (
                <Tex tex={`\\mathbf{v} = ${coords.alpha.toFixed(2)}\\,\\mathbf{b}_1 + ${coords.beta.toFixed(2)}\\,\\mathbf{b}_2`}
                  style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }} />
              )}
              <AnimatePresence mode="wait">
                {degState === 'degenerate' && (
                  <motion.div key="deg" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ color: '#E05A47', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em' }}>
                    NOT A BASIS
                  </motion.div>
                )}
                {degState === 'approaching' && (
                  <motion.div key="app" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ color: 'var(--gold)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em' }}>
                    BASIS BECOMING DEGENERATE
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="la-center" style={{ gridTemplateColumns: '1fr', gap: 0 }}>
          <div className="la-canvas-wrap" style={{ position: 'relative' }}>
            <svg viewBox={`0 0 ${VS} ${VS}`} className="la-svg" style={{ cursor: dragging ? 'grabbing' : 'default' }}
              onPointerMove={handleDrag} onPointerUp={() => setDragging(null)} onPointerLeave={() => setDragging(null)}>
              <defs>
                <radialGradient id="bgBasis" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(212,168,71,0.04)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
              </defs>
              <rect width={VS} height={VS} fill="url(#bgBasis)" />
              {/* Faint Cartesian grid */}
              {Array.from({ length: RANGE * 2 + 1 }, (_, i) => i - RANGE).map(i => (
                <g key={`cart${i}`}>
                  <line x1={toSVG({ x: i, y: -RANGE })[0]} y1={toSVG({ x: i, y: -RANGE })[1]} x2={toSVG({ x: i, y: RANGE })[0]} y2={toSVG({ x: i, y: RANGE })[1]} stroke="rgba(176,141,87,0.035)" />
                  <line x1={toSVG({ x: -RANGE, y: i })[0]} y1={toSVG({ x: -RANGE, y: i })[1]} x2={toSVG({ x: RANGE, y: i })[0]} y2={toSVG({ x: RANGE, y: i })[1]} stroke="rgba(176,141,87,0.035)" />
                </g>
              ))}
              {/* Basis grid */}
              <g opacity={gridOpacity} style={{ transition: 'opacity 0.3s' }}>{gridLines}</g>
              {/* Axes */}
              <line x1={toSVG({ x: -RANGE, y: 0 })[0]} y1={cyC} x2={toSVG({ x: RANGE, y: 0 })[0]} y2={cyC} stroke="rgba(176,141,87,0.1)" strokeWidth={1} />
              <line x1={cxC} y1={toSVG({ x: 0, y: -RANGE })[1]} x2={cxC} y2={toSVG({ x: 0, y: RANGE })[1]} stroke="rgba(176,141,87,0.1)" strokeWidth={1} />

              {/* Component lines (decomposition of v) */}
              {coords && degState !== 'degenerate' && (
                <g opacity={0.35}>
                  <line x1={ox} y1={oy}
                    x2={toSVG({ x: b1.x * coords.alpha, y: b1.y * coords.alpha })[0]}
                    y2={toSVG({ x: b1.x * coords.alpha, y: b1.y * coords.alpha })[1]}
                    stroke="#E05A47" strokeWidth={1.5} strokeDasharray="4 3" />
                  <line x1={toSVG({ x: b1.x * coords.alpha, y: b1.y * coords.alpha })[0]}
                    y1={toSVG({ x: b1.x * coords.alpha, y: b1.y * coords.alpha })[1]}
                    x2={vx} y2={vy} stroke="#4A90D9" strokeWidth={1.5} strokeDasharray="4 3" />
                </g>
              )}

              {/* b1 vector */}
              <line x1={ox} y1={oy} x2={b1x} y2={b1y} stroke="#E05A47" strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={b1x} cy={b1y} r={9} fill="#E05A47" fillOpacity={0.18} stroke="#E05A47" strokeWidth={1.5} cursor="grab"
                onPointerDown={() => setDragging('b1')} />
              <text x={b1x + 10} y={b1y - 8} fill="#E05A47" fontSize={11} fontWeight={600} fontFamily="Inter">b₁</text>

              {/* b2 vector */}
              <line x1={ox} y1={oy} x2={b2x} y2={b2y} stroke="#4A90D9" strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={b2x} cy={b2y} r={9} fill="#4A90D9" fillOpacity={0.18} stroke="#4A90D9" strokeWidth={1.5} cursor="grab"
                onPointerDown={() => setDragging('b2')} />
              <text x={b2x + 10} y={b2y - 8} fill="#4A90D9" fontSize={11} fontWeight={600} fontFamily="Inter">b₂</text>

              {/* v vector */}
              <line x1={ox} y1={oy} x2={vx} y2={vy} stroke="#E8C35A" strokeWidth={2} strokeLinecap="round" />
              <circle cx={vx} cy={vy} r={4} fill="#E8C35A" />
              <text x={vx + 8} y={vy - 6} fill="#E8C35A" fontSize={11} fontWeight={600} fontFamily="Inter">v</text>

              {/* Coefficient labels near decomposition */}
              {coords && degState !== 'degenerate' && (
                <>
                  <text x={toSVG({ x: b1.x * coords.alpha * 0.5, y: b1.y * coords.alpha * 0.5 })[0] - 14}
                    y={toSVG({ x: b1.x * coords.alpha * 0.5, y: b1.y * coords.alpha * 0.5 })[1] + 14}
                    fill="#E05A47" fontSize={9} fontWeight={600} fontFamily="Inter" opacity={0.7}>
                    α={coords.alpha.toFixed(1)}
                  </text>
                  <text x={toSVG({ x: b1.x * coords.alpha + b2.x * coords.beta * 0.5, y: b1.y * coords.alpha + b2.y * coords.beta * 0.5 })[0] + 8}
                    y={toSVG({ x: b1.x * coords.alpha + b2.x * coords.beta * 0.5, y: b1.y * coords.alpha + b2.y * coords.beta * 0.5 })[1] - 6}
                    fill="#4A90D9" fontSize={9} fontWeight={600} fontFamily="Inter" opacity={0.7}>
                    β={coords.beta.toFixed(1)}
                  </text>
                </>
              )}
            </svg>

            {/* Insight overlay */}
            <AnimatePresence>
              {degState === 'valid' && coords && (
                <motion.div key="insight" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                    fontSize: '0.78rem', fontFamily: '"Source Serif 4", Georgia, serif', fontStyle: 'italic',
                    color: 'var(--text-secondary)', textAlign: 'center', pointerEvents: 'none',
                    background: 'rgba(10,9,7,0.75)', padding: '4px 14px', borderRadius: 3,
                  }}>
                  The vector did not move. The coordinate system did.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="la-presets" style={{ justifyContent: 'center' }}>
          <span style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>DRAG THE VECTOR TIPS TO RESHAPE THE COORDINATE SYSTEM</span>
        </div>
      </main>
    </div>
  )
}
