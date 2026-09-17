/* ── Seeded PRNG (mulberry32) ── */

export function createRng(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ── Population ── */

export interface Population {
  values: number[]
  mean: number
  stdDev: number
}

export function createPopulation(
  seed: number,
  size: number,
  targetMean: number,
  targetStdDev: number,
): Population {
  const rng = createRng(seed)
  const values: number[] = []

  for (let i = 0; i < size; i++) {
    // Box-Muller transform for normal-ish values
    const u1 = rng() || 1e-10
    const u2 = rng()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    values.push(targetMean + z * targetStdDev)
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const v = values.reduce((a, x) => a + (x - mean) ** 2, 0) / values.length
  const stdDev = Math.sqrt(v)

  return { values, mean, stdDev }
}

/* ── Sampling ── */

export function drawSample(
  population: Population,
  n: number,
  rng: () => number,
): number[] {
  const sample: number[] = []
  const len = population.values.length
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * len)
    sample.push(population.values[idx])
  }
  return sample
}

export function sampleMean(sample: number[]): number {
  if (sample.length === 0) return 0
  return sample.reduce((a, b) => a + b, 0) / sample.length
}

export function sampleStdDev(sample: number[]): number {
  if (sample.length <= 1) return 0
  const mean = sampleMean(sample)
  const v = sample.reduce((a, x) => a + (x - mean) ** 2, 0) / (sample.length - 1)
  return Math.sqrt(v)
}

export function drawManySamples(
  population: Population,
  n: number,
  count: number,
  seed: number,
): number[] {
  const rng = createRng(seed)
  const means: number[] = []
  for (let i = 0; i < count; i++) {
    const sample = drawSample(population, n, rng)
    means.push(sampleMean(sample))
  }
  return means
}

export function samplingDistStats(
  means: number[],
): { mean: number; stdDev: number } {
  if (means.length === 0) return { mean: 0, stdDev: 0 }
  const m = means.reduce((a, b) => a + b, 0) / means.length
  const v = means.reduce((a, x) => a + (x - m) ** 2, 0) / means.length
  return { mean: m, stdDev: Math.sqrt(v) }
}
