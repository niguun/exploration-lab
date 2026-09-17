'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import PhaseNav from '@/components/PhaseNav'
import LeftSidebar from '@/components/LeftSidebar'
import BottomPhaseNav from '@/components/BottomPhaseNav'

interface Dist { values: number[]; probs: number[] }

function expectation(d: Dist): number {
  let s = 0; for (let i = 0; i < d.values.length; i++) s += d.values[i] * d.probs[i]; return s
}
function variance(d: Dist): number {
  const mu = expectation(d); let s = 0
  for (let i = 0; i < d.values.length; i++) s += d.probs[i] * (d.values[i] - mu) ** 2; return s
}
function adjustProb(d: Dist, idx: number, newP: number): Dist {
  const clamped = Math.max(0, Math.min(0.95, newP))
  const remaining = 1 - clamped
  const others = d.probs.reduce((s, p, i) => i === idx ? s : s + p, 0)
  const probs = d.probs.map((p, i) => i === idx ? clamped : others > 0 ? p * (remaining / others) : remaining / (d.probs.length - 1))
  return { values: d.values, probs }
}
function lerpDist(a: Dist, b: Dist, t: number): Dist {
  const probs = a.probs.map((p, i) => p + (b.probs[i] - p) * t)
  const sum = probs.reduce((a, b) => a + b, 0)
  return { values: a.values, probs: probs.map(p => Math.max(0, p / sum)) }
}

const VALUES = [0, 1, 2, 3, 4, 5, 6]
const PRESETS: { key: string; label: string; probs: number[] }[] = [
  { key: 'centered', label: 'Centered', probs: [0.05, 0.1, 0.2, 0.3, 0.2, 0.1, 0.05] },
  { key: 'left', label: 'Left-Skewed', probs: [0.02, 0.03, 0.05, 0.1, 0.2, 0.3, 0.3] },
  { key: 'right', label: 'Right-Skewed', probs: [0.3, 0.3, 0.2, 0.1, 0.05, 0.03, 0.02] },
  { key: 'bimodal', label: 'Bimodal', probs: [0.25, 0.15, 0.03, 0.04, 0.03, 0.15, 0.35] },
  { key: 'spread', label: 'Same Mean · More Spread', probs: [0.3, 0, 0, 0.4, 0, 0, 0.3] },
]

export default function DistributionsPage() {
  const [dist, setDist] = useState<Dist>({ values: VALUES, probs: PRESETS[0].probs })
  const targetRef = useRef<Dist>(dist)
  const currentRef = useRef<Dist>(dist)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef({ w: 800, h: 500 })
  const animRef = useRef<number>(0)
  const draggingRef = useRef<number | null>(null)

  const applyPreset = useCallback((probs: number[]) => {
    const next = { values: VALUES, probs }
    targetRef.current = next
    setDist(next)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const { w, h } = sizeRef.current
      const my = (e.clientY - rect.top) * (h / rect.height)
      if (draggingRef.current !== null) {
        const plotTop = h * 0.08; const plotBot = h * 0.62; const maxP = 0.5
        const newP = Math.max(0, Math.min(maxP, (plotBot - my) / (plotBot - plotTop) * maxP))
        const next = adjustProb(currentRef.current, draggingRef.current, newP)
        targetRef.current = next; currentRef.current = next; setDist(next)
      }
    }
    const handlePointerUp = () => { draggingRef.current = null }
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerUp)

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const w = Math.floor(rect.width); const h = Math.floor(rect.height)
      if (w <= 0 || h <= 0) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr; canvas.height = h * dpr
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`
      sizeRef.current = { w, h }
    }
    const ro = new ResizeObserver(resize); ro.observe(container)

    let running = true
    const draw = () => {
      if (!running) return
      const { w, h } = sizeRef.current
      const dpr = window.devicePixelRatio || 1
      if (draggingRef.current === null) currentRef.current = lerpDist(currentRef.current, targetRef.current, 0.14)
      const d = currentRef.current
      const mu = expectation(d); const v = variance(d)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)

      // Layout: number line across center, masses above
      const lineY = h * 0.65
      const lineL = w * 0.12; const lineR = w * 0.88
      const lineW = lineR - lineL
      const plotTop = h * 0.08; const plotH = lineY - plotTop
      const maxP = 0.5
      const massW = lineW / VALUES.length * 0.3

      // Ambient glow under number line
      const flGrd = ctx.createRadialGradient(w * 0.5, lineY, 0, w * 0.5, lineY, lineW * 0.5)
      flGrd.addColorStop(0, 'rgba(196,154,60,0.025)'); flGrd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = flGrd; ctx.fillRect(0, 0, w, h)

      // Number line
      ctx.strokeStyle = 'rgba(232,226,214,0.2)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(lineL - 10, lineY); ctx.lineTo(lineR + 10, lineY); ctx.stroke()

      // Tick marks and labels
      for (let i = 0; i < VALUES.length; i++) {
        const x = lineL + (i / (VALUES.length - 1)) * lineW
        ctx.strokeStyle = 'rgba(232,226,214,0.12)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x, lineY - 4); ctx.lineTo(x, lineY + 4); ctx.stroke()
        ctx.fillStyle = '#9AA3B5'; ctx.font = '600 11px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(`${VALUES[i]}`, x, lineY + 10)
      }

      // Probability masses — narrow luminous columns with stems
      for (let i = 0; i < VALUES.length; i++) {
        const prob = d.probs[i]; if (prob < 0.001) continue
        const x = lineL + (i / (VALUES.length - 1)) * lineW
        const barH = (prob / maxP) * plotH
        const barTop = lineY - barH
        const hw = massW / 2

        // Stem line
        ctx.strokeStyle = 'rgba(196,154,60,0.15)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x, lineY); ctx.lineTo(x, barTop + hw * 2); ctx.stroke()

        // Glow
        const gGrd = ctx.createRadialGradient(x, barTop + barH * 0.5, 0, x, barTop + barH * 0.5, massW * 2)
        gGrd.addColorStop(0, `rgba(196,154,60,${prob * 0.3})`); gGrd.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = gGrd; ctx.fillRect(x - massW * 2, barTop, massW * 4, barH)

        // Column body
        const cGrd = ctx.createLinearGradient(x, barTop, x, lineY)
        cGrd.addColorStop(0, 'rgba(212,168,71,0.95)'); cGrd.addColorStop(0.8, 'rgba(196,154,60,0.7)')
        cGrd.addColorStop(1, 'rgba(176,134,40,0.4)')
        ctx.fillStyle = cGrd
        ctx.beginPath()
        const r = Math.min(hw, barH * 0.15)
        ctx.moveTo(x - hw, lineY)
        ctx.lineTo(x - hw, barTop + r)
        ctx.quadraticCurveTo(x - hw, barTop, x, barTop)
        ctx.quadraticCurveTo(x + hw, barTop, x + hw, barTop + r)
        ctx.lineTo(x + hw, lineY)
        ctx.closePath(); ctx.fill()

        // Edge highlight
        ctx.strokeStyle = 'rgba(232,226,214,0.2)'; ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(x - hw, barTop + r)
        ctx.quadraticCurveTo(x - hw, barTop, x, barTop)
        ctx.quadraticCurveTo(x + hw, barTop, x + hw, barTop + r)
        ctx.stroke()

        // Probability label
        ctx.fillStyle = prob > 0.05 ? 'rgba(232,226,214,0.6)' : 'rgba(232,226,214,0.3)'
        ctx.font = '600 9px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
        ctx.fillText(`${(prob * 100).toFixed(0)}%`, x, barTop - 6)
      }

      // Expected value fulcrum
      const muX = lineL + (mu / (VALUES.length - 1)) * lineW

      // Fulcrum glow
      const mGrd = ctx.createRadialGradient(muX, lineY + 20, 0, muX, lineY + 20, 40)
      mGrd.addColorStop(0, 'rgba(212,168,71,0.15)'); mGrd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = mGrd; ctx.fillRect(muX - 50, lineY, 100, 50)

      // Fulcrum triangle
      ctx.fillStyle = '#D4A847'
      ctx.beginPath()
      ctx.moveTo(muX, lineY + 4); ctx.lineTo(muX - 8, lineY + 20); ctx.lineTo(muX + 8, lineY + 20)
      ctx.closePath(); ctx.fill()

      // Dashed line up from fulcrum
      ctx.strokeStyle = 'rgba(212,168,71,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(muX, lineY); ctx.lineTo(muX, plotTop); ctx.stroke()
      ctx.setLineDash([])

      // E[X] label
      ctx.fillStyle = '#D4A847'; ctx.font = '900 16px "Playfair Display", Georgia, serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      ctx.fillText(`E[X] = ${mu.toFixed(2)}`, muX, lineY + 24)
      ctx.fillStyle = 'rgba(196,154,60,0.45)'; ctx.font = '500 9px Inter, system-ui, sans-serif'
      ctx.fillText('balance point', muX, lineY + 44)

      // Variance bracket (show spread around mean)
      const sd = Math.sqrt(v)
      const sdL = lineL + (Math.max(0, mu - sd) / (VALUES.length - 1)) * lineW
      const sdR = lineL + (Math.min(VALUES.length - 1, mu + sd) / (VALUES.length - 1)) * lineW
      ctx.strokeStyle = 'rgba(74,144,217,0.25)'; ctx.lineWidth = 1.5
      const bracketY = lineY + 56
      ctx.beginPath(); ctx.moveTo(sdL, bracketY - 3); ctx.lineTo(sdL, bracketY)
      ctx.lineTo(sdR, bracketY); ctx.lineTo(sdR, bracketY - 3); ctx.stroke()
      ctx.fillStyle = 'rgba(74,144,217,0.5)'; ctx.font = '600 9px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.fillText(`σ = ${sd.toFixed(2)}`, (sdL + sdR) / 2, bracketY + 10)

      animRef.current = requestAnimationFrame(draw)
    }
    animRef.current = requestAnimationFrame(draw)
    return () => { running = false; cancelAnimationFrame(animRef.current); ro.disconnect()
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp) }
  }, [])

  const mu = expectation(dist); const v = variance(dist)

  return (
    <div className="scene">
      <PhaseNav />
      <LeftSidebar />
      <div className="stage">
        <div className="stage-top">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="breadcrumb">Distributions Explorer</div>
              <h1 className="big-question">Where does the <span className="hl">expected value</span><br />actually live?</h1>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className="floating-quote">&ldquo;The mean is a<br />balance point.&rdquo;</div>
              <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
                <div><div className="readout-posterior-label">E[X]</div><div className="readout-big" style={{ fontSize: '1.8rem', color: 'var(--gold-bright)' }}>{mu.toFixed(2)}</div></div>
                <div><div className="readout-posterior-label">Var(X)</div><div className="readout-big" style={{ fontSize: '1.8rem', color: '#4A90D9' }}>{v.toFixed(2)}</div></div>
              </div>
            </div>
          </div>
        </div>
        <div className="stage-center">
          <div className="canvas-area">
            <div ref={containerRef} className="canvas-wrap">
              <canvas ref={canvasRef} style={{ cursor: draggingRef.current !== null ? 'grabbing' : 'grab' }}
                onPointerDown={e => {
                  const rect = canvasRef.current?.getBoundingClientRect()
                  if (!rect) return
                  const { w } = sizeRef.current
                  const mx = (e.clientX - rect.left) * (w / rect.width)
                  const lineL = w * 0.12; const lineR = w * 0.88; const lineW = lineR - lineL
                  for (let i = 0; i < VALUES.length; i++) {
                    const x = lineL + (i / (VALUES.length - 1)) * lineW
                    if (Math.abs(mx - x) < lineW / VALUES.length * 0.5) { draggingRef.current = i; break }
                  }
                }}
              />
            </div>
            <div className="dist-presets">
              {PRESETS.map(p => (
                <button key={p.key} className="dist-preset-btn" onClick={() => applyPreset(p.probs)}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="bottom-strip">
          <div className="bottom-strip-left">
            <span className="result-label">Distribution</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="result-big">{mu.toFixed(2)}</span>
              <span className="result-context">expected value &middot; variance {v.toFixed(2)}</span>
            </div>
          </div>
          <div className="equation-inline">
            <span className="equation-var" style={{ color: 'var(--text-secondary)' }}>E[X]</span>
            <span className="equation-eq">&nbsp;=&nbsp;</span>
            <span className="equation-var gold">&Sigma; x &middot; p(x)</span>
            <span className="equation-result">&nbsp;= {mu.toFixed(2)}</span>
          </div>
        </div>
      </div>
      <BottomPhaseNav activeIndex={1} />
    </div>
  )
}
