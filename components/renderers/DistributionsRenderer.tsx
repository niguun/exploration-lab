'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { RendererProps } from '@/lib/renderer-registry'
import { expectation, variance, standardDeviation, adjustProbability, lerpDistribution, DIST_PRESETS, DEFAULT_VALUES } from '@/lib/distributions'
import type { DiscreteDistribution } from '@/lib/distributions'

const PRESETS = Object.entries(DIST_PRESETS).map(([key, v]) => ({ key, label: v.label, probs: v.probabilities }))

export default function DistributionsRenderer({ config, onAction, interactive }: RendererProps) {
  const initialProbs = (config.initialProbs as number[] | undefined) ?? PRESETS[0].probs
  const [dist, setDist] = useState<DiscreteDistribution>({ values: DEFAULT_VALUES, probabilities: initialProbs })
  const targetRef = useRef(dist)
  const currentRef = useRef(dist)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef({ w: 800, h: 500 })
  const animRef = useRef(0)
  const draggingRef = useRef<number | null>(null)

  const applyPreset = useCallback((key: string, probs: number[]) => {
    if (!interactive) return
    const next: DiscreteDistribution = { values: DEFAULT_VALUES, probabilities: probs }
    targetRef.current = next; setDist(next)
    onAction('preset_applied', { key })
  }, [interactive, onAction])

  useEffect(() => {
    const canvas = canvasRef.current; const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d'); if (!ctx) return

    const handlePointerMove = (e: PointerEvent) => {
      if (!interactive || draggingRef.current === null) return
      const rect = canvas.getBoundingClientRect()
      const { w, h } = sizeRef.current
      const my = (e.clientY - rect.top) * (h / rect.height)
      const plotTop = h * 0.08; const plotBot = h * 0.62; const maxP = 0.5
      const newP = Math.max(0, Math.min(maxP, (plotBot - my) / (plotBot - plotTop) * maxP))
      const next = adjustProbability(currentRef.current, draggingRef.current, newP)
      targetRef.current = next; currentRef.current = next; setDist(next)
      onAction('bar_drag', { index: draggingRef.current, newProb: newP })
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
      const { w, h } = sizeRef.current; const dpr = window.devicePixelRatio || 1
      if (draggingRef.current === null) currentRef.current = lerpDistribution(currentRef.current, targetRef.current, 0.14)
      const d = currentRef.current
      const mu = expectation(d); const v = variance(d)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)

      const lineY = h * 0.65
      const lineL = w * 0.12; const lineR = w * 0.88; const lineW = lineR - lineL
      const plotTop = h * 0.08; const plotH = lineY - plotTop
      const maxP = 0.5; const massW = lineW / DEFAULT_VALUES.length * 0.3

      const flGrd = ctx.createRadialGradient(w * 0.5, lineY, 0, w * 0.5, lineY, lineW * 0.5)
      flGrd.addColorStop(0, 'rgba(196,154,60,0.025)'); flGrd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = flGrd; ctx.fillRect(0, 0, w, h)

      ctx.strokeStyle = 'rgba(232,226,214,0.2)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(lineL - 10, lineY); ctx.lineTo(lineR + 10, lineY); ctx.stroke()

      for (let i = 0; i < DEFAULT_VALUES.length; i++) {
        const x = lineL + (i / (DEFAULT_VALUES.length - 1)) * lineW
        ctx.strokeStyle = 'rgba(232,226,214,0.12)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x, lineY - 4); ctx.lineTo(x, lineY + 4); ctx.stroke()
        ctx.fillStyle = '#B8A992'; ctx.font = '600 11px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(`${DEFAULT_VALUES[i]}`, x, lineY + 10)
      }

      for (let i = 0; i < DEFAULT_VALUES.length; i++) {
        const prob = d.probabilities[i]; if (prob < 0.001) continue
        const x = lineL + (i / (DEFAULT_VALUES.length - 1)) * lineW
        const barH = (prob / maxP) * plotH; const barTop = lineY - barH; const hw = massW / 2

        ctx.strokeStyle = 'rgba(196,154,60,0.15)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x, lineY); ctx.lineTo(x, barTop + hw * 2); ctx.stroke()

        const gGrd = ctx.createRadialGradient(x, barTop + barH * 0.5, 0, x, barTop + barH * 0.5, massW * 2)
        gGrd.addColorStop(0, `rgba(196,154,60,${prob * 0.3})`); gGrd.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = gGrd; ctx.fillRect(x - massW * 2, barTop, massW * 4, barH)

        const cGrd = ctx.createLinearGradient(x, barTop, x, lineY)
        cGrd.addColorStop(0, 'rgba(212,168,71,0.95)'); cGrd.addColorStop(0.8, 'rgba(196,154,60,0.7)'); cGrd.addColorStop(1, 'rgba(176,134,40,0.4)')
        ctx.fillStyle = cGrd
        const r = Math.min(hw, barH * 0.15)
        ctx.beginPath(); ctx.moveTo(x - hw, lineY); ctx.lineTo(x - hw, barTop + r)
        ctx.quadraticCurveTo(x - hw, barTop, x, barTop); ctx.quadraticCurveTo(x + hw, barTop, x + hw, barTop + r)
        ctx.lineTo(x + hw, lineY); ctx.closePath(); ctx.fill()

        ctx.strokeStyle = 'rgba(232,226,214,0.2)'; ctx.lineWidth = 0.8
        ctx.beginPath(); ctx.moveTo(x - hw, barTop + r); ctx.quadraticCurveTo(x - hw, barTop, x, barTop)
        ctx.quadraticCurveTo(x + hw, barTop, x + hw, barTop + r); ctx.stroke()

        ctx.fillStyle = prob > 0.05 ? 'rgba(232,226,214,0.6)' : 'rgba(232,226,214,0.3)'
        ctx.font = '600 9px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
        ctx.fillText(`${(prob * 100).toFixed(0)}%`, x, barTop - 6)
      }

      const muX = lineL + (mu / (DEFAULT_VALUES.length - 1)) * lineW
      const mGrd = ctx.createRadialGradient(muX, lineY + 20, 0, muX, lineY + 20, 40)
      mGrd.addColorStop(0, 'rgba(212,168,71,0.15)'); mGrd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = mGrd; ctx.fillRect(muX - 50, lineY, 100, 50)

      ctx.fillStyle = '#D4A847'; ctx.beginPath()
      ctx.moveTo(muX, lineY + 4); ctx.lineTo(muX - 8, lineY + 20); ctx.lineTo(muX + 8, lineY + 20); ctx.closePath(); ctx.fill()

      ctx.strokeStyle = 'rgba(212,168,71,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(muX, lineY); ctx.lineTo(muX, plotTop); ctx.stroke(); ctx.setLineDash([])

      ctx.fillStyle = '#D4A847'; ctx.font = '900 16px "Playfair Display", Georgia, serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(`E[X] = ${mu.toFixed(2)}`, muX, lineY + 24)
      ctx.fillStyle = 'rgba(196,154,60,0.45)'; ctx.font = '500 9px Inter, system-ui, sans-serif'
      ctx.fillText('balance point', muX, lineY + 44)

      const sd = Math.sqrt(v)
      const sdL = lineL + (Math.max(0, mu - sd) / (DEFAULT_VALUES.length - 1)) * lineW
      const sdR = lineL + (Math.min(DEFAULT_VALUES.length - 1, mu + sd) / (DEFAULT_VALUES.length - 1)) * lineW
      ctx.strokeStyle = 'rgba(74,144,217,0.25)'; ctx.lineWidth = 1.5
      const bracketY = lineY + 56
      ctx.beginPath(); ctx.moveTo(sdL, bracketY - 3); ctx.lineTo(sdL, bracketY)
      ctx.lineTo(sdR, bracketY); ctx.lineTo(sdR, bracketY - 3); ctx.stroke()
      ctx.fillStyle = 'rgba(74,144,217,0.5)'; ctx.font = '600 9px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.fillText(`σ = ${sd.toFixed(2)}`, (sdL + sdR) / 2, bracketY + 10)

      animRef.current = requestAnimationFrame(draw)
    }
    animRef.current = requestAnimationFrame(draw)
    return () => {
      running = false; cancelAnimationFrame(animRef.current); ro.disconnect()
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp)
    }
  }, [interactive, onAction])

  const mu = expectation(dist); const v = variance(dist)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      <div style={{ display: 'flex', gap: 20, padding: '0 8px' }}>
        <div><span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>E[X]</span>
          <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: '1.4rem', color: 'var(--gold-bright)' }}>{mu.toFixed(2)}</div></div>
        <div><span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Var(X)</span>
          <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 900, fontSize: '1.4rem', color: '#4A90D9' }}>{v.toFixed(2)}</div></div>
      </div>
      <div ref={containerRef} style={{ flex: 1, position: 'relative', minHeight: 200 }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, cursor: interactive ? 'grab' : 'default' }}
          onPointerDown={e => {
            if (!interactive) return
            const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return
            const { w } = sizeRef.current
            const mx = (e.clientX - rect.left) * (w / rect.width)
            const lineL = w * 0.12; const lineR = w * 0.88; const lineW = lineR - lineL
            for (let i = 0; i < DEFAULT_VALUES.length; i++) {
              const x = lineL + (i / (DEFAULT_VALUES.length - 1)) * lineW
              if (Math.abs(mx - x) < lineW / DEFAULT_VALUES.length * 0.5) { draggingRef.current = i; break }
            }
          }} />
      </div>
      <div style={{ display: 'flex', gap: 2, justifyContent: 'center', padding: '4px 0', flexShrink: 0 }}>
        {PRESETS.map(p => (
          <button key={p.key} className="la-preset-btn" onClick={() => applyPreset(p.key, p.probs)}
            style={{ pointerEvents: interactive ? 'auto' : 'none', opacity: interactive ? 1 : 0.5 }}>{p.label}</button>
        ))}
      </div>
    </div>
  )
}
