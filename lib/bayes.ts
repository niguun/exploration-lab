export interface BayesParams {
  prevalence: number
  sensitivity: number
  specificity: number
  population: number
}

export interface BayesResult {
  totalPopulation: number
  diseased: number
  healthy: number
  truePositive: number
  falseNegative: number
  falsePositive: number
  trueNegative: number
  totalPositive: number
  totalNegative: number
  posterior: number
  priorOdds: number
  likelihoodRatio: number
  posteriorOdds: number
}

/**
 * ROUNDING / TOKEN CONSISTENCY POLICY
 *
 * Mathematical counts use Math.round with remainder allocation:
 *   diseased = round(N * prevalence), healthy = N - diseased
 *   TP = round(diseased * sensitivity), FN = diseased - TP
 *   FP = round(healthy * (1 - specificity)), TN = healthy - FP
 *
 * Guarantees: TP+FN = diseased, TN+FP = healthy, all four sum to N.
 *
 * Token-level (visual): assignTokenGroups uses the same strategy at
 * scale 500/N. Token groups approximate math within ±1 token.
 *
 * Displayed posterior uses mathematical counts (this result), not tokens.
 * Zero-denominator: if totalPositive = 0, posterior = 0 (not NaN).
 */
export function computeBayes(params: BayesParams): BayesResult {
  const { prevalence, sensitivity, specificity, population } = params

  const diseased = Math.round(population * prevalence)
  const healthy = population - diseased

  const truePositive = Math.round(diseased * sensitivity)
  const falseNegative = diseased - truePositive
  const falsePositive = Math.round(healthy * (1 - specificity))
  const trueNegative = healthy - falsePositive

  const totalPositive = truePositive + falsePositive
  const totalNegative = falseNegative + trueNegative

  const posterior = totalPositive > 0 ? truePositive / totalPositive : 0

  const priorOdds = prevalence / (1 - prevalence || 1e-9)
  const likelihoodRatio = sensitivity / (1 - specificity || 1e-9)
  const posteriorOdds = priorOdds * likelihoodRatio

  return {
    totalPopulation: population,
    diseased,
    healthy,
    truePositive,
    falseNegative,
    falsePositive,
    trueNegative,
    totalPositive,
    totalNegative,
    posterior,
    priorOdds,
    likelihoodRatio,
    posteriorOdds,
  }
}

export type LayoutMode = 'all' | 'condition' | 'test_results' | 'positive_only'

export type TokenGroup = 'tp' | 'fn' | 'fp' | 'tn'

export interface Token {
  id: number
  isDiseased: boolean
  testPositive: boolean
  group: TokenGroup
  x: number
  y: number
  targetX: number
  targetY: number
  color: string
  targetColor: string
  opacity: number
  targetOpacity: number
  row: number
  targetScale: number
  scale: number
}

export const COLOR_DISEASED = '#D4A847'
export const COLOR_HEALTHY = '#7A90AD'

export function assignTokenGroups(tokens: Token[], result: BayesResult) {
  const scale = tokens.length / result.totalPopulation
  const tpCount = Math.round(result.truePositive * scale)
  const fnCount = Math.round(result.falseNegative * scale)
  const fpCount = Math.round(result.falsePositive * scale)

  let idx = 0
  for (let i = 0; i < tpCount && idx < tokens.length; i++, idx++) {
    const t = tokens[idx]
    t.isDiseased = true
    t.testPositive = true
    t.group = 'tp'
  }
  for (let i = 0; i < fnCount && idx < tokens.length; i++, idx++) {
    const t = tokens[idx]
    t.isDiseased = true
    t.testPositive = false
    t.group = 'fn'
  }
  for (let i = 0; i < fpCount && idx < tokens.length; i++, idx++) {
    const t = tokens[idx]
    t.isDiseased = false
    t.testPositive = true
    t.group = 'fp'
  }
  for (; idx < tokens.length; idx++) {
    const t = tokens[idx]
    t.isDiseased = false
    t.testPositive = false
    t.group = 'tn'
  }
}

export function createStableTokens(count: number): Token[] {
  const tokens: Token[] = []
  for (let i = 0; i < count; i++) {
    tokens.push({
      id: i,
      isDiseased: false,
      testPositive: false,
      group: 'tn',
      x: 0, y: 0, targetX: 0, targetY: 0,
      color: COLOR_HEALTHY,
      targetColor: COLOR_HEALTHY,
      opacity: 1,
      targetOpacity: 1,
      row: 0,
      targetScale: 1,
      scale: 1,
    })
  }
  return tokens
}

/* ── Crowd layout: arc-shaped formation with depth ── */

function layoutCrowd(
  tokens: Token[],
  cx: number, cy: number,
  maxW: number, maxH: number,
  figW: number, figH: number,
) {
  if (tokens.length === 0) return

  const colSpacing = figW * 0.82
  const rowGap = figH * 0.62
  const maxColsFromW = Math.max(1, Math.floor(maxW / colSpacing))
  const maxRowsFromH = Math.max(1, Math.floor(maxH / rowGap))
  const targetRows = Math.min(maxRowsFromH, Math.max(4, Math.ceil(Math.sqrt(tokens.length * 0.6))))
  const tokensPerRow = Math.min(maxColsFromW, Math.max(1, Math.ceil(tokens.length / targetRows)))
  const rows = Math.ceil(tokens.length / tokensPerRow)
  const totalH = rows * rowGap
  const startY = cy - totalH / 2 + figH * 0.2

  let idx = 0
  for (let r = 0; r < rows && idx < tokens.length; r++) {
    const remaining = tokens.length - idx
    const inThisRow = Math.min(tokensPerRow, remaining)
    const depthT = rows > 1 ? r / (rows - 1) : 0.5
    const rowScale = 1.0 - depthT * 0.15
    const rSpacing = colSpacing * rowScale
    const stagger = r % 2 === 1 ? rSpacing * 0.5 : 0
    const rowWidth = (inThisRow - 1) * rSpacing
    const rowStartX = cx - rowWidth / 2 + stagger

    for (let c = 0; c < inThisRow && idx < tokens.length; c++, idx++) {
      const t = tokens[idx]
      t.targetX = rowStartX + c * rSpacing
      t.targetY = startY + r * rowGap
      t.row = r
      t.targetScale = rowScale
    }
  }
}

export function applyLayout(
  tokens: Token[],
  mode: LayoutMode,
  canvasWidth: number,
  canvasHeight: number,
  figW: number,
  rightReserve = 0,
) {
  const leftMargin = figW * 14
  const usableW = canvasWidth - rightReserve
  const crowdL = leftMargin
  const crowdW = usableW - leftMargin
  const cx = leftMargin + crowdW / 2
  const cy = canvasHeight / 2
  const figH = figW * 1.8

  if (mode === 'all') {
    layoutCrowd(tokens, cx, cy, crowdW * 0.95, canvasHeight * 0.9, figW, figH)
    for (const t of tokens) {
      t.targetColor = t.isDiseased ? COLOR_DISEASED : COLOR_HEALTHY
      t.targetOpacity = 1
    }
  } else if (mode === 'condition') {
    const diseased = tokens.filter(t => t.isDiseased)
    const healthy = tokens.filter(t => !t.isDiseased)

    layoutCrowd(diseased, crowdL + crowdW * 0.12, cy, crowdW * 0.2, canvasHeight * 0.6, figW, figH)
    layoutCrowd(healthy, crowdL + crowdW * 0.58, cy, crowdW * 0.7, canvasHeight * 0.9, figW, figH)

    for (const t of tokens) {
      t.targetColor = t.isDiseased ? COLOR_DISEASED : COLOR_HEALTHY
      t.targetOpacity = 1
    }
  } else if (mode === 'test_results') {
    const tp = tokens.filter(t => t.group === 'tp')
    const fn = tokens.filter(t => t.group === 'fn')
    const fp = tokens.filter(t => t.group === 'fp')
    const tn = tokens.filter(t => t.group === 'tn')

    const qW = crowdW * 0.44
    const qH = canvasHeight * 0.38
    const topY = canvasHeight * 0.28
    const botY = canvasHeight * 0.72
    const lx = crowdL + crowdW * 0.25
    const rx = crowdL + crowdW * 0.72

    layoutCrowd(tp, lx, topY, qW, qH, figW, figH)
    layoutCrowd(fn, lx, botY, qW, qH, figW, figH)
    layoutCrowd(fp, rx, topY, qW, qH, figW, figH)
    layoutCrowd(tn, rx, botY, qW, qH, figW, figH)

    for (const t of tokens) {
      t.targetColor = t.isDiseased ? COLOR_DISEASED : COLOR_HEALTHY
      t.targetOpacity = 1
    }
  } else if (mode === 'positive_only') {
    const tp = tokens.filter(t => t.testPositive && t.isDiseased)
    const fp = tokens.filter(t => t.testPositive && !t.isDiseased)
    const negatives = tokens.filter(t => !t.testPositive)

    if (tp.length > 0 && fp.length > 0) {
      const gap = figW * 5
      const tpW = Math.max(figW * 3, figW * Math.ceil(Math.sqrt(tp.length)) * 1.2)
      const fpW = Math.max(figW * 4, figW * Math.ceil(Math.sqrt(fp.length)) * 1.2)
      layoutCrowd(tp, cx - gap / 2 - tpW * 0.3, cy, tpW, canvasHeight * 0.6, figW, figH)
      layoutCrowd(fp, cx + gap / 2 + fpW * 0.3, cy, fpW, canvasHeight * 0.7, figW, figH)
    } else {
      const positives = [...tp, ...fp]
      layoutCrowd(positives, cx, cy, crowdW * 0.5, canvasHeight * 0.65, figW, figH)
    }

    for (const t of [...tp, ...fp]) {
      t.targetColor = t.isDiseased ? COLOR_DISEASED : COLOR_HEALTHY
      t.targetOpacity = 1
    }
    for (const t of negatives) {
      t.targetX = t.x + (t.x - cx) * 0.12
      t.targetY = t.y + 25
      t.targetOpacity = 0
      t.targetScale = 0.6
    }
  }
}
