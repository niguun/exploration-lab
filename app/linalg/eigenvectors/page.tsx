'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PhaseNav from '@/components/PhaseNav'
import LinalgSidebar from '@/components/LinalgSidebar'
import Tex from '@/components/Math'

interface Vec2 { x: number; y: number }
interface Mat2 { a: number; b: number; c: number; d: number }

function txVec(m: Mat2, v: Vec2): Vec2 { return { x: m.a * v.x + m.b * v.y, y: m.c * v.x + m.d * v.y } }

function eigenvalues(m: Mat2) {
  const tr = m.a + m.d; const d = m.a * m.d - m.b * m.c; const disc = tr * tr - 4 * d
  if (disc < -1e-10) return { l1: tr / 2, l2: tr / 2, isComplex: true, v1: null, v2: null }
  const sq = Math.sqrt(Math.max(0, disc)); const l1 = (tr + sq) / 2; const l2 = (tr - sq) / 2
  function ev(lam: number): Vec2 {
    const rx = m.a - lam; const ry = m.b
    if (Math.abs(ry) > 1e-10) { const len = Math.sqrt(1 + (rx / ry) ** 2); return { x: 1 / len, y: (-rx / ry) / len } }
    if (Math.abs(rx) > 1e-10) return { x: 0, y: 1 }
    return { x: 1, y: 0 }
  }
  return { l1, l2, isComplex: false, v1: ev(l1), v2: Math.abs(l1 - l2) > 1e-10 ? ev(l2) : null }
}

const VS = 500; const RANGE = 3; const S = VS / (RANGE * 2 + 1)
const cxS = VS / 2; const cyS = VS / 2
const toSVG = (v: Vec2): [number, number] => [cxS + v.x * S, cyS - v.y * S]

const MATRICES: { label: string; m: Mat2 }[] = [
  { label: 'Diagonal', m: { a: 2, b: 0, c: 0, d: 0.5 } },
  { label: 'Symmetric', m: { a: 2, b: 1, c: 1, d: 2 } },
  { label: 'Shear', m: { a: 1, b: 1, c: 0, d: 1 } },
  { label: 'Rotation', m: { a: 0, b: -1, c: 1, d: 0 } },
]

function Arrow({ from, to, color, width }: { from: [number, number]; to: [number, number]; color: string; width: number }) {
  const dx = to[0] - from[0]; const dy = to[1] - from[1]
  const len = Math.sqrt(dx * dx + dy * dy); if (len < 2) return null
  const ux = dx / len; const uy = dy / len; const s = 6
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon points={`${to[0]},${to[1]} ${to[0] - ux * s - uy * s * 0.35},${to[1] - uy * s + ux * s * 0.35} ${to[0] - ux * s + uy * s * 0.35},${to[1] - uy * s - ux * s * 0.35}`}
        fill={color} />
    </g>
  )
}

export default function EigenvectorsPage() {
  const [matrixIdx, setMatrixIdx] = useState(1)
  const matrix = MATRICES[matrixIdx].m
  const [testAngle, setTestAngle] = useState(0.4)
  const [dragging, setDragging] = useState(false)
  const eigen = useMemo(() => eigenvalues(matrix), [matrix])

  const testV: Vec2 = { x: Math.cos(testAngle) * 2, y: Math.sin(testAngle) * 2 }
  const testAv = txVec(matrix, testV)
  const testVLen = Math.sqrt(testV.x ** 2 + testV.y ** 2)
  const testAvLen = Math.sqrt(testAv.x ** 2 + testAv.y ** 2)
  const cross = testV.x * testAv.y - testV.y * testAv.x
  const sinAngle = Math.abs(cross) / (testVLen * testAvLen + 1e-10)
  const isAligned = sinAngle < 0.05 && testAvLen > 0.1
  const lambda = isAligned ? ((Math.abs(testV.x) > Math.abs(testV.y)) ? testAv.x / testV.x : testAv.y / testV.y) : 0

  const handleDragAngle = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return
    const svg = e.currentTarget; const rect = svg.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * VS
    const my = ((e.clientY - rect.top) / rect.height) * VS
    const worldX = (mx - cxS) / S
    const worldY = -(my - cyS) / S
    const angle = Math.atan2(worldY, worldX)
    setTestAngle(angle < 0 ? angle + Math.PI : angle)
  }, [dragging])

  const [ox, oy] = toSVG({ x: 0, y: 0 })

  const directionRays: React.ReactNode[] = []
  for (let a = 0; a < Math.PI; a += Math.PI / 36) {
    const v: Vec2 = { x: Math.cos(a) * 2.5, y: Math.sin(a) * 2.5 }
    const av = txVec(matrix, v)
    const vl = Math.sqrt(v.x ** 2 + v.y ** 2); const avl = Math.sqrt(av.x ** 2 + av.y ** 2)
    const cr = Math.abs(v.x * av.y - v.y * av.x) / (vl * avl + 1e-10)
    const isEig = cr < 0.04
    directionRays.push(
      <g key={a} opacity={isEig ? 0.7 : 0.08}>
        <line x1={ox} y1={oy} x2={toSVG(v)[0]} y2={toSVG(v)[1]} stroke="rgba(176,141,87,0.15)" strokeWidth={0.5} />
        <line x1={ox} y1={oy} x2={toSVG(av)[0]} y2={toSVG(av)[1]}
          stroke={isEig ? 'rgba(232,195,90,0.65)' : 'rgba(212,168,71,0.12)'} strokeWidth={isEig ? 2 : 0.5} />
      </g>
    )
  }

  return (
    <div className="scene">
      <PhaseNav />
      <LinalgSidebar />
      <main className="stage" style={{ gridColumn: 2, gridRow: 2 }}>
        <div className="stage-top">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="breadcrumb">Eigenvector Explorer</div>
              <h1 className="big-question">Which directions<br /><span className="hl">do not turn</span>?</h1>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {!eigen.isComplex ? (
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <Tex tex="\lambda_1" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }} />
                    <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: '1.6rem', color: 'var(--gold-bright)' }}>{eigen.l1.toFixed(2)}</div>
                  </div>
                  {eigen.v2 && (
                    <div>
                      <Tex tex="\lambda_2" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }} />
                      <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: '1.6rem', color: '#4A90D9' }}>{eigen.l2.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', fontStyle: 'italic' }}>Complex eigenvalues — no real eigenvectors</div>
              )}
            </div>
          </div>
        </div>
        <div className="la-center" style={{ gridTemplateColumns: '150px 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}>
            {MATRICES.map((p, i) => (
              <button key={p.label} className={`la-preset-btn ${matrixIdx === i ? 'active' : ''}`}
                style={{ textAlign: 'left', padding: '6px 10px' }}
                onClick={() => setMatrixIdx(i)}>{p.label}</button>
            ))}
            <div style={{ borderTop: '1px solid rgba(176,141,87,0.06)', paddingTop: 10 }}>
              <div className="readout-posterior-label" style={{ marginBottom: 4 }}>Test direction</div>
              <input type="range" className="la-matrix-slider" min={0} max={Math.PI} step={0.01} value={testAngle}
                onChange={e => setTestAngle(parseFloat(e.target.value))} />
              <div style={{ fontSize: 8, color: 'var(--text-dim)', marginTop: 2 }}>
                {(testAngle * 180 / Math.PI).toFixed(0)}°
              </div>
              <AnimatePresence>
                {isAligned && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    style={{
                      marginTop: 8, padding: '5px 8px', borderRadius: 3,
                      background: 'rgba(212,168,71,0.1)', border: '1px solid rgba(212,168,71,0.2)',
                    }}>
                    <div style={{ color: 'var(--gold)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                      DIRECTION PRESERVED
                    </div>
                    <div style={{ color: 'var(--gold-bright)', fontSize: '0.85rem', fontWeight: 700, marginTop: 2 }}>
                      λ = {lambda.toFixed(2)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {!eigen.isComplex && (
              <div style={{ borderTop: '1px solid rgba(176,141,87,0.06)', paddingTop: 8 }}>
                <Tex tex={`A\\mathbf{v} = \\lambda\\mathbf{v}`} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} />
                <div style={{ marginTop: 4, fontSize: '0.68rem', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.4 }}>
                  Same direction, different scale
                </div>
              </div>
            )}
          </div>
          <div className="la-canvas-wrap" style={{ position: 'relative' }}>
            <svg viewBox={`0 0 ${VS} ${VS}`} className="la-svg"
              style={{ cursor: dragging ? 'grabbing' : 'default' }}
              onPointerMove={handleDragAngle} onPointerUp={() => setDragging(false)} onPointerLeave={() => setDragging(false)}>
              <defs>
                <radialGradient id="bgEig" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(212,168,71,0.03)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
              </defs>
              <rect width={VS} height={VS} fill="url(#bgEig)" />
              <line x1={toSVG({ x: -RANGE, y: 0 })[0]} y1={cyS} x2={toSVG({ x: RANGE, y: 0 })[0]} y2={cyS} stroke="rgba(176,141,87,0.08)" strokeWidth={1} />
              <line x1={cxS} y1={toSVG({ x: 0, y: -RANGE })[1]} x2={cxS} y2={toSVG({ x: 0, y: RANGE })[1]} stroke="rgba(176,141,87,0.08)" strokeWidth={1} />

              {/* Direction rays */}
              {directionRays}

              {/* Eigenvector lines */}
              {eigen.v1 && !eigen.isComplex && (
                <line x1={toSVG({ x: -eigen.v1.x * RANGE, y: -eigen.v1.y * RANGE })[0]} y1={toSVG({ x: -eigen.v1.x * RANGE, y: -eigen.v1.y * RANGE })[1]}
                  x2={toSVG({ x: eigen.v1.x * RANGE, y: eigen.v1.y * RANGE })[0]} y2={toSVG({ x: eigen.v1.x * RANGE, y: eigen.v1.y * RANGE })[1]}
                  stroke="rgba(212,168,71,0.2)" strokeWidth={1} strokeDasharray="6 4" />
              )}
              {eigen.v2 && !eigen.isComplex && (
                <line x1={toSVG({ x: -eigen.v2.x * RANGE, y: -eigen.v2.y * RANGE })[0]} y1={toSVG({ x: -eigen.v2.x * RANGE, y: -eigen.v2.y * RANGE })[1]}
                  x2={toSVG({ x: eigen.v2.x * RANGE, y: eigen.v2.y * RANGE })[0]} y2={toSVG({ x: eigen.v2.x * RANGE, y: eigen.v2.y * RANGE })[1]}
                  stroke="rgba(74,144,217,0.2)" strokeWidth={1} strokeDasharray="6 4" />
              )}

              {/* Halo for aligned test vector */}
              {isAligned && (
                <circle cx={toSVG(testAv)[0]} cy={toSVG(testAv)[1]} r={12}
                  fill="none" stroke="rgba(212,168,71,0.25)" strokeWidth={2}>
                  <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.35;0.15;0.35" dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Test vector v */}
              <Arrow from={[ox, oy]} to={toSVG(testV)} color="rgba(184,169,146,0.55)" width={2} />
              <circle cx={toSVG(testV)[0]} cy={toSVG(testV)[1]} r={8}
                fill="rgba(176,141,87,0.1)" stroke="rgba(184,169,146,0.35)" strokeWidth={1.5}
                cursor="grab" onPointerDown={() => setDragging(true)} />
              <text x={toSVG(testV)[0] + 10} y={toSVG(testV)[1] - 8} fill="rgba(184,169,146,0.6)" fontSize={10} fontWeight={600} fontFamily="Inter">v</text>

              {/* Transformed Av */}
              <Arrow from={[ox, oy]} to={toSVG(testAv)}
                color={isAligned ? '#E8C35A' : 'rgba(212,168,71,0.55)'} width={isAligned ? 3 : 2} />
              <circle cx={toSVG(testAv)[0]} cy={toSVG(testAv)[1]} r={4} fill={isAligned ? '#E8C35A' : 'rgba(212,168,71,0.55)'} />
              <text x={toSVG(testAv)[0] + 10} y={toSVG(testAv)[1] - 8}
                fill={isAligned ? '#E8C35A' : 'rgba(212,168,71,0.55)'} fontSize={10} fontWeight={600} fontFamily="Inter">Av</text>
            </svg>
          </div>
        </div>
      </main>
    </div>
  )
}
