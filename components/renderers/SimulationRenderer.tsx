'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { RendererProps } from '@/lib/renderer-registry'

function mulberry32(seed: number) {
  let s = seed | 0
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

export default function SimulationRenderer({ config, onAction, interactive }: RendererProps) {
  const initialP = (config.initialProbability as number | undefined) ?? 0.3
  const [trueP, setTrueP] = useState(initialP)
  const [trials, setTrials] = useState(0)
  const [successes, setSuccesses] = useState(0)
  const [history, setHistory] = useState<number[]>([])
  const seedRef = useRef(1)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef({ w: 800, h: 500 })
  const animRef = useRef(0)

  const proportion = trials > 0 ? successes / trials : 0

  const runBatch = useCallback((count: number) => {
    if (!interactive) return
    const rng = mulberry32(seedRef.current++)
    let s = successes; let t = trials; const newHist = [...history]
    for (let i = 0; i < count; i++) {
      t++; if (rng() < trueP) s++
      if (count <= 200 || i % Math.ceil(count / 200) === 0 || i === count - 1) newHist.push(s / t)
    }
    setTrials(t); setSuccesses(s); setHistory(newHist)
    onAction('trials_run', { count, total: t, proportion: t > 0 ? s / t : 0 })
  }, [interactive, trueP, trials, successes, history, onAction])

  const reset = useCallback(() => {
    if (!interactive) return
    setTrials(0); setSuccesses(0); setHistory([]); seedRef.current = 1
    onAction('reset', {})
  }, [interactive, onAction])

  const handleProbChange = useCallback((newP: number) => {
    if (!interactive) return
    setTrueP(newP); setTrials(0); setSuccesses(0); setHistory([]); seedRef.current = 1
    onAction('probability_changed', { value: newP })
  }, [interactive, onAction])

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

      const padL = 60; const padR = 30; const padT = 30; const padB = 40
      const plotW = w - padL - padR; const plotH = h - padT - padB

      const grd = ctx.createRadialGradient(padL + plotW * 0.5, padT + plotH * 0.5, 0, padL + plotW * 0.5, padT + plotH * 0.5, plotW * 0.5)
      grd.addColorStop(0, 'rgba(196,154,60,0.015)'); grd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h)

      const toY = (p: number) => padT + plotH * (1 - p)
      for (let p = 0; p <= 1; p += 0.1) {
        const y = toY(p)
        ctx.strokeStyle = 'rgba(232,226,214,0.06)'; ctx.lineWidth = 0.5
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke()
        ctx.fillStyle = '#6B5F52'; ctx.font = '500 9px Inter, system-ui, sans-serif'
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(`${(p * 100).toFixed(0)}%`, padL - 8, y)
      }

      const pY = toY(trueP)
      ctx.strokeStyle = 'rgba(196,154,60,0.35)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(padL, pY); ctx.lineTo(padL + plotW, pY); ctx.stroke()
      ctx.fillStyle = 'rgba(196,154,60,0.6)'; ctx.font = '600 10px Inter, system-ui, sans-serif'
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
      ctx.fillText(`p = ${(trueP * 100).toFixed(0)}% (true probability)`, padL + 6, pY - 5)

      if (history.length > 1) {
        ctx.beginPath()
        for (let i = 0; i < history.length; i++) {
          const x = padL + (i / (history.length - 1)) * plotW; const y = toY(history[i])
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = '#D4A847'; ctx.lineWidth = 2; ctx.stroke()

        ctx.beginPath()
        for (let i = 0; i < history.length; i++) {
          const x = padL + (i / (history.length - 1)) * plotW; const y = toY(history[i])
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = 'rgba(212,168,71,0.15)'; ctx.lineWidth = 6; ctx.stroke()

        const lastX = padL + plotW; const lastY = toY(history[history.length - 1])
        ctx.fillStyle = '#D4A847'; ctx.beginPath(); ctx.arc(lastX, lastY, 5, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(212,168,71,0.2)'; ctx.beginPath(); ctx.arc(lastX, lastY, 12, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#D4A847'; ctx.font = '700 12px Inter, system-ui, sans-serif'
        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'
        ctx.fillText(`p̂ = ${(history[history.length - 1] * 100).toFixed(1)}%`, lastX - 2, lastY - 10)
      } else if (history.length === 0) {
        ctx.fillStyle = 'rgba(232,226,214,0.15)'; ctx.font = '500 12px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('Run trials to watch randomness become predictable', padL + plotW / 2, padT + plotH / 2)
      }

      ctx.fillStyle = '#6B5F52'; ctx.font = '500 9px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      ctx.fillText(`trials: ${trials.toLocaleString()}`, padL + plotW / 2, padT + plotH + 10)

      if (trials > 500) {
        ctx.fillStyle = 'rgba(196,154,60,0.3)'; ctx.font = '500 9px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('random individual outcomes · predictable long-run behavior', padL + plotW / 2, padT + plotH + 24)
      }

      animRef.current = requestAnimationFrame(draw)
    }
    animRef.current = requestAnimationFrame(draw)
    return () => { running = false; cancelAnimationFrame(animRef.current); ro.disconnect() }
  }, [history, trueP, trials])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', padding: '0 8px' }}>
        <div><span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Trials</span>
          <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: '1.3rem' }}>{trials.toLocaleString()}</div></div>
        <div><span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Proportion</span>
          <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: '1.3rem', color: 'var(--gold-bright)' }}>{trials > 0 ? `${(proportion * 100).toFixed(1)}%` : '—'}</div></div>
      </div>
      <div style={{ display: 'flex', flex: 1, gap: 8, minHeight: 200 }}>
        <div style={{ width: 140, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center', flexShrink: 0, opacity: interactive ? 1 : 0.4 }}>
          <div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>True Probability</div>
            <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: '1.1rem', color: 'var(--gold-bright)' }}>{(trueP * 100).toFixed(0)}%</div>
            <input type="range" className="la-matrix-slider" min={5} max={95} value={trueP * 100} disabled={!interactive}
              onChange={e => handleProbChange(parseInt(e.target.value) / 100)} style={{ marginTop: 4 }} />
          </div>
          <button className="la-preset-btn" onClick={() => runBatch(1)} disabled={!interactive}>+1 Trial</button>
          <button className="la-preset-btn" onClick={() => runBatch(10)} disabled={!interactive}>+10 Trials</button>
          <button className="la-preset-btn" onClick={() => runBatch(100)} disabled={!interactive}>+100 Trials</button>
          <button className="la-preset-btn active" onClick={() => runBatch(10000)} disabled={!interactive}>Run 10,000</button>
          <button className="la-preset-btn" onClick={reset} disabled={!interactive} style={{ opacity: 0.5 }}>Reset</button>
        </div>
        <div ref={containerRef} style={{ flex: 1, position: 'relative' }}>
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
        </div>
      </div>
    </div>
  )
}
