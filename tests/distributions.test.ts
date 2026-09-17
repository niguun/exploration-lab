import { describe, it, expect } from 'vitest'
import {
  expectation,
  variance,
  standardDeviation,
  contribution,
  isValid,
  normalize,
  adjustProbability,
  lerpDistribution,
  DIST_PRESETS,
  DEFAULT_VALUES,
  type DiscreteDistribution,
} from '../lib/distributions'

function makeDist(probs: number[]): DiscreteDistribution {
  return { values: DEFAULT_VALUES, probabilities: probs }
}

describe('isValid', () => {
  it('returns true for a valid distribution', () => {
    expect(isValid(makeDist([0.05, 0.1, 0.2, 0.3, 0.2, 0.1, 0.05]))).toBe(true)
  })

  it('returns false for negative probabilities', () => {
    expect(isValid(makeDist([-0.1, 0.2, 0.2, 0.3, 0.2, 0.1, 0.1]))).toBe(false)
  })

  it('returns false for probabilities not summing to 1', () => {
    expect(isValid(makeDist([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]))).toBe(false)
  })

  it('returns false for mismatched lengths', () => {
    expect(isValid({ values: [1, 2], probabilities: [0.5] })).toBe(false)
  })
})

describe('expectation', () => {
  it('centered preset has mean ≈ 3.0', () => {
    const d = makeDist(DIST_PRESETS.centered.probabilities)
    expect(expectation(d)).toBeCloseTo(3.0, 1)
  })

  it('uniform distribution on 0-6 has mean 3.0', () => {
    const d = makeDist([1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7])
    expect(expectation(d)).toBeCloseTo(3.0, 10)
  })

  it('all mass on x=4 has mean 4.0', () => {
    const d = makeDist([0, 0, 0, 0, 1, 0, 0])
    expect(expectation(d)).toBe(4)
  })
})

describe('variance', () => {
  it('constant distribution has variance 0', () => {
    const d = makeDist([0, 0, 0, 1, 0, 0, 0])
    expect(variance(d)).toBeCloseTo(0, 10)
  })

  it('spread preset has higher variance than centered', () => {
    const centered = makeDist(DIST_PRESETS.centered.probabilities)
    const spread = makeDist(DIST_PRESETS.spread.probabilities)
    expect(variance(spread)).toBeGreaterThan(variance(centered))
  })
})

describe('standardDeviation', () => {
  it('equals sqrt of variance', () => {
    const d = makeDist(DIST_PRESETS.centered.probabilities)
    expect(standardDeviation(d)).toBeCloseTo(Math.sqrt(variance(d)), 10)
  })
})

describe('contribution', () => {
  it('returns x_i * p_i', () => {
    const d = makeDist([0.1, 0.2, 0.3, 0.15, 0.1, 0.1, 0.05])
    expect(contribution(d, 2)).toBeCloseTo(2 * 0.3, 10)
    expect(contribution(d, 0)).toBeCloseTo(0, 10)
    expect(contribution(d, 5)).toBeCloseTo(5 * 0.1, 10)
  })
})

describe('normalize', () => {
  it('clamps negatives and scales to sum 1', () => {
    const result = normalize([-0.2, 0.3, 0.5, 0.1, 0, 0, 0])
    expect(result[0]).toBe(0)
    const sum = result.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 10)
  })

  it('handles all zeros by returning uniform', () => {
    const result = normalize([0, 0, 0])
    expect(result).toEqual([1 / 3, 1 / 3, 1 / 3])
  })
})

describe('adjustProbability', () => {
  it('keeps total = 1', () => {
    const d = makeDist(DIST_PRESETS.centered.probabilities)
    const adjusted = adjustProbability(d, 3, 0.5)
    const sum = adjusted.probabilities.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 10)
  })

  it('keeps all probabilities >= 0', () => {
    const d = makeDist(DIST_PRESETS.centered.probabilities)
    const adjusted = adjustProbability(d, 0, 0.9)
    for (const p of adjusted.probabilities) {
      expect(p).toBeGreaterThanOrEqual(0)
    }
  })

  it('sets the target index to the requested value', () => {
    const d = makeDist(DIST_PRESETS.centered.probabilities)
    const adjusted = adjustProbability(d, 2, 0.4)
    expect(adjusted.probabilities[2]).toBeCloseTo(0.4, 10)
  })

  it('clamps to 0-1 range', () => {
    const d = makeDist(DIST_PRESETS.centered.probabilities)
    const high = adjustProbability(d, 0, 1.5)
    expect(high.probabilities[0]).toBe(1)
    const low = adjustProbability(d, 0, -0.5)
    expect(low.probabilities[0]).toBe(0)
  })
})

describe('lerpDistribution', () => {
  it('at t=0 returns from', () => {
    const from = makeDist(DIST_PRESETS.centered.probabilities)
    const to = makeDist(DIST_PRESETS.bimodal.probabilities)
    const result = lerpDistribution(from, to, 0)
    for (let i = 0; i < from.probabilities.length; i++) {
      expect(result.probabilities[i]).toBeCloseTo(from.probabilities[i], 8)
    }
  })

  it('at t=1 returns to', () => {
    const from = makeDist(DIST_PRESETS.centered.probabilities)
    const to = makeDist(DIST_PRESETS.bimodal.probabilities)
    const result = lerpDistribution(from, to, 1)
    for (let i = 0; i < to.probabilities.length; i++) {
      expect(result.probabilities[i]).toBeCloseTo(to.probabilities[i], 8)
    }
  })

  it('result is always valid', () => {
    const from = makeDist(DIST_PRESETS.centered.probabilities)
    const to = makeDist(DIST_PRESETS.rightSkewed.probabilities)
    const result = lerpDistribution(from, to, 0.5)
    expect(isValid(result)).toBe(true)
  })
})

describe('spread preset vs centered preset', () => {
  it('has same mean within 0.01', () => {
    const centered = makeDist(DIST_PRESETS.centered.probabilities)
    const spread = makeDist(DIST_PRESETS.spread.probabilities)
    expect(Math.abs(expectation(spread) - expectation(centered))).toBeLessThan(0.01)
  })

  it('has higher variance', () => {
    const centered = makeDist(DIST_PRESETS.centered.probabilities)
    const spread = makeDist(DIST_PRESETS.spread.probabilities)
    expect(variance(spread)).toBeGreaterThan(variance(centered) * 2)
  })
})

describe('all presets are valid', () => {
  it('every preset sums to 1 with no negatives', () => {
    for (const [key, preset] of Object.entries(DIST_PRESETS)) {
      const d = makeDist(preset.probabilities)
      expect(isValid(d)).toBe(true)
    }
  })
})
