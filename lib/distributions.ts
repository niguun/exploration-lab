export interface DiscreteDistribution {
  values: number[]
  probabilities: number[]
}

export const DEFAULT_VALUES = [0, 1, 2, 3, 4, 5, 6]

export function expectation(d: DiscreteDistribution): number {
  let sum = 0
  for (let i = 0; i < d.values.length; i++) {
    sum += d.values[i] * d.probabilities[i]
  }
  return sum
}

export function variance(d: DiscreteDistribution): number {
  const mu = expectation(d)
  let sum = 0
  for (let i = 0; i < d.values.length; i++) {
    const diff = d.values[i] - mu
    sum += d.probabilities[i] * diff * diff
  }
  return sum
}

export function standardDeviation(d: DiscreteDistribution): number {
  return Math.sqrt(variance(d))
}

export function contribution(d: DiscreteDistribution, index: number): number {
  return d.values[index] * d.probabilities[index]
}

export function isValid(d: DiscreteDistribution): boolean {
  if (d.values.length !== d.probabilities.length) return false
  if (d.values.length === 0) return false
  let sum = 0
  for (const p of d.probabilities) {
    if (p < 0) return false
    sum += p
  }
  return Math.abs(sum - 1) < 1e-9
}

export function normalize(probs: number[]): number[] {
  const clamped = probs.map(p => Math.max(0, p))
  const sum = clamped.reduce((a, b) => a + b, 0)
  if (sum === 0) {
    const uniform = 1 / clamped.length
    return clamped.map(() => uniform)
  }
  return clamped.map(p => p / sum)
}

export function adjustProbability(
  d: DiscreteDistribution,
  index: number,
  newP: number,
): DiscreteDistribution {
  const clamped = Math.max(0, Math.min(1, newP))
  const remaining = 1 - clamped
  const otherSum = d.probabilities.reduce((s, p, i) => i === index ? s : s + p, 0)

  const newProbs = d.probabilities.map((p, i) => {
    if (i === index) return clamped
    if (otherSum > 0) return p * (remaining / otherSum)
    return remaining / (d.probabilities.length - 1)
  })

  return { values: [...d.values], probabilities: newProbs }
}

export function lerpDistribution(
  from: DiscreteDistribution,
  to: DiscreteDistribution,
  t: number,
): DiscreteDistribution {
  const interpolated = from.probabilities.map((p, i) =>
    p + (to.probabilities[i] - p) * t,
  )
  return { values: [...from.values], probabilities: normalize(interpolated) }
}

export const DIST_PRESETS: Record<string, { label: string; probabilities: number[] }> = {
  centered: {
    label: 'Centered',
    probabilities: [0.05, 0.1, 0.2, 0.3, 0.2, 0.1, 0.05],
  },
  leftSkewed: {
    label: 'Left-Skewed',
    probabilities: [0.02, 0.03, 0.05, 0.1, 0.2, 0.3, 0.3],
  },
  rightSkewed: {
    label: 'Right-Skewed',
    probabilities: [0.3, 0.3, 0.2, 0.1, 0.05, 0.03, 0.02],
  },
  bimodal: {
    label: 'Bimodal',
    probabilities: [0.25, 0.15, 0.03, 0.04, 0.03, 0.15, 0.35],
  },
  spread: {
    label: 'More Spread',
    probabilities: [0.3, 0.0, 0.0, 0.4, 0.0, 0.0, 0.3],
  },
}
