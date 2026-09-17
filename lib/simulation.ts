import { createRng } from './inference'

export { createRng }

/* ── Simulation State ── */

export interface SimulationState {
  trials: number
  successes: number
  proportion: number
  history: number[]
}

export function initSimulation(): SimulationState {
  return { trials: 0, successes: 0, proportion: 0, history: [] }
}

export function runTrials(
  state: SimulationState,
  count: number,
  p: number,
  rng: () => number,
): SimulationState {
  let { trials, successes } = state
  const newHistory = [...state.history]

  if (count <= 200) {
    for (let i = 0; i < count; i++) {
      trials++
      if (rng() < p) successes++
      newHistory.push(successes / trials)
    }
  } else {
    const step = Math.max(1, Math.floor(count / 200))
    for (let i = 0; i < count; i++) {
      trials++
      if (rng() < p) successes++
      if (i % step === 0 || i === count - 1) {
        newHistory.push(successes / trials)
      }
    }
  }

  return {
    trials,
    successes,
    proportion: trials > 0 ? successes / trials : 0,
    history: newHistory,
  }
}

export function runAllAtOnce(
  totalTrials: number,
  p: number,
  seed: number,
): SimulationState {
  const rng = createRng(seed)
  return runTrials(initSimulation(), totalTrials, p, rng)
}
