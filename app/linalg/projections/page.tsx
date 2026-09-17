'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import PhaseNav from '@/components/PhaseNav'
import LinalgSidebar from '@/components/LinalgSidebar'
import Tex from '@/components/Math'

interface Vec2 { x: number; y: number }

function dot(a: Vec2, b: Vec2): number { return a.x * b.x + a.y * b.y }
function scl(v: Vec2, s: number): Vec2 { return { x: v.x * s, y: v.y * s } }
function sub(a: Vec2, b: Vec2): Vec2 { return { x: a.x - b.x, y: a.y - b.y } }
function len(v: Vec2): number { return Math.sqrt(v.x * v.x + v.y * v.y) }
function proj(u: Vec2, v: Vec2): Vec2 { const vv = dot(v, v); if (vv < 1e-10) return { x: 0, y: 0 }; return scl(v, dot(v, u) / vv) }

const VS = 500; const RANGE = 3; const S = VS / (RANGE * 2 + 1)
const cx = VS / 2; const cy = VS / 2
const toSVG = (v: Vec2): [number, number] => [cx + v.x * S, cy - v.y * S]

export default function ProjectionsPage() {
  const [u, setU] = useState<Vec2>({ x: 2, y: 1.5 })
  const [vDir, setVDir] = useState(0.3)
  const [dragging, setDragging] = useState<string | null>(null)

  const v: Vec2 = { x: Math.cos(vDir) * 3, y: Math.sin(vDir) * 3 }
  const p = proj(u, v)
  const resid = sub(u, p)
  const coeff = dot(v, u) / (dot(v, v) || 1)

  const [ox, oy] = toSVG({ x: 0, y: 0 })
  const [ux, uy] = toSVG(u)
  const [vx, vy] = toSVG(v)
  const [px, py] = toSVG(p)
  const [negVx, negVy] = toSVG(scl(v, -1))

  const handleDrag = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return
    const svg = e.currentTarget; const rect = svg.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * VS
    const my = ((e.clientY - rect.top) / rect.height) * VS
    const worldX = (mx - cx) / S
    const worldY = -(my - cy) / S

    if (dragging === 'u') {
      setU({ x: worldX, y: worldY })
    } else if (dragging === 'v') {
      const angle = Math.atan2(worldY, worldX)
      setVDir(angle)
    }
  }, [dragging])

  // Right angle marker at projection point
  const rightAngle = (() => {
    const pLen = len(p)
    const rLen = len(resid)
    if (pLen < 0.15 || rLen < 0.15) return null
    const sz = 8
    const pn = { x: p.x / pLen, y: p.y / pLen }
    const rn = { x: resid.x / rLen, y: resid.y / rLen }
    const c1 = toSVG({ x: p.x + rn.x * sz / S, y: p.y + rn.y * sz / S })
    const c2 = toSVG({ x: p.x + rn.x * sz / S + pn.x * sz / S, y: p.y + rn.y * sz / S + pn.y * sz / S })
    const c3 = toSVG({ x: p.x + pn.x * sz / S, y: p.y + pn.y * sz / S })
    return `M ${c1[0]},${c1[1]} L ${c2[0]},${c2[1]} L ${c3[0]},${c3[1]}`
  })()

  return (
    <div className="scene">
      <PhaseNav />
      <LinalgSidebar />
      <main className="stage" style={{ gridColumn: 2, gridRow: 2 }}>
        <div className="stage-top">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="breadcrumb">Projection Explorer</div>
              <h1 className="big-question">How much of one vector<br />lives in <span className="hl">another direction</span>?</h1>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <Tex tex={`\\text{proj}_{\\mathbf{v}}\\mathbf{u} = \\frac{\\mathbf{v}^T\\mathbf{u}}{\\mathbf{v}^T\\mathbf{v}}\\,\\mathbf{v}`}
                style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} />
            </div>
          </div>
        </div>
        <div className="la-center" style={{ gridTemplateColumns: '160px 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
            <div>
              <div className="readout-posterior-label">Direction v</div>
              <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: '1.1rem' }}>{(vDir * 180 / Math.PI).toFixed(0)}°</div>
              <input type="range" className="la-matrix-slider" min={-Math.PI} max={Math.PI} step={0.01} value={vDir}
                onChange={e => setVDir(parseFloat(e.target.value))} />
            </div>
            <div style={{ borderTop: '1px solid rgba(176,141,87,0.06)', paddingTop: 10 }}>
              <div className="readout-posterior-label">Projection</div>
              <div style={{ color: 'var(--gold-bright)', fontWeight: 700, fontSize: '0.85rem' }}>
                ({p.x.toFixed(2)}, {p.y.toFixed(2)})
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
                |proj| = {len(p).toFixed(2)}
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(176,141,87,0.06)', paddingTop: 10 }}>
              <div className="readout-posterior-label">Residual</div>
              <div style={{ color: '#3AAFA9', fontWeight: 700, fontSize: '0.85rem' }}>
                ({resid.x.toFixed(2)}, {resid.y.toFixed(2)})
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
                |resid| = {len(resid).toFixed(2)}
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(176,141,87,0.06)', paddingTop: 10 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                <Tex tex={`\\mathbf{u} = \\text{proj} + \\text{resid}`} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }} />
                <div style={{ marginTop: 4, fontStyle: 'italic' }}>Coefficient = {coeff.toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div className="la-canvas-wrap" style={{ position: 'relative' }}>
            <svg viewBox={`0 0 ${VS} ${VS}`} className="la-svg" style={{ cursor: dragging ? 'grabbing' : 'default' }}
              onPointerMove={handleDrag} onPointerUp={() => setDragging(null)} onPointerLeave={() => setDragging(null)}>
              <defs>
                <radialGradient id="bgProj" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(212,168,71,0.03)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
              </defs>
              <rect width={VS} height={VS} fill="url(#bgProj)" />
              {/* Axes */}
              <line x1={toSVG({ x: -RANGE, y: 0 })[0]} y1={cy} x2={toSVG({ x: RANGE, y: 0 })[0]} y2={cy} stroke="rgba(176,141,87,0.08)" strokeWidth={1} />
              <line x1={cx} y1={toSVG({ x: 0, y: -RANGE })[1]} x2={cx} y2={toSVG({ x: 0, y: RANGE })[1]} stroke="rgba(176,141,87,0.08)" strokeWidth={1} />

              {/* Direction line (span of v) */}
              <line x1={negVx} y1={negVy} x2={vx} y2={vy} stroke="rgba(176,141,87,0.1)" strokeWidth={1} strokeDasharray="6 4" />

              {/* Projection vector (gold, on direction line) */}
              <line x1={ox} y1={oy} x2={px} y2={py} stroke="var(--gold-bright)" strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={px} cy={py} r={4} fill="var(--gold-bright)" />
              <text x={px + (px > ox ? 8 : -28)} y={py + 14} fill="var(--gold-bright)" fontSize={10} fontWeight={600} fontFamily="Inter">proj</text>

              {/* Residual vector (teal, from proj to u) */}
              <line x1={px} y1={py} x2={ux} y2={uy} stroke="#3AAFA9" strokeWidth={2} strokeLinecap="round" />
              <text x={(px + ux) / 2 + 8} y={(py + uy) / 2 - 6} fill="#3AAFA9" fontSize={9} fontWeight={600} fontFamily="Inter" opacity={0.7}>resid</text>

              {/* Right angle marker */}
              {rightAngle && (
                <path d={rightAngle} fill="none" stroke="rgba(184,169,146,0.35)" strokeWidth={1} />
              )}

              {/* v direction vector — draggable */}
              <line x1={ox} y1={oy} x2={vx} y2={vy} stroke="rgba(184,169,146,0.35)" strokeWidth={1.5} strokeLinecap="round" />
              <circle cx={vx} cy={vy} r={8} fill="rgba(176,141,87,0.08)" stroke="rgba(184,169,146,0.3)" strokeWidth={1.5}
                cursor="grab" onPointerDown={() => setDragging('v')} />
              <text x={vx + 10} y={vy - 8} fill="rgba(184,169,146,0.5)" fontSize={10} fontWeight={600} fontFamily="Inter">v</text>

              {/* u vector — draggable */}
              <line x1={ox} y1={oy} x2={ux} y2={uy} stroke="#E8C35A" strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={ux} cy={uy} r={9} fill="#E8C35A" fillOpacity={0.18} stroke="#E8C35A" strokeWidth={1.5}
                cursor="grab" onPointerDown={() => setDragging('u')} />
              <text x={ux + 10} y={uy - 8} fill="#E8C35A" fontSize={11} fontWeight={700} fontFamily="Inter">u</text>
            </svg>
          </div>
        </div>
      </main>
    </div>
  )
}
