'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import PhaseNav from '@/components/PhaseNav'
import LeftSidebar from '@/components/LeftSidebar'
import BottomPhaseNav from '@/components/BottomPhaseNav'

function mulberry32(seed: number) {
  let s = seed | 0
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

function normalRng(rng: () => number): number {
  const u1 = rng(); const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2)
}

function createPop(seed: number): number[] {
  const rng = mulberry32(seed); const vals: number[] = []
  for (let i = 0; i < 1000; i++) vals.push(65 + normalRng(rng) * 8)
  return vals
}

function mean(arr: number[]): number { return arr.reduce((a, b) => a + b, 0) / arr.length }

const POP = createPop(42)
const POP_MEAN = mean(POP)

export default function InferencePage() {
  const [sampleSize, setSampleSize] = useState(20)
  const [samples, setSamples] = useState<number[][]>([])
  const [sampleMeans, setSampleMeans] = useState<number[]>([])
  const seedRef = useRef(1)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef({ w: 800, h: 500 })
  const animRef = useRef<number>(0)

  const drawOneSample = useCallback(() => {
    const rng = mulberry32(seedRef.current++)
    const sample = Array.from({ length: sampleSize }, () => POP[Math.floor(rng() * POP.length)])
    setSamples(prev => [...prev.slice(-99), sample])
    setSampleMeans(prev => [...prev.slice(-99), mean(sample)])
  }, [sampleSize])

  const drawManySamples = useCallback(() => {
    const newMeans: number[] = []; const newSamples: number[][] = []
    for (let i = 0; i < 100; i++) {
      const rng = mulberry32(seedRef.current++)
      const sample = Array.from({ length: sampleSize }, () => POP[Math.floor(rng() * POP.length)])
      newSamples.push(sample); newMeans.push(mean(sample))
    }
    setSamples(prev => [...prev, ...newSamples].slice(-100))
    setSampleMeans(prev => [...prev, ...newMeans].slice(-100))
  }, [sampleSize])

  const reset = useCallback(() => { setSamples([]); setSampleMeans([]); seedRef.current = 1 }, [])

  useEffect(() => {
    const canvas = canvasRef.current; const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d'); if (!ctx) return

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
      const { w, h } = sizeRef.current; const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)

      const axisL = w * 0.08; const axisR = w * 0.92; const axisW = axisR - axisL
      const minV = 40; const maxV = 90; const range = maxV - minV
      const toX = (v: number) => axisL + ((v - minV) / range) * axisW

      // Population distribution (top third)
      const popY = h * 0.18; const popH = h * 0.15
      ctx.fillStyle = 'rgba(232,226,214,0.03)'
      const bins = new Array(50).fill(0)
      for (const v of POP) { const b = Math.floor((v - minV) / range * 50); if (b >= 0 && b < 50) bins[b]++ }
      const maxBin = Math.max(...bins)
      for (let i = 0; i < 50; i++) {
        const bh = (bins[i] / maxBin) * popH
        const bx = axisL + (i / 50) * axisW; const bw = axisW / 50
        ctx.fillStyle = 'rgba(232,226,214,0.06)'
        ctx.fillRect(bx, popY + popH - bh, bw - 1, bh)
      }
      ctx.fillStyle = '#5E6A7E'; ctx.font = '700 9px Inter, system-ui, sans-serif'
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
      ctx.fillText('POPULATION (n = 1,000)', axisL, popY - 4)

      // Population mean line
      const muX = toX(POP_MEAN)
      ctx.strokeStyle = 'rgba(196,154,60,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(muX, popY); ctx.lineTo(muX, h * 0.85); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(196,154,60,0.6)'; ctx.font = '600 9px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.fillText(`μ = ${POP_MEAN.toFixed(1)}`, muX, popY - 4)

      // Sample means distribution (bottom half)
      const distY = h * 0.45; const distH = h * 0.35
      if (sampleMeans.length > 0) {
        ctx.fillStyle = '#5E6A7E'; ctx.font = '700 9px Inter, system-ui, sans-serif'
        ctx.textAlign = 'left'; ctx.fillText(`SAMPLING DISTRIBUTION (${sampleMeans.length} sample means, n = ${sampleSize})`, axisL, distY - 6)

        const mBins = new Array(50).fill(0)
        for (const m of sampleMeans) { const b = Math.floor((m - minV) / range * 50); if (b >= 0 && b < 50) mBins[b]++ }
        const mMax = Math.max(...mBins, 1)
        for (let i = 0; i < 50; i++) {
          const bh = (mBins[i] / mMax) * distH
          const bx = axisL + (i / 50) * axisW; const bw = axisW / 50
          ctx.fillStyle = 'rgba(196,154,60,0.2)'
          ctx.fillRect(bx, distY + distH - bh, bw - 1, bh)
        }

        // Individual sample mean dots
        for (let i = 0; i < sampleMeans.length; i++) {
          const mx = toX(sampleMeans[i])
          ctx.fillStyle = i === sampleMeans.length - 1 ? '#D4A847' : 'rgba(196,154,60,0.35)'
          ctx.beginPath(); ctx.arc(mx, distY + distH + 12, i === sampleMeans.length - 1 ? 4 : 2.5, 0, Math.PI * 2); ctx.fill()
        }

        // Latest sample mean label
        const latest = sampleMeans[sampleMeans.length - 1]
        const lx = toX(latest)
        ctx.fillStyle = '#D4A847'; ctx.font = '700 11px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'; ctx.fillText(`x̄ = ${latest.toFixed(1)}`, lx, distY + distH + 30)
      } else {
        ctx.fillStyle = 'rgba(232,226,214,0.15)'; ctx.font = '500 12px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'; ctx.fillText('Draw samples to see the sampling distribution build', w * 0.5, distY + distH * 0.5)
      }

      // Axis
      const axisY = distY + distH + 40
      ctx.strokeStyle = 'rgba(232,226,214,0.15)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(axisL, axisY); ctx.lineTo(axisR, axisY); ctx.stroke()
      for (let v = 40; v <= 90; v += 10) {
        const x = toX(v)
        ctx.strokeStyle = 'rgba(232,226,214,0.08)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x, axisY - 3); ctx.lineTo(x, axisY + 3); ctx.stroke()
        ctx.fillStyle = '#5E6A7E'; ctx.font = '500 9px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(`${v}`, x, axisY + 6)
      }

      animRef.current = requestAnimationFrame(draw)
    }
    animRef.current = requestAnimationFrame(draw)
    return () => { running = false; cancelAnimationFrame(animRef.current); ro.disconnect() }
  }, [sampleMeans, sampleSize])

  return (
    <div className="scene">
      <PhaseNav />
      <LeftSidebar />
      <div className="stage">
        <div className="stage-top">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="breadcrumb">Inference Explorer</div>
              <h1 className="big-question">How much can <span className="hl">one sample</span><br />tell us about a population?</h1>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className="floating-quote">&ldquo;One sample can<br />mislead. Many reveal.&rdquo;</div>
            </div>
          </div>
        </div>
        <div className="stage-center">
          <div className="canvas-area">
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 4, display: 'flex', flexDirection: 'column', gap: 12, width: 150 }}>
              <div>
                <div className="readout-posterior-label">Sample Size</div>
                <div className="readout-big" style={{ fontSize: '1.6rem' }}>n = {sampleSize}</div>
                <input type="range" className="param-slider" min={2} max={200} value={sampleSize}
                  onChange={e => { setSampleSize(parseInt(e.target.value)); reset() }} style={{ marginTop: 4 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--text-dim)' }}>
                  <span>2</span><span>50</span><span>200</span>
                </div>
              </div>
              <button className="advance-btn" onClick={drawOneSample} style={{ pointerEvents: 'auto' }}>Draw 1 Sample</button>
              <button className="advance-btn" onClick={drawManySamples} style={{ pointerEvents: 'auto' }}>Draw 100 Samples</button>
              <button className="advance-btn" onClick={reset} style={{ pointerEvents: 'auto', opacity: 0.5 }}>Reset</button>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 4 }}>
                Samples drawn: <strong style={{ color: 'var(--text-secondary)' }}>{sampleMeans.length}</strong>
              </div>
            </div>
            <div ref={containerRef} className="canvas-wrap">
              <canvas ref={canvasRef} />
            </div>
          </div>
        </div>
        <div className="bottom-strip">
          <div className="bottom-strip-left">
            <span className="result-label">Population</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="result-big">&mu; = {POP_MEAN.toFixed(1)}</span>
              <span className="result-context">true population mean</span>
            </div>
          </div>
          <div className="equation-inline">
            <span className="equation-var" style={{ color: 'var(--text-secondary)' }}>x&#772;</span>
            <span className="equation-eq">&nbsp;=&nbsp;</span>
            <span className="equation-var gold">(1/n) &Sigma; X&#x1D62;</span>
            {sampleMeans.length > 0 && <span className="equation-result">&nbsp;= {sampleMeans[sampleMeans.length - 1].toFixed(1)}</span>}
          </div>
        </div>
      </div>
      <BottomPhaseNav activeIndex={2} />
    </div>
  )
}
