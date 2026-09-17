export interface Mat2 {
  a: number
  b: number
  c: number
  d: number
}

export interface Vec2 {
  x: number
  y: number
}

export function transformVec(m: Mat2, v: Vec2): Vec2 {
  return {
    x: m.a * v.x + m.b * v.y,
    y: m.c * v.x + m.d * v.y,
  }
}

export function determinant(m: Mat2): number {
  return m.a * m.d - m.b * m.c
}

export function areaScale(m: Mat2): number {
  return Math.abs(determinant(m))
}

export function isOrientationReversed(m: Mat2): boolean {
  return determinant(m) < 0
}

export function isSingular(m: Mat2, epsilon = 1e-10): boolean {
  return Math.abs(determinant(m)) < epsilon
}

export function lerpMat(from: Mat2, to: Mat2, t: number): Mat2 {
  return {
    a: from.a + (to.a - from.a) * t,
    b: from.b + (to.b - from.b) * t,
    c: from.c + (to.c - from.c) * t,
    d: from.d + (to.d - from.d) * t,
  }
}

export function transformedBasis(m: Mat2): { e1: Vec2; e2: Vec2 } {
  return {
    e1: transformVec(m, { x: 1, y: 0 }),
    e2: transformVec(m, { x: 0, y: 1 }),
  }
}

export function generateGridLines(
  range: number,
  step: number,
): { start: Vec2; end: Vec2 }[] {
  const lines: { start: Vec2; end: Vec2 }[] = []
  for (let v = -range; v <= range; v += step) {
    lines.push({ start: { x: v, y: -range }, end: { x: v, y: range } })
    lines.push({ start: { x: -range, y: v }, end: { x: range, y: v } })
  }
  return lines
}

export function transformGridLines(
  lines: { start: Vec2; end: Vec2 }[],
  m: Mat2,
): { start: Vec2; end: Vec2 }[] {
  return lines.map(l => ({
    start: transformVec(m, l.start),
    end: transformVec(m, l.end),
  }))
}

export const PRESETS: Record<string, { matrix: Mat2; label: string }> = {
  identity: { matrix: { a: 1, b: 0, c: 0, d: 1 }, label: 'Identity' },
  rotate: { matrix: { a: 0, b: -1, c: 1, d: 0 }, label: 'Rotate 90°' },
  shear: { matrix: { a: 1, b: 1, c: 0, d: 1 }, label: 'Shear' },
  stretch: { matrix: { a: 2, b: 0, c: 0, d: 0.5 }, label: 'Stretch' },
  reflect: { matrix: { a: 1, b: 0, c: 0, d: -1 }, label: 'Reflect' },
  collapse: { matrix: { a: 1, b: 2, c: 0.5, d: 1 }, label: 'Collapse' },
}

// ── Basis ──

export function basisCoords(b1: Vec2, b2: Vec2, v: Vec2): { alpha: number; beta: number } | null {
  const d = b1.x * b2.y - b1.y * b2.x
  if (Math.abs(d) < 1e-10) return null
  return {
    alpha: (v.x * b2.y - v.y * b2.x) / d,
    beta: (b1.x * v.y - b1.y * v.x) / d,
  }
}

export function areDependentVecs(a: Vec2, b: Vec2, epsilon = 1e-6): boolean {
  return Math.abs(a.x * b.y - a.y * b.x) < epsilon
}

// ── Eigenvectors ──

export interface EigenResult {
  lambda1: number
  lambda2: number
  v1: Vec2 | null
  v2: Vec2 | null
  isComplex: boolean
}

function normalize2(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y)
  if (len < 1e-10) return { x: 1, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

export function eigenvalues(m: Mat2): EigenResult {
  const trace = m.a + m.d
  const det = m.a * m.d - m.b * m.c
  const disc = trace * trace - 4 * det

  if (disc < -1e-10) {
    return { lambda1: trace / 2, lambda2: trace / 2, v1: null, v2: null, isComplex: true }
  }

  const sqrtDisc = Math.sqrt(Math.max(0, disc))
  const l1 = (trace + sqrtDisc) / 2
  const l2 = (trace - sqrtDisc) / 2

  function eigenvec(lambda: number): Vec2 {
    const r1x = m.a - lambda, r1y = m.b
    const r2x = m.c, r2y = m.d - lambda
    if (Math.abs(r1x) > Math.abs(r2y)) {
      if (Math.abs(r1x) < 1e-10 && Math.abs(r1y) < 1e-10) return { x: 1, y: 0 }
      if (Math.abs(r1y) > 1e-10) return normalize2({ x: 1, y: -r1x / r1y })
      return { x: 0, y: 1 }
    } else {
      if (Math.abs(r2x) < 1e-10 && Math.abs(r2y) < 1e-10) return { x: 1, y: 0 }
      if (Math.abs(r2y) > 1e-10) return normalize2({ x: 1, y: -r2x / r2y })
      return { x: 0, y: 1 }
    }
  }

  return {
    lambda1: l1,
    lambda2: l2,
    v1: eigenvec(l1),
    v2: Math.abs(l1 - l2) > 1e-10 ? eigenvec(l2) : eigenvec(l1),
    isComplex: false,
  }
}

export function isEigenvectorDirection(m: Mat2, v: Vec2, epsilon = 0.02): { isEigen: boolean; lambda: number } {
  const av = transformVec(m, v)
  const vLen = Math.sqrt(v.x * v.x + v.y * v.y)
  const avLen = Math.sqrt(av.x * av.x + av.y * av.y)
  if (vLen < 1e-10) return { isEigen: false, lambda: 0 }
  const cross = v.x * av.y - v.y * av.x
  const sinAngle = Math.abs(cross) / (vLen * avLen + 1e-10)
  const lambda = (Math.abs(v.x) > Math.abs(v.y)) ? av.x / v.x : av.y / v.y
  return { isEigen: sinAngle < epsilon, lambda }
}

// ── Projections ──

export function dotProduct(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y
}

export function vecLength(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

export function scaleVec(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s }
}

export function addVec(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function subVec(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function projectOnto(u: Vec2, v: Vec2): Vec2 {
  const vv = dotProduct(v, v)
  if (vv < 1e-10) return { x: 0, y: 0 }
  const scalar = dotProduct(v, u) / vv
  return scaleVec(v, scalar)
}

export function projectionCoefficient(u: Vec2, v: Vec2): number {
  const vv = dotProduct(v, v)
  if (vv < 1e-10) return 0
  return dotProduct(v, u) / vv
}
