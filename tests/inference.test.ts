import { describe, it, expect } from 'vitest'
import {
  createRng,
  createPopulation,
  drawSample,
  sampleMean,
  sampleStdDev,
  drawManySamples,
  samplingDistStats,
} from '../lib/inference'

describe('createRng', () => {
  it('produces values in [0, 1)', () => {
    const rng = createRng(42)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('is reproducible with same seed', () => {
    const a = createRng(123)
    const b = createRng(123)
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b())
    }
  })
})

describe('createPopulation', () => {
  it('produces correct size', () => {
    const pop = createPopulation(42, 1000, 50, 10)
    expect(pop.values).toHaveLength(1000)
  })

  it('mean is close to requested mean', () => {
    const pop = createPopulation(42, 1000, 50, 10)
    expect(Math.abs(pop.mean - 50)).toBeLessThan(1.0)
  })

  it('stdDev is close to requested stdDev', () => {
    const pop = createPopulation(42, 1000, 50, 10)
    expect(Math.abs(pop.stdDev - 10)).toBeLessThan(2.0)
  })
})

describe('drawSample', () => {
  it('returns correct size n', () => {
    const pop = createPopulation(42, 100, 50, 10)
    const rng = createRng(99)
    const sample = drawSample(pop, 20, rng)
    expect(sample).toHaveLength(20)
  })
})

describe('sampleMean', () => {
  it('computes correctly for [1,2,3,4,5]', () => {
    expect(sampleMean([1, 2, 3, 4, 5])).toBe(3)
  })

  it('returns 0 for empty array', () => {
    expect(sampleMean([])).toBe(0)
  })
})

describe('sampleStdDev', () => {
  it('returns 0 for single element', () => {
    expect(sampleStdDev([5])).toBe(0)
  })

  it('computes sample std dev', () => {
    const sd = sampleStdDev([2, 4, 4, 4, 5, 5, 7, 9])
    expect(sd).toBeCloseTo(2, 0)
  })
})

describe('drawManySamples', () => {
  const pop = createPopulation(42, 1000, 50, 10)

  it('returns correct count of means', () => {
    const means = drawManySamples(pop, 20, 100, 7)
    expect(means).toHaveLength(100)
  })

  it('with large n (100), sample means cluster near population mean', () => {
    const means = drawManySamples(pop, 100, 200, 8)
    for (const m of means) {
      expect(Math.abs(m - pop.mean)).toBeLessThan(2 * pop.stdDev)
    }
  })

  it('with small n (5), sample means are more dispersed than with large n', () => {
    const meansSmall = drawManySamples(pop, 5, 200, 9)
    const meansLarge = drawManySamples(pop, 100, 200, 10)
    const statsSmall = samplingDistStats(meansSmall)
    const statsLarge = samplingDistStats(meansLarge)
    expect(statsSmall.stdDev).toBeGreaterThan(statsLarge.stdDev)
  })

  it('seeded sampling is reproducible', () => {
    const a = drawManySamples(pop, 20, 50, 42)
    const b = drawManySamples(pop, 20, 50, 42)
    expect(a).toEqual(b)
  })
})

describe('samplingDistStats', () => {
  it('computes mean and stdDev', () => {
    const stats = samplingDistStats([10, 20, 30])
    expect(stats.mean).toBe(20)
    expect(stats.stdDev).toBeCloseTo(8.165, 2)
  })

  it('handles empty array', () => {
    const stats = samplingDistStats([])
    expect(stats.mean).toBe(0)
    expect(stats.stdDev).toBe(0)
  })
})
