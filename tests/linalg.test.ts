import { describe, it, expect } from 'vitest'
import {
  transformVec,
  determinant,
  areaScale,
  isOrientationReversed,
  isSingular,
  lerpMat,
  transformedBasis,
  generateGridLines,
  transformGridLines,
  PRESETS,
  basisCoords,
  areDependentVecs,
  eigenvalues,
  isEigenvectorDirection,
  projectOnto,
  subVec,
  dotProduct,
  projectionCoefficient,
  type Mat2,
} from '../lib/linalg'

const IDENTITY: Mat2 = { a: 1, b: 0, c: 0, d: 1 }

describe('transformVec', () => {
  it('identity leaves vector unchanged', () => {
    const v = { x: 3, y: -7 }
    expect(transformVec(IDENTITY, v)).toEqual(v)
  })

  it('transforms arbitrary vector correctly', () => {
    const m: Mat2 = { a: 2, b: 1, c: 3, d: 4 }
    const result = transformVec(m, { x: 1, y: 1 })
    expect(result).toEqual({ x: 3, y: 7 })
  })

  it('transforms zero vector to zero', () => {
    const m: Mat2 = { a: 5, b: 3, c: 2, d: 9 }
    expect(transformVec(m, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
  })
})

describe('transformedBasis', () => {
  it('identity returns standard basis', () => {
    const { e1, e2 } = transformedBasis(IDENTITY)
    expect(e1).toEqual({ x: 1, y: 0 })
    expect(e2).toEqual({ x: 0, y: 1 })
  })

  it('returns columns of the matrix', () => {
    const m: Mat2 = { a: 1.2, b: 0.8, c: -0.6, d: 1.4 }
    const { e1, e2 } = transformedBasis(m)
    expect(e1.x).toBeCloseTo(1.2)
    expect(e1.y).toBeCloseTo(-0.6)
    expect(e2.x).toBeCloseTo(0.8)
    expect(e2.y).toBeCloseTo(1.4)
  })
})

describe('determinant', () => {
  it('identity has determinant 1', () => {
    expect(determinant(IDENTITY)).toBe(1)
  })

  it('computes ad - bc', () => {
    expect(determinant({ a: 2, b: 3, c: 1, d: 4 })).toBe(5)
  })

  it('reflection has determinant -1', () => {
    expect(determinant({ a: 1, b: 0, c: 0, d: -1 })).toBe(-1)
  })

  it('collapse preset has determinant 0', () => {
    expect(determinant(PRESETS.collapse.matrix)).toBe(0)
  })
})

describe('areaScale', () => {
  it('equals absolute value of determinant', () => {
    expect(areaScale({ a: 2, b: 3, c: 1, d: 4 })).toBe(5)
  })

  it('positive for reflection', () => {
    expect(areaScale({ a: 1, b: 0, c: 0, d: -1 })).toBe(1)
  })

  it('zero for singular matrix', () => {
    expect(areaScale(PRESETS.collapse.matrix)).toBe(0)
  })
})

describe('isOrientationReversed', () => {
  it('false for identity', () => {
    expect(isOrientationReversed(IDENTITY)).toBe(false)
  })

  it('true for reflection', () => {
    expect(isOrientationReversed({ a: 1, b: 0, c: 0, d: -1 })).toBe(true)
  })

  it('false for rotation', () => {
    expect(isOrientationReversed(PRESETS.rotate.matrix)).toBe(false)
  })
})

describe('isSingular', () => {
  it('false for identity', () => {
    expect(isSingular(IDENTITY)).toBe(false)
  })

  it('true for collapse preset', () => {
    expect(isSingular(PRESETS.collapse.matrix)).toBe(true)
  })

  it('false for rotation', () => {
    expect(isSingular(PRESETS.rotate.matrix)).toBe(false)
  })
})

describe('lerpMat', () => {
  const from: Mat2 = { a: 0, b: 0, c: 0, d: 0 }
  const to: Mat2 = { a: 2, b: 4, c: 6, d: 8 }

  it('t=0 returns from', () => {
    expect(lerpMat(from, to, 0)).toEqual(from)
  })

  it('t=1 returns to', () => {
    expect(lerpMat(from, to, 1)).toEqual(to)
  })

  it('t=0.5 returns midpoint', () => {
    const mid = lerpMat(from, to, 0.5)
    expect(mid.a).toBe(1)
    expect(mid.b).toBe(2)
    expect(mid.c).toBe(3)
    expect(mid.d).toBe(4)
  })
})

describe('generateGridLines', () => {
  it('produces correct number of lines', () => {
    const lines = generateGridLines(2, 1)
    // -2,-1,0,1,2 = 5 values → 5 vertical + 5 horizontal = 10
    expect(lines).toHaveLength(10)
  })

  it('lines span the range', () => {
    const lines = generateGridLines(3, 1)
    const verticals = lines.filter(l => l.start.x === l.end.x)
    expect(verticals.length).toBe(7) // -3,-2,-1,0,1,2,3
    expect(verticals[0].start.y).toBe(-3)
    expect(verticals[0].end.y).toBe(3)
  })
})

describe('transformGridLines', () => {
  it('identity returns same lines', () => {
    const lines = generateGridLines(2, 1)
    const transformed = transformGridLines(lines, IDENTITY)
    expect(transformed).toEqual(lines)
  })

  it('transforms line endpoints', () => {
    const lines = [{ start: { x: 1, y: 0 }, end: { x: 0, y: 1 } }]
    const m: Mat2 = { a: 2, b: 0, c: 0, d: 3 }
    const result = transformGridLines(lines, m)
    expect(result[0].start).toEqual({ x: 2, y: 0 })
    expect(result[0].end).toEqual({ x: 0, y: 3 })
  })
})

// ── Basis ──

describe('basisCoords', () => {
  it('returns (1,0) for b1 in standard basis', () => {
    const r = basisCoords({ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 })
    expect(r).not.toBeNull()
    expect(r!.alpha).toBeCloseTo(1)
    expect(r!.beta).toBeCloseTo(0)
  })

  it('decomposes arbitrary vector', () => {
    const r = basisCoords({ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 3, y: 5 })
    expect(r!.alpha).toBeCloseTo(3)
    expect(r!.beta).toBeCloseTo(5)
  })

  it('returns null for dependent basis', () => {
    expect(basisCoords({ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 1, y: 1 })).toBeNull()
  })

  it('works with non-standard basis', () => {
    const r = basisCoords({ x: 2, y: 0 }, { x: 0, y: 3 }, { x: 4, y: 9 })
    expect(r!.alpha).toBeCloseTo(2)
    expect(r!.beta).toBeCloseTo(3)
  })
})

describe('areDependentVecs', () => {
  it('parallel vectors are dependent', () => {
    expect(areDependentVecs({ x: 1, y: 2 }, { x: 2, y: 4 })).toBe(true)
  })

  it('non-parallel are independent', () => {
    expect(areDependentVecs({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(false)
  })
})

// ── Eigenvalues ──

describe('eigenvalues', () => {
  it('identity has eigenvalue 1 (repeated)', () => {
    const r = eigenvalues({ a: 1, b: 0, c: 0, d: 1 })
    expect(r.lambda1).toBeCloseTo(1)
    expect(r.lambda2).toBeCloseTo(1)
    expect(r.isComplex).toBe(false)
  })

  it('diagonal matrix has diagonal entries as eigenvalues', () => {
    const r = eigenvalues({ a: 3, b: 0, c: 0, d: 5 })
    expect(Math.max(r.lambda1, r.lambda2)).toBeCloseTo(5)
    expect(Math.min(r.lambda1, r.lambda2)).toBeCloseTo(3)
  })

  it('rotation 90° has complex eigenvalues', () => {
    const r = eigenvalues({ a: 0, b: -1, c: 1, d: 0 })
    expect(r.isComplex).toBe(true)
  })

  it('Av = λv for computed eigenvector', () => {
    const m: Mat2 = { a: 2, b: 1, c: 1, d: 2 }
    const r = eigenvalues(m)
    if (r.v1) {
      const av = transformVec(m, r.v1)
      expect(av.x).toBeCloseTo(r.lambda1 * r.v1.x, 1)
      expect(av.y).toBeCloseTo(r.lambda1 * r.v1.y, 1)
    }
  })
})

describe('isEigenvectorDirection', () => {
  it('e1 is eigenvector of diagonal matrix', () => {
    const r = isEigenvectorDirection({ a: 3, b: 0, c: 0, d: 5 }, { x: 1, y: 0 })
    expect(r.isEigen).toBe(true)
    expect(r.lambda).toBeCloseTo(3)
  })
})

// ── Projections ──

describe('projectOnto', () => {
  it('projects onto x-axis correctly', () => {
    const p = projectOnto({ x: 3, y: 4 }, { x: 1, y: 0 })
    expect(p.x).toBeCloseTo(3)
    expect(p.y).toBeCloseTo(0)
  })

  it('projection onto self returns self', () => {
    const p = projectOnto({ x: 3, y: 4 }, { x: 3, y: 4 })
    expect(p.x).toBeCloseTo(3)
    expect(p.y).toBeCloseTo(4)
  })

  it('projection onto perpendicular is zero', () => {
    const p = projectOnto({ x: 1, y: 0 }, { x: 0, y: 1 })
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(0)
  })

  it('residual is orthogonal to direction', () => {
    const u = { x: 3, y: 4 }
    const v = { x: 1, y: 1 }
    const proj = projectOnto(u, v)
    const resid = subVec(u, proj)
    expect(dotProduct(resid, v)).toBeCloseTo(0)
  })

  it('handles zero vector direction safely', () => {
    const p = projectOnto({ x: 3, y: 4 }, { x: 0, y: 0 })
    expect(p.x).toBe(0)
    expect(p.y).toBe(0)
  })
})

describe('projectionCoefficient', () => {
  it('returns correct scalar', () => {
    expect(projectionCoefficient({ x: 3, y: 4 }, { x: 1, y: 0 })).toBeCloseTo(3)
  })
})
