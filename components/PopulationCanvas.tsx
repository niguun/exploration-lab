'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import type { BayesResult, LayoutMode, TokenGroup } from '@/lib/bayes'
import { createStableTokens, assignTokenGroups, applyLayout, COLOR_DISEASED, COLOR_HEALTHY } from '@/lib/bayes'

const TOTAL_TOKENS = 500
const BASE_W = 680
const BASE_H = 420
const FIG_BASE_W = 10

const GROUP_INFO: Record<TokenGroup, { label: string; sub: string }> = {
  tp: { label: 'True Positive', sub: 'Has condition, test detected it' },
  fn: { label: 'False Negative', sub: 'Has condition, test missed it' },
  fp: { label: 'False Positive', sub: 'Healthy, but test flagged positive' },
  tn: { label: 'True Negative', sub: 'Healthy, test correctly negative' },
}

interface PopulationCanvasProps {
  result: BayesResult
  layoutMode: LayoutMode
  isDragging: boolean
}

/* ── Reusable silhouette path (head + soft shoulders + tapered torso + subtle leg split) ── */

function buildPersonPath(h: number): Path2D {
  const p = new Path2D()
  const headR = h * 0.14
  const headY = -h * 0.36
  const shoulderY = headY + headR + h * 0.04
  const shoulderW = h * 0.19
  const waistW = h * 0.12
  const hipY = h * 0.24
  const footY = h * 0.42
  const legGap = h * 0.03

  // Head
  p.arc(0, headY, headR, 0, Math.PI * 2)

  // Body
  p.moveTo(-shoulderW, shoulderY)
  p.quadraticCurveTo(-shoulderW - h * 0.02, shoulderY - h * 0.03, 0, shoulderY - h * 0.05)
  p.quadraticCurveTo(shoulderW + h * 0.02, shoulderY - h * 0.03, shoulderW, shoulderY)
  p.lineTo(waistW, hipY)
  // Right leg
  p.quadraticCurveTo(waistW + h * 0.01, footY, legGap, footY)
  p.lineTo(legGap, hipY + h * 0.02)
  // Left leg
  p.lineTo(-legGap, hipY + h * 0.02)
  p.lineTo(-legGap, footY)
  p.quadraticCurveTo(-waistW - h * 0.01, footY, -waistW, hipY)
  p.closePath()

  return p
}

export default function PopulationCanvas({ result, layoutMode, isDragging }: PopulationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tokensRef = useRef(createStableTokens(TOTAL_TOKENS))
  const animRef = useRef<number>(0)
  const sizeRef = useRef({ w: BASE_W, h: BASE_H })
  const initializedRef = useRef(false)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const isDraggingRef = useRef(false)
  const prevModeRef = useRef<LayoutMode>(layoutMode)
  const modeChangeTimeRef = useRef<number>(0)
  const layoutModeRef = useRef<LayoutMode>(layoutMode)
  layoutModeRef.current = layoutMode
  const resultRef = useRef(result)
  resultRef.current = result

  const [hoverGroup, setHoverGroup] = useState<{ group: TokenGroup; count: number; cx: number; cy: number } | null>(null)

  isDraggingRef.current = isDragging

  const retarget = useCallback(() => {
    const { w, h } = sizeRef.current
    const scale = Math.min(w / BASE_W, h / BASE_H)
    const figW = FIG_BASE_W * scale
    const tokens = tokensRef.current

    assignTokenGroups(tokens, result)
    applyLayout(tokens, layoutMode, w, h, figW, 160 * scale)

    if (!initializedRef.current) {
      for (const t of tokens) {
        t.x = t.targetX
        t.y = t.targetY
        t.color = t.targetColor
        t.opacity = t.targetOpacity
        t.scale = t.targetScale
      }
      initializedRef.current = true
    }
  }, [result, layoutMode])

  useEffect(() => {
    if (prevModeRef.current !== layoutMode) {
      modeChangeTimeRef.current = Date.now()
      prevModeRef.current = layoutMode
    }
    retarget()
  }, [retarget, layoutMode])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: (e.clientX - rect.left) * (sizeRef.current.w / rect.width),
        y: (e.clientY - rect.top) * (sizeRef.current.h / rect.height),
      }
    }

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
      setHoverGroup(null)
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const w = Math.floor(rect.width)
      const h = Math.floor(rect.height)
      if (w <= 0 || h <= 0) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      sizeRef.current = { w, h }
      retarget()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(container)

    // Pre-build person path at reference height, then scale via transform
    const personPath = buildPersonPath(100)

    let running = true
    let hoverThrottle = 0

    const draw = () => {
      if (!running) return

      const { w, h } = sizeRef.current
      const dpr = window.devicePixelRatio || 1
      const scale = Math.min(w / BASE_W, h / BASE_H)
      const figH = FIG_BASE_W * scale * 1.8
      const tokens = tokensRef.current
      const dragging = isDraggingRef.current
      const now = Date.now()
      const modeAge = (now - modeChangeTimeRef.current) / 1000
      const lerpBase = dragging ? 0.35 : 0.12

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // Floor glow — warm upward light beneath the crowd
      const floorGrd = ctx.createRadialGradient(w * 0.42, h * 0.85, 0, w * 0.42, h * 0.85, w * 0.55)
      floorGrd.addColorStop(0, 'rgba(196, 154, 60, 0.03)')
      floorGrd.addColorStop(0.5, 'rgba(196, 154, 60, 0.012)')
      floorGrd.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = floorGrd
      ctx.fillRect(0, 0, w, h)

      // Subtle center ambient
      const grd = ctx.createRadialGradient(w * 0.42, h * 0.5, 0, w * 0.42, h * 0.5, w * 0.5)
      grd.addColorStop(0, 'rgba(232, 226, 214, 0.008)')
      grd.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, w, h)

      // Detect hovered group by proximity
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      let closestDist = Infinity
      let closestToken: typeof tokens[0] | null = null

      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i]
        if (t.opacity < 0.1) continue
        const distSq = (t.x - mx) ** 2 + (t.y - my) ** 2
        if (distSq < closestDist) {
          closestDist = distSq
          closestToken = t
        }
      }

      const activeGroup: TokenGroup | null =
        closestToken && closestDist < (30 * scale) ** 2 ? closestToken.group : null

      // Sort by row (back to front) for correct overlap
      const sortedIdx: number[] = []
      for (let i = 0; i < tokens.length; i++) sortedIdx.push(i)
      sortedIdx.sort((a, b) => tokens[a].row - tokens[b].row)

      for (const idx of sortedIdx) {
        const t = tokens[idx]

        const staggerDelay = modeAge < 1.0 && !dragging ? (idx / tokens.length) * 0.3 : 0
        const staggerMul = modeAge < 1.0 && !dragging
          ? Math.max(0, Math.min(1, (modeAge - staggerDelay) / 0.4))
          : 1
        const lerp = lerpBase * (0.5 + staggerMul * 0.5)

        t.x += (t.targetX - t.x) * lerp
        t.y += (t.targetY - t.y) * lerp
        t.opacity += (t.targetOpacity - t.opacity) * (dragging ? 0.4 : lerp)
        t.scale += (t.targetScale - t.scale) * lerp
        t.color = t.targetColor

        if (t.opacity < 0.008) continue

        const isActive = activeGroup !== null && t.group === activeGroup
        const isDimmed = activeGroup !== null && !isActive

        const depthDim = 1.0 - (t.row * 0.025)
        const baseAlpha = t.opacity * depthDim * (isDimmed ? 0.25 : 1)

        const s = (t.scale * figH) / 100

        ctx.save()
        ctx.translate(t.x, t.y)
        ctx.scale(s, s)

        // Vertical lighting gradient per figure
        const bodyGrd = ctx.createLinearGradient(0, -42, 0, 42)
        const baseColor = t.color
        if (isActive) {
          bodyGrd.addColorStop(0, lighten(baseColor, 0.3))
          bodyGrd.addColorStop(0.5, baseColor)
          bodyGrd.addColorStop(1, darken(baseColor, 0.15))
        } else {
          bodyGrd.addColorStop(0, lighten(baseColor, 0.15))
          bodyGrd.addColorStop(0.5, baseColor)
          bodyGrd.addColorStop(1, darken(baseColor, 0.25))
        }

        ctx.globalAlpha = baseAlpha * (isActive ? 1 : 0.85)
        ctx.fillStyle = bodyGrd
        ctx.fill(personPath)

        // Subtle edge highlight on top
        ctx.globalAlpha = baseAlpha * 0.12
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 1.2 / s
        ctx.stroke(personPath)

        ctx.restore()
      }

      ctx.globalAlpha = 1

      // Positive Only canvas annotations
      if (layoutModeRef.current === 'positive_only') {
        let tpMinX = Infinity, tpMaxX = -Infinity, tpMaxY = -Infinity
        let fpMinX = Infinity, fpMaxX = -Infinity, fpMaxY = -Infinity
        let hasTp = false, hasFp = false

        for (const t of tokens) {
          if (!t.testPositive || t.opacity < 0.3) continue
          if (t.isDiseased) {
            hasTp = true
            tpMinX = Math.min(tpMinX, t.x); tpMaxX = Math.max(tpMaxX, t.x); tpMaxY = Math.max(tpMaxY, t.y)
          } else {
            hasFp = true
            fpMinX = Math.min(fpMinX, t.x); fpMaxX = Math.max(fpMaxX, t.x); fpMaxY = Math.max(fpMaxY, t.y)
          }
        }

        if (hasTp && hasFp) {
          const res = resultRef.current
          const fs = Math.round(10 * scale)
          const labelY = Math.max(tpMaxY, fpMaxY) + figH * 0.7

          ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`
          ctx.textAlign = 'center'

          ctx.fillStyle = COLOR_DISEASED
          ctx.globalAlpha = 0.7
          ctx.fillText(`${res.truePositive} true +`, (tpMinX + tpMaxX) / 2, labelY)

          ctx.fillStyle = COLOR_HEALTHY
          ctx.fillText(`${res.falsePositive} false +`, (fpMinX + fpMaxX) / 2, labelY)

          const midX = (tpMaxX + fpMinX) / 2
          ctx.globalAlpha = 1
          ctx.strokeStyle = 'rgba(176, 141, 87, 0.1)'
          ctx.lineWidth = 1
          ctx.setLineDash([3 * scale, 4 * scale])
          ctx.beginPath()
          ctx.moveTo(midX, Math.min(tpMaxY, fpMaxY) - figH)
          ctx.lineTo(midX, labelY + fs)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      // Group hover detection (throttled)
      hoverThrottle++
      if (hoverThrottle % 8 === 0) {
        if (activeGroup && closestToken) {
          const count = tokens.filter(t => t.group === activeGroup && t.opacity > 0.1).length
          let sumX = 0, sumY = 0, n = 0
          for (const t of tokens) {
            if (t.group === activeGroup && t.opacity > 0.1) { sumX += t.x; sumY += t.y; n++ }
          }
          const rect = canvas.getBoundingClientRect()
          setHoverGroup({
            group: activeGroup,
            count,
            cx: (sumX / n) / w * rect.width,
            cy: (Math.min(...tokens.filter(t => t.group === activeGroup && t.opacity > 0.1).map(t => t.y)) - figH) / h * rect.height,
          })
        } else {
          setHoverGroup(null)
        }
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [retarget])

  const isPositiveOnly = layoutMode === 'positive_only'

  return (
    <div ref={containerRef} className="canvas-wrap">
      <canvas ref={canvasRef} style={{ cursor: 'default' }} />
      <CanvasOverlays result={result} layoutMode={layoutMode} />
      {hoverGroup && (
        <div
          style={{
            position: 'absolute',
            left: hoverGroup.cx,
            top: hoverGroup.cy,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 5,
            textAlign: 'center',
          }}
        >
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: hoverGroup.group === 'tp' || hoverGroup.group === 'fn' ? COLOR_DISEASED : COLOR_HEALTHY,
          }}>
            {GROUP_INFO[hoverGroup.group].label}
            <span style={{ color: 'var(--text-dim)', fontWeight: 500, marginLeft: 6 }}>
              {hoverGroup.count * 2} people
            </span>
          </div>
          <div style={{ fontSize: 8.5, color: 'var(--text-dim)', marginTop: 1 }}>
            {GROUP_INFO[hoverGroup.group].sub}
          </div>
          {isPositiveOnly && (hoverGroup.group === 'tp' || hoverGroup.group === 'fp') && (
            <div style={{ fontSize: 8, color: 'var(--gold, #C49A3C)', marginTop: 2, fontWeight: 600 }}>
              {hoverGroup.group === 'tp' ? 'Numerator + denominator' : 'Denominator only'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Color helpers ── */

function parseHex(hex: string): [number, number, number] {
  const c = hex.replace('#', '')
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex)
  const f = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex)
  const f = (c: number) => Math.max(0, Math.round(c * (1 - amount)))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}

/* ── Overlay annotations ── */

function CanvasOverlays({ result, layoutMode }: { result: BayesResult; layoutMode: LayoutMode }) {
  const base: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 2,
    transition: 'opacity 0.3s ease',
  }

  const labelStyle: React.CSSProperties = {
    ...base,
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  }

  if (layoutMode === 'all') {
    return (
      <div style={{ ...base, bottom: 8, right: 14, textAlign: 'right' }}>
        <span style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
          1 figure = 2 people
        </span>
      </div>
    )
  }

  if (layoutMode === 'condition') {
    return (
      <>
        <div style={{ ...labelStyle, top: 6, left: 14, color: 'var(--gold-bright)' }}>
          Diseased <span style={{ fontWeight: 500, color: 'var(--text-dim)', fontSize: 9 }}>{result.diseased}</span>
        </div>
        <div style={{ ...labelStyle, top: 6, right: 14, textAlign: 'right', color: 'var(--dot-healthy)' }}>
          Healthy <span style={{ fontWeight: 500, color: 'var(--text-dim)', fontSize: 9 }}>{result.healthy}</span>
        </div>
      </>
    )
  }

  if (layoutMode === 'test_results') {
    const lbl = (text: string, n: number, color: string, pos: React.CSSProperties) => (
      <div style={{ ...labelStyle, ...pos, color }}>
        {text} <span style={{ fontWeight: 500, color: 'var(--text-dim)', fontSize: 9 }}>{n}</span>
      </div>
    )
    return (
      <>
        {lbl('True +', result.truePositive, 'var(--gold-bright)', { top: 6, left: 14 })}
        {lbl('False +', result.falsePositive, 'var(--dot-healthy)', { top: 6, right: 14, textAlign: 'right' })}
        {lbl('False −', result.falseNegative, 'var(--gold-bright)', { bottom: 6, left: 14 })}
        {lbl('True −', result.trueNegative, 'var(--dot-healthy)', { bottom: 6, right: 14, textAlign: 'right' })}
        <div style={{ ...base, left: '50%', top: 22, bottom: 8, width: 1, background: 'rgba(176,141,87,0.1)' }} />
        <div style={{ ...base, left: 14, top: '50%', right: 14, height: 1, background: 'rgba(176,141,87,0.1)' }} />
      </>
    )
  }

  if (layoutMode === 'positive_only') {
    const pct = result.totalPositive > 0 ? (result.truePositive / result.totalPositive * 100).toFixed(1) : '0'
    return (
      <>
        <div style={{ ...base, top: 6, left: 0, right: 0, textAlign: 'center' }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--text-secondary)',
          }}>
            Positive Tests Only
          </span>
          <span style={{
            fontWeight: 500, color: 'var(--text-dim)', marginLeft: 10,
            fontSize: 10, letterSpacing: '0.04em',
          }}>
            {result.totalPositive} tested positive
          </span>
        </div>
        <div style={{
          ...base, bottom: 6, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 8,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: COLOR_DISEASED }}>
            {result.truePositive}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>of</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim)' }}>
            {result.totalPositive}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>=</span>
          <span style={{
            fontSize: 22, fontWeight: 900, color: 'var(--gold-bright)',
            fontFamily: '"Playfair Display", Georgia, serif', lineHeight: 1,
          }}>
            {pct}%
          </span>
        </div>
      </>
    )
  }

  return null
}
