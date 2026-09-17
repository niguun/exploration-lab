import { describe, it, expect } from 'vitest'
import { computeBayes, assignTokenGroups, createStableTokens } from '../lib/bayes'

describe('computeBayes', () => {
  it('computes correct posterior for standard medical test', () => {
    const r = computeBayes({ prevalence: 0.01, sensitivity: 0.95, specificity: 0.95, population: 1000 })
    expect(r.diseased).toBe(10)
    expect(r.healthy).toBe(990)
    expect(r.truePositive).toBe(10) // round(10 * 0.95) = round(9.5) = 10
    expect(r.falseNegative).toBe(0) // 10 - 10
    expect(r.falsePositive).toBe(50) // round(990 * 0.05) = round(49.5) = 50
    expect(r.trueNegative).toBe(940) // 990 - 50
    expect(r.totalPositive).toBe(60) // 10 + 50
    expect(r.posterior).toBeCloseTo(10 / 60, 10)
  })

  it('guarantees TP+FN = diseased and TN+FP = healthy', () => {
    const params = [
      { prevalence: 0.01, sensitivity: 0.95, specificity: 0.95 },
      { prevalence: 0.1, sensitivity: 0.8, specificity: 0.9 },
      { prevalence: 0.5, sensitivity: 0.99, specificity: 0.99 },
      { prevalence: 0.001, sensitivity: 0.7, specificity: 0.999 },
    ]
    for (const p of params) {
      const r = computeBayes({ ...p, population: 1000 })
      expect(r.truePositive + r.falseNegative).toBe(r.diseased)
      expect(r.trueNegative + r.falsePositive).toBe(r.healthy)
      expect(r.diseased + r.healthy).toBe(1000)
    }
  })

  it('changes disease composition with prevalence', () => {
    const low = computeBayes({ prevalence: 0.01, sensitivity: 0.95, specificity: 0.95, population: 1000 })
    const high = computeBayes({ prevalence: 0.1, sensitivity: 0.95, specificity: 0.95, population: 1000 })
    expect(high.diseased).toBeGreaterThan(low.diseased)
    expect(high.posterior).toBeGreaterThan(low.posterior)
  })

  it('changes TP/FN split with sensitivity', () => {
    const lowSens = computeBayes({ prevalence: 0.1, sensitivity: 0.6, specificity: 0.95, population: 1000 })
    const highSens = computeBayes({ prevalence: 0.1, sensitivity: 0.99, specificity: 0.95, population: 1000 })
    expect(highSens.truePositive).toBeGreaterThan(lowSens.truePositive)
    expect(highSens.falseNegative).toBeLessThan(lowSens.falseNegative)
  })

  it('changes TN/FP split with specificity', () => {
    const lowSpec = computeBayes({ prevalence: 0.1, sensitivity: 0.95, specificity: 0.6, population: 1000 })
    const highSpec = computeBayes({ prevalence: 0.1, sensitivity: 0.95, specificity: 0.99, population: 1000 })
    expect(highSpec.trueNegative).toBeGreaterThan(lowSpec.trueNegative)
    expect(highSpec.falsePositive).toBeLessThan(lowSpec.falsePositive)
  })

  it('handles zero prevalence without NaN', () => {
    const r = computeBayes({ prevalence: 0, sensitivity: 0.95, specificity: 0.95, population: 1000 })
    expect(r.diseased).toBe(0)
    expect(r.truePositive).toBe(0)
    expect(r.falseNegative).toBe(0)
    expect(r.posterior).toBe(0)
    expect(Number.isNaN(r.posterior)).toBe(false)
  })

  it('handles zero sensitivity', () => {
    const r = computeBayes({ prevalence: 0.1, sensitivity: 0, specificity: 0.95, population: 1000 })
    expect(r.truePositive).toBe(0)
    expect(r.falseNegative).toBe(r.diseased)
    expect(r.posterior).toBe(0)
  })

  it('handles perfect specificity (no false positives)', () => {
    const r = computeBayes({ prevalence: 0.1, sensitivity: 0.95, specificity: 1, population: 1000 })
    expect(r.falsePositive).toBe(0)
    expect(r.totalPositive).toBe(r.truePositive)
    expect(r.posterior).toBe(1)
  })

  it('returns 0 posterior when zero denominator (no positives at all)', () => {
    const r = computeBayes({ prevalence: 0, sensitivity: 0, specificity: 1, population: 1000 })
    expect(r.totalPositive).toBe(0)
    expect(r.posterior).toBe(0)
    expect(Number.isNaN(r.posterior)).toBe(false)
  })

  it('handles high prevalence', () => {
    const r = computeBayes({ prevalence: 0.2, sensitivity: 0.95, specificity: 0.95, population: 1000 })
    expect(r.diseased).toBe(200)
    expect(r.healthy).toBe(800)
    expect(r.posterior).toBeGreaterThan(0.8)
  })
})

describe('token assignment', () => {
  it('assigns all 500 tokens with groups summing correctly', () => {
    const tokens = createStableTokens(500)
    const r = computeBayes({ prevalence: 0.01, sensitivity: 0.95, specificity: 0.95, population: 1000 })
    assignTokenGroups(tokens, r)

    const tp = tokens.filter(t => t.group === 'tp').length
    const fn = tokens.filter(t => t.group === 'fn').length
    const fp = tokens.filter(t => t.group === 'fp').length
    const tn = tokens.filter(t => t.group === 'tn').length

    expect(tp + fn + fp + tn).toBe(500)
  })
})
