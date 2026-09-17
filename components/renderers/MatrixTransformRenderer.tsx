'use client'

import { useState, useCallback } from 'react'
import type { RendererProps } from '@/lib/renderer-registry'
import { transformVec, determinant, lerpMat } from '@/lib/linalg'
import type { Mat2, Vec2 } from '@/lib/linalg'
import Tex from '@/components/Math'

const IDENTITY: Mat2 = { a: 1, b: 0, c: 0, d: 1 }
const GRID_RANGE = 4
const EXAMPLE_V: Vec2 = { x: 1, y: 1 }

const PRESETS: { key: string; label: string; matrix: Mat2 }[] = [
  { key: 'identity', label: 'Identity', matrix: { a: 1, b: 0, c: 0, d: 1 } },
  { key: 'rotate90', label: 'Rotate 90°', matrix: { a: 0, b: -1, c: 1, d: 0 } },
  { key: 'shear', label: 'Shear', matrix: { a: 1, b: 1, c: 0, d: 1 } },
  { key: 'stretchX', label: 'Stretch X', matrix: { a: 2, b: 0, c: 0, d: 1 } },
  { key: 'reflectX', label: 'Reflect X', matrix: { a: 1, b: 0, c: 0, d: -1 } },
  { key: 'collapse', label: 'Collapse', matrix: { a: 1, b: 2, c: 0.5, d: 1 } },
]

const COL = {
  e1: '#E05A47', e2: '#4A90D9', ae1: '#E8845A', ae2: '#6AADE4',
  av: '#E8C35A', gridOrig: 'rgba(212,168,71,0.04)', gridTx: 'rgba(212,168,71,0.14)',
  gridTxStrong: 'rgba(212,168,71,0.28)', axis: 'rgba(176,141,87,0.1)',
  paraPos: 'rgba(212,168,71,0.12)', paraNeg: 'rgba(74,144,217,0.1)',
  paraStrokePos: 'rgba(212,168,71,0.4)', paraStrokeNeg: 'rgba(74,144,217,0.35)',
}

function Arrow({ from, to, color, width }: { from: [number, number]; to: [number, number]; color: string; width: number }) {
  const dx = to[0] - from[0]; const dy = to[1] - from[1]
  const len = Math.sqrt(dx * dx + dy * dy); if (len < 2) return null
  const ux = dx / len; const uy = dy / len; const s = 7
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon points={`${to[0]},${to[1]} ${to[0] - ux * s - uy * s * 0.4},${to[1] - uy * s + ux * s * 0.4} ${to[0] - ux * s + uy * s * 0.4},${to[1] - uy * s - ux * s * 0.4}`} fill={color} />
    </g>
  )
}

export default function MatrixTransformRenderer({ config, onAction, interactive }: RendererProps) {
  const initMatrix = (config.initialMatrix as Mat2 | undefined) ?? { a: 1.2, b: 0.8, c: -0.6, d: 1.4 }
  const [matrix, setMatrix] = useState<Mat2>(initMatrix)
  const [tParam, setTParam] = useState(1)
  const [dragging, setDragging] = useState<string | null>(null)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const viewSize = 500; const scale = viewSize / (GRID_RANGE * 2 + 2)
  const cx = viewSize / 2; const cy = viewSize / 2
  const m = lerpMat(IDENTITY, matrix, tParam)
  const d = determinant(m)
  const toSVG = (v: Vec2): [number, number] => [cx + v.x * scale, cy - v.y * scale]
  const txToSVG = (v: Vec2): [number, number] => { const tv = transformVec(m, v); return [cx + tv.x * scale, cy - tv.y * scale] }

  const setField = useCallback((field: keyof Mat2, val: number) => {
    if (!interactive) return
    setMatrix(prev => ({ ...prev, [field]: val })); setActivePreset(null); setTParam(1)
    onAction('matrix_changed', { field, value: val })
  }, [interactive, onAction])

  const applyPreset = useCallback((key: string, mat: Mat2) => {
    if (!interactive) return
    setMatrix(mat); setActivePreset(key); setTParam(1)
    onAction('preset_applied', { key })
  }, [interactive, onAction])

  const handleDragMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || !dragging) return
    const svg = e.currentTarget; const rect = svg.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * viewSize
    const my = ((e.clientY - rect.top) / rect.height) * viewSize
    const worldX = (mx - cx) / scale; const worldY = -(my - cy) / scale
    if (dragging === 'ae1') { setMatrix(prev => ({ ...prev, a: worldX, c: worldY })); onAction('basis_dragged', { target: 'ae1', x: worldX, y: worldY }) }
    else if (dragging === 'ae2') { setMatrix(prev => ({ ...prev, b: worldX, d: worldY })); onAction('basis_dragged', { target: 'ae2', x: worldX, y: worldY }) }
  }, [interactive, dragging, onAction, cx, cy, scale, viewSize])

  const gridLines: React.ReactNode[] = []; const txGridLines: React.ReactNode[] = []
  for (let i = -GRID_RANGE; i <= GRID_RANGE; i++) {
    gridLines.push(<line key={`ov${i}`} x1={toSVG({x:i,y:-GRID_RANGE})[0]} y1={toSVG({x:i,y:-GRID_RANGE})[1]} x2={toSVG({x:i,y:GRID_RANGE})[0]} y2={toSVG({x:i,y:GRID_RANGE})[1]} stroke={COL.gridOrig} strokeWidth={1} />)
    gridLines.push(<line key={`oh${i}`} x1={toSVG({x:-GRID_RANGE,y:i})[0]} y1={toSVG({x:-GRID_RANGE,y:i})[1]} x2={toSVG({x:GRID_RANGE,y:i})[0]} y2={toSVG({x:GRID_RANGE,y:i})[1]} stroke={COL.gridOrig} strokeWidth={1} />)
    const isAx = i === 0
    txGridLines.push(<line key={`tv${i}`} x1={txToSVG({x:i,y:-GRID_RANGE})[0]} y1={txToSVG({x:i,y:-GRID_RANGE})[1]} x2={txToSVG({x:i,y:GRID_RANGE})[0]} y2={txToSVG({x:i,y:GRID_RANGE})[1]} stroke={isAx ? COL.gridTxStrong : COL.gridTx} strokeWidth={isAx ? 1.5 : 0.8} />)
    txGridLines.push(<line key={`th${i}`} x1={txToSVG({x:-GRID_RANGE,y:i})[0]} y1={txToSVG({x:-GRID_RANGE,y:i})[1]} x2={txToSVG({x:GRID_RANGE,y:i})[0]} y2={txToSVG({x:GRID_RANGE,y:i})[1]} stroke={isAx ? COL.gridTxStrong : COL.gridTx} strokeWidth={isAx ? 1.5 : 0.8} />)
  }

  const ae1 = transformVec(m, { x: 1, y: 0 }); const ae2 = transformVec(m, { x: 0, y: 1 }); const av = transformVec(m, EXAMPLE_V)
  const [t0x,t0y] = txToSVG({x:0,y:0}); const [t1x,t1y] = txToSVG({x:1,y:0}); const [t2x,t2y] = txToSVG({x:1,y:1}); const [t3x,t3y] = txToSVG({x:0,y:1})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 4 }}>
      <div style={{ display: 'flex', gap: 16, padding: '0 8px', alignItems: 'center' }}>
        <Tex tex={`A = \\begin{bmatrix} ${matrix.a.toFixed(1)} & ${matrix.b.toFixed(1)} \\\\ ${matrix.c.toFixed(1)} & ${matrix.d.toFixed(1)} \\end{bmatrix}`}
          style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <div><span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>det(A)</span>
            <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: '1.2rem', color: d < 0 ? '#4A90D9' : 'var(--text)' }}>{d.toFixed(2)}</div></div>
        </div>
      </div>
      <div style={{ display: 'flex', flex: 1, gap: 8, minHeight: 250 }}>
        <div style={{ width: 140, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', flexShrink: 0, opacity: interactive ? 1 : 0.4 }}>
          {(['a', 'b', 'c', 'd'] as const).map(k => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontStyle: 'italic', fontSize: 10, color: 'var(--text-dim)' }}>{k}</span>
                <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: '0.95rem' }}>{matrix[k].toFixed(1)}</span>
              </div>
              <input type="range" className="la-matrix-slider" min={-3} max={3} step={0.1} value={matrix[k]} disabled={!interactive}
                onChange={e => setField(k, parseFloat(e.target.value))} />
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(176,141,87,0.06)', paddingTop: 6, marginTop: 2 }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: 2 }}>INTERPOLATION</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Tex tex="I" style={{ fontSize: '0.7rem' }} />
              <input type="range" className="la-matrix-slider" min={0} max={1} step={0.01} value={tParam} disabled={!interactive}
                onChange={e => { setTParam(parseFloat(e.target.value)); onAction('interpolation_changed', { t: parseFloat(e.target.value) }) }} style={{ flex: 1 }} />
              <Tex tex="A" style={{ fontSize: '0.7rem' }} />
            </div>
          </div>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <svg viewBox={`0 0 ${viewSize} ${viewSize}`} style={{ width: '100%', height: '100%', cursor: dragging ? 'grabbing' : 'default' }}
            onPointerMove={handleDragMove} onPointerUp={() => setDragging(null)} onPointerLeave={() => setDragging(null)}>
            <defs><radialGradient id="mtGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="rgba(212,168,71,0.05)" /><stop offset="100%" stopColor="rgba(0,0,0,0)" /></radialGradient></defs>
            <rect width={viewSize} height={viewSize} fill="url(#mtGlow)" />
            <g>{gridLines}</g>
            <line x1={toSVG({x:-GRID_RANGE,y:0})[0]} y1={cy} x2={toSVG({x:GRID_RANGE,y:0})[0]} y2={cy} stroke={COL.axis} strokeWidth={1.5} />
            <line x1={cx} y1={toSVG({x:0,y:-GRID_RANGE})[1]} x2={cx} y2={toSVG({x:0,y:GRID_RANGE})[1]} stroke={COL.axis} strokeWidth={1.5} />
            <g>{txGridLines}</g>
            <polygon points={`${t0x},${t0y} ${t1x},${t1y} ${t2x},${t2y} ${t3x},${t3y}`}
              fill={d < 0 ? COL.paraNeg : COL.paraPos} stroke={d < 0 ? COL.paraStrokeNeg : COL.paraStrokePos} strokeWidth={1.5} />
            {Math.abs(d) > 0.05 && <text x={(t0x+t2x)/2} y={(t0y+t2y)/2} fill={d<0?'rgba(74,144,217,0.5)':'rgba(196,154,60,0.5)'} fontSize={13} fontWeight={700} fontFamily='"Playfair Display"' textAnchor="middle" dominantBaseline="middle">{Math.abs(d).toFixed(2)}</text>}
            <Arrow from={[cx,cy]} to={toSVG({x:1,y:0})} color={COL.e1} width={2} />
            <Arrow from={[cx,cy]} to={toSVG({x:0,y:1})} color={COL.e2} width={2} />
            <Arrow from={[cx,cy]} to={txToSVG({x:1,y:0})} color={COL.ae1} width={2.5} />
            <Arrow from={[cx,cy]} to={txToSVG({x:0,y:1})} color={COL.ae2} width={2.5} />
            <Arrow from={[cx,cy]} to={txToSVG(EXAMPLE_V)} color={COL.av} width={2.5} />
            {interactive && <>
              <circle cx={txToSVG({x:1,y:0})[0]} cy={txToSVG({x:1,y:0})[1]} r={9} fill={COL.ae1} fillOpacity={0.18} stroke={COL.ae1} strokeWidth={1.5} cursor="grab" onPointerDown={() => setDragging('ae1')} />
              <circle cx={txToSVG({x:0,y:1})[0]} cy={txToSVG({x:0,y:1})[1]} r={9} fill={COL.ae2} fillOpacity={0.18} stroke={COL.ae2} strokeWidth={1.5} cursor="grab" onPointerDown={() => setDragging('ae2')} />
            </>}
            <text x={toSVG({x:1,y:0})[0]+5} y={toSVG({x:1,y:0})[1]+14} fill={COL.e1} fontSize={10} fontWeight={600} fontFamily="Inter">e₁</text>
            <text x={toSVG({x:0,y:1})[0]-16} y={toSVG({x:0,y:1})[1]-6} fill={COL.e2} fontSize={10} fontWeight={600} fontFamily="Inter">e₂</text>
            <text x={txToSVG({x:1,y:0})[0]+8} y={txToSVG({x:1,y:0})[1]+14} fill={COL.ae1} fontSize={9} fontWeight={600} fontFamily="Inter">Ae₁({ae1.x.toFixed(1)},{ae1.y.toFixed(1)})</text>
            <text x={txToSVG({x:0,y:1})[0]-10} y={txToSVG({x:0,y:1})[1]-10} fill={COL.ae2} fontSize={9} fontWeight={600} fontFamily="Inter">Ae₂({ae2.x.toFixed(1)},{ae2.y.toFixed(1)})</text>
          </svg>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 2, justifyContent: 'center', padding: '2px 0', flexShrink: 0 }}>
        {PRESETS.map(p => (
          <button key={p.key} className={`la-preset-btn ${activePreset === p.key ? 'active' : ''}`}
            onClick={() => applyPreset(p.key, p.matrix)} disabled={!interactive}>{p.label}</button>
        ))}
      </div>
    </div>
  )
}
