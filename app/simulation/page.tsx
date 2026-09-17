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

export default function SimulationPage() {
  const [trueP, setTrueP] = useState(0.30)
  const [trials, setTrials] = useState(0)
  const [successes, setSuccesses] = useState(0)
  const [history, setHistory] = useState<number[]>([])
  const seedRef = useRef(1)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef({ w: 800, h: 500 })
  const runningAnimRef = useRef<number>(0)

  const proportion = trials > 0 ? successes / trials : 0

  const runBatch = useCallback((count: number) => {
    const rng = mulberry32(seedRef.current++)
    let s = successes; let t = trials; const newHist = [...history]
    for (let i = 0; i < count; i++) {
      t++; if (rng() < trueP) s++
      if (count <= 200 || i % Math.ceil(count / 200) === 0 || i === count - 1) newHist.push(s / t)
    }
    setTrials(t); setSuccesses(s); setHistory(newHist)
  }, [trueP, trials, successes, history])

  const reset = useCallback(() => {
    setTrials(0); setSuccesses(0); setHistory([]); seedRef.current = 1
  }, [])

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

      const padL = 60; const padR = 30; const padT = 40; const padB = 50
      const plotW = w - padL - padR; const plotH = h - padT - padB

      // Ambient glow
      const grd = ctx.createRadialGradient(padL + plotW * 0.5, padT + plotH * 0.5, 0, padL + plotW * 0.5, padT + plotH * 0.5, plotW * 0.5)
      grd.addColorStop(0, 'rgba(196,154,60,0.015)'); grd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h)

      // Y axis (0 to 1)
      const toY = (p: number) => padT + plotH * (1 - p)
      for (let p = 0; p <= 1; p += 0.1) {
        const y = toY(p)
        ctx.strokeStyle = 'rgba(232,226,214,0.06)'; ctx.lineWidth = 0.5
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke()
        ctx.fillStyle = '#5E6A7E'; ctx.font = '500 9px Inter, system-ui, sans-serif'
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(`${(p * 100).toFixed(0)}%`, padL - 8, y)
      }

      // True probability reference line
      const pY = toY(trueP)
      ctx.strokeStyle = 'rgba(196,154,60,0.35)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(padL, pY); ctx.lineTo(padL + plotW, pY); ctx.stroke()
      ctx.fillStyle = 'rgba(196,154,60,0.6)'; ctx.font = '600 10px Inter, system-ui, sans-serif'
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
      ctx.fillText(`p = ${(trueP * 100).toFixed(0)}% (true probability)`, padL + 6, pY - 5)

      // Running proportion trajectory
      if (history.length > 1) {
        ctx.beginPath()
        for (let i = 0; i < history.length; i++) {
          const x = padL + (i / (history.length - 1)) * plotW
          const y = toY(history[i])
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = '#D4A847'; ctx.lineWidth = 2; ctx.stroke()

        // Glow trail
        ctx.beginPath()
        for (let i = 0; i < history.length; i++) {
          const x = padL + (i / (history.length - 1)) * plotW
          const y = toY(history[i])
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = 'rgba(212,168,71,0.15)'; ctx.lineWidth = 6; ctx.stroke()

        // Current position dot
        const lastX = padL + plotW; const lastY = toY(history[history.length - 1])
        ctx.fillStyle = '#D4A847'; ctx.beginPath(); ctx.arc(lastX, lastY, 5, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(212,168,71,0.2)'; ctx.beginPath(); ctx.arc(lastX, lastY, 12, 0, Math.PI * 2); ctx.fill()

        // Label
        ctx.fillStyle = '#D4A847'; ctx.font = '700 12px Inter, system-ui, sans-serif'
        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'
        ctx.fillText(`p̂ = ${(history[history.length - 1] * 100).toFixed(1)}%`, lastX - 2, lastY - 10)
      } else if (history.length === 0) {
        ctx.fillStyle = 'rgba(232,226,214,0.15)'; ctx.font = '500 12px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('Run trials to watch randomness become predictable', padL + plotW / 2, padT + plotH / 2)
      }

      // X axis label
      ctx.fillStyle = '#5E6A7E'; ctx.font = '500 9px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      ctx.fillText(`trials: ${trials.toLocaleString()}`, padL + plotW / 2, padT + plotH + 10)

      // Convergence annotation
      if (trials > 500) {
        ctx.fillStyle = 'rgba(196,154,60,0.3)'; ctx.font = '500 9px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('random individual outcomes · predictable long-run behavior', padL + plotW / 2, padT + plotH + 28)
      }

      runningAnimRef.current = requestAnimationFrame(draw)
    }
    runningAnimRef.current = requestAnimationFrame(draw)
    return () => { running = false; cancelAnimationFrame(runningAnimRef.current); ro.disconnect() }
  }, [history, trueP, trials])

  return (
    <div className="scene">
      <PhaseNav />
      <LeftSidebar />
      <div className="stage">
        <div className="stage-top">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="breadcrumb">Simulation Explorer</div>
              <h1 className="big-question">When does <span className="hl">randomness</span><br />become predictable?</h1>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className="floating-quote">&ldquo;Chance favors<br />the patient observer.&rdquo;</div>
              <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                <div><div className="readout-posterior-label">Trials</div><div className="readout-big" style={{ fontSize: '1.6rem' }}>{trials.toLocaleString()}</div></div>
                <div><div className="readout-posterior-label">p&#770;</div><div className="readout-big" style={{ fontSize: '1.6rem', color: 'var(--gold-bright)' }}>{trials > 0 ? `${(proportion * 100).toFixed(1)}%` : '—'}</div></div>
              </div>
            </div>
          </div>
        </div>
        <div className="stage-center">
          <div className="canvas-area">
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 4, display: 'flex', flexDirection: 'column', gap: 12, width: 150 }}>
              <div>
                <div className="readout-posterior-label">True Probability</div>
                <div className="readout-big" style={{ fontSize: '1.4rem', color: 'var(--gold-bright)' }}>{(trueP * 100).toFixed(0)}%</div>
                <input type="range" className="param-slider" min={5} max={95} value={trueP * 100}
                  onChange={e => { setTrueP(parseInt(e.target.value) / 100); reset() }} style={{ marginTop: 4 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--text-dim)' }}>
                  <span>5%</span><span>50%</span><span>95%</span>
                </div>
              </div>
              <button className="advance-btn" onClick={() => runBatch(1)} style={{ pointerEvents: 'auto' }}>+1 Trial</button>
              <button className="advance-btn" onClick={() => runBatch(10)} style={{ pointerEvents: 'auto' }}>+10 Trials</button>
              <button className="advance-btn" onClick={() => runBatch(100)} style={{ pointerEvents: 'auto' }}>+100 Trials</button>
              <button className="advance-btn" onClick={() => runBatch(10000)} style={{ pointerEvents: 'auto', color: 'var(--gold)' }}>Run 10,000</button>
              <button className="advance-btn" onClick={reset} style={{ pointerEvents: 'auto', opacity: 0.5 }}>Reset</button>
            </div>
            <div ref={containerRef} className="canvas-wrap">
              <canvas ref={canvasRef} />
            </div>
          </div>
        </div>
        <div className="bottom-strip">
          <div className="bottom-strip-left">
            <span className="result-label">Law of Large Numbers</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="result-big">{trials > 0 ? `${(proportion * 100).toFixed(1)}%` : '—'}</span>
              <span className="result-context">running proportion &rarr; {(trueP * 100).toFixed(0)}% true probability</span>
            </div>
          </div>
          <div className="equation-inline">
            <span className="equation-var" style={{ color: 'var(--text-secondary)' }}>p&#770;<sub>n</sub></span>
            <span className="equation-eq">&nbsp;=&nbsp;</span>
            <span className="equation-var gold">(1/n) &Sigma; X&#x1D62;</span>
            <span className="equation-eq">&nbsp;&xrarr;&nbsp;</span>
            <span className="equation-var gold">p</span>
          </div>
        </div>
      </div>
      <BottomPhaseNav activeIndex={3} />
    </div>
  )
}
