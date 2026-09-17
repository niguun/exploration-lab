import { describe, it, expect } from 'vitest'
import { initSimulation, runTrials, runAllAtOnce } from '../lib/simulation'
import { createRng } from '../lib/inference'

describe('initSimulation', () => {
  it('starts with 0 trials', () => {
    const s = initSimulation()
    expect(s.trials).toBe(0)
    expect(s.successes).toBe(0)
    expect(s.proportion).toBe(0)
    expect(s.history).toHaveLength(0)
  })
})

describe('runTrials', () => {
  it('produces correct trial count', () => {
    const rng = createRng(42)
    const s = runTrials(initSimulation(), 10, 0.5, rng)
    expect(s.trials).toBe(10)
  })

  it('proportion equals successes / trials', () => {
    const rng = createRng(42)
    const s = runTrials(initSimulation(), 100, 0.5, rng)
    expect(s.proportion).toBeCloseTo(s.successes / s.trials, 10)
  })

  it('with p=1.0, all trials succeed', () => {
    const rng = createRng(42)
    const s = runTrials(initSimulation(), 50, 1.0, rng)
    expect(s.successes).toBe(50)
    expect(s.proportion).toBe(1)
  })

  it('with p=0.0, all trials fail', () => {
    const rng = createRng(42)
    const s = runTrials(initSimulation(), 50, 0.0, rng)
    expect(s.successes).toBe(0)
    expect(s.proportion).toBe(0)
  })

  it('history length is ≤200 for large runs', () => {
    const rng = createRng(42)
    const s = runTrials(initSimulation(), 5000, 0.5, rng)
    expect(s.history.length).toBeLessThanOrEqual(210)
    expect(s.history.length).toBeGreaterThan(100)
  })

  it('history records every step for small runs', () => {
    const rng = createRng(42)
    const s = runTrials(initSimulation(), 50, 0.5, rng)
    expect(s.history).toHaveLength(50)
  })

  it('is additive: running 10+10 = running 20 in trial count', () => {
    const rng1 = createRng(42)
    const s1 = runTrials(initSimulation(), 10, 0.5, rng1)
    const s2 = runTrials(s1, 10, 0.5, rng1)
    expect(s2.trials).toBe(20)
  })
})

describe('runAllAtOnce', () => {
  it('with large n and p=0.3, proportion is near 0.3', () => {
    const s = runAllAtOnce(10000, 0.3, 42)
    expect(s.trials).toBe(10000)
    expect(Math.abs(s.proportion - 0.3)).toBeLessThan(0.05)
  })

  it('seeded runs are reproducible', () => {
    const a = runAllAtOnce(1000, 0.5, 99)
    const b = runAllAtOnce(1000, 0.5, 99)
    expect(a.successes).toBe(b.successes)
    expect(a.proportion).toBe(b.proportion)
    expect(a.history).toEqual(b.history)
  })

  it('history has data points', () => {
    const s = runAllAtOnce(500, 0.5, 42)
    expect(s.history.length).toBeGreaterThan(0)
    expect(s.history[s.history.length - 1]).toBeCloseTo(s.proportion, 10)
  })
})
