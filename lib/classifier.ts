import { computeBayes } from './bayes'
import type { StudentTrace, TraceAction, ExplanationAnswer } from './trace'
import type {
  ReasoningPattern, Confidence, EvidenceItem,
  ClassifierSignal, ReasoningAssessment,
} from './assessment-types'

const INITIAL_PARAMS = { prevalence: 0.01, sensitivity: 0.95, specificity: 0.95, population: 1000 }

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

// ── Signal Extraction ──

export function extractPredictionSignals(
  prediction: number,
  params: typeof INITIAL_PARAMS,
  posterior: number,
): ClassifierSignal[] {
  const nearSens = Math.abs(prediction - params.sensitivity) < 0.10
  const nearPost = Math.abs(prediction - posterior) < 0.15
  const highPred = prediction > posterior + 0.25 && posterior < 0.4

  // Decision tree: most specific match wins. At most ONE signal.
  if (nearPost) {
    return [{
      group: 'prediction',
      signal: 'prediction_near_posterior',
      observed: `Predicted ${fmtPct(prediction)}; actual posterior is ${fmtPct(posterior)}`,
      supports_pattern: 'correct_reasoning',
    }]
  }

  if (nearSens && Math.abs(prediction - posterior) > 0.20) {
    return [{
      group: 'prediction',
      signal: 'prediction_near_sensitivity',
      observed: `Predicted ${fmtPct(prediction)}; sensitivity was ${fmtPct(params.sensitivity)}`,
      supports_pattern: 'sensitivity_posterior_confusion',
    }]
  }

  if (highPred && !nearSens) {
    return [{
      group: 'prediction',
      signal: 'prediction_ignores_base_rate',
      observed: `Predicted ${fmtPct(prediction)} despite ${fmtPct(params.prevalence)} prevalence (posterior is ${fmtPct(posterior)})`,
      supports_pattern: 'base_rate_neglect',
    }]
  }

  return []
}

export function extractFreeExploreSignals(actions: TraceAction[]): ClassifierSignal[] {
  const free = actions.filter(a => a.phase === 'free_explore')
  const signals: ClassifierSignal[] = []

  const sliders = new Set<string>()
  const filters = new Set<string>()

  for (const a of free) {
    if (a.type === 'slider_change') sliders.add(a.detail.parameter as string)
    if (a.type === 'filter_change') filters.add(a.detail.to as string)
  }

  const hasExplored = sliders.size > 0 || filters.size > 0
  if (!hasExplored) return []

  // Positive: thorough exploration
  if (sliders.has('prevalence') && filters.has('positive_only')) {
    signals.push({
      group: 'free_explore',
      signal: 'thorough_exploration',
      observed: 'Investigated prevalence effect and examined positive-test population',
      supports_pattern: 'correct_reasoning',
    })
  }

  // Absence: did not explore prevalence (only when other sliders were changed)
  if (!sliders.has('prevalence') && sliders.size > 0) {
    signals.push({
      group: 'free_explore',
      signal: 'no_prevalence_exploration',
      observed: 'Adjusted other parameters but did not investigate prevalence',
      supports_pattern: 'base_rate_neglect',
    })
  }

  // Conditioning-view signals (mutually exclusive: DC suppresses generic SPC)
  if (filters.has('condition') && !filters.has('positive_only')) {
    signals.push({
      group: 'free_explore',
      signal: 'condition_without_positive_only',
      observed: 'Viewed disease/healthy split but did not examine positive-test subgroup',
      supports_pattern: 'denominator_confusion',
    })
  } else if (!filters.has('positive_only') && filters.size > 0) {
    signals.push({
      group: 'free_explore',
      signal: 'no_positive_only_view',
      observed: 'Did not inspect positive-test population during free exploration',
      supports_pattern: 'sensitivity_posterior_confusion',
    })
  }

  return signals
}

const OPTION_PATTERN: Record<string, ReasoningPattern> = {
  q1_a: 'sensitivity_posterior_confusion',
  q1_b: 'correct_reasoning',
  q2_a: 'sensitivity_posterior_confusion',
  q2_b: 'correct_reasoning',
  q2_c: 'base_rate_neglect',
  q2_d: 'denominator_confusion',
  q3_a: 'correct_reasoning',
  q3_b: 'base_rate_neglect',
  q3_d: 'base_rate_neglect',
}

const OPTION_TEXT: Record<string, string> = {
  q1_a: 'How accurate the test is (its sensitivity)',
  q1_b: 'How common the condition is in the population (prevalence)',
  q1_c: 'The total number of people who were tested',
  q1_d: 'Whether the test was administered correctly',
  q2_a: 'The sensitivity of the test',
  q2_b: 'The probability that someone who tested positive actually has the disease',
  q2_c: 'The prevalence of the disease in the population',
  q2_d: 'The false positive rate of the test',
  q3_a: 'It increases substantially — more positive results will be true positives',
  q3_b: "It stays roughly the same — the test's accuracy determines this",
  q3_c: 'It decreases because there are more sick people overwhelming the test',
  q3_d: 'It depends only on sensitivity and specificity, not on prevalence',
}

export function extractExplanationSignals(answers: ExplanationAnswer[]): ClassifierSignal[] {
  const signals: ClassifierSignal[] = []
  for (const answer of answers) {
    const pattern = OPTION_PATTERN[answer.selectedOptionId]
    if (pattern) {
      signals.push({
        group: 'explanation',
        signal: `explanation_${answer.questionId}`,
        observed: `Selected: "${OPTION_TEXT[answer.selectedOptionId] || answer.selectedOptionId}"`,
        supports_pattern: pattern,
      })
    }
  }
  return signals
}

// ── Classification Logic ──

interface ClassResult {
  pattern: ReasoningPattern
  confidence: Confidence
}

const MISCONCEPTIONS: ReasoningPattern[] = [
  'base_rate_neglect', 'sensitivity_posterior_confusion', 'denominator_confusion',
]

function isMisconception(p: ReasoningPattern): boolean {
  return MISCONCEPTIONS.includes(p)
}

export function classifyByGroupCount(signals: ClassifierSignal[]): ClassResult {
  const groupsPerPattern = new Map<ReasoningPattern, Set<string>>()

  for (const s of signals) {
    if (!groupsPerPattern.has(s.supports_pattern)) {
      groupsPerPattern.set(s.supports_pattern, new Set())
    }
    groupsPerPattern.get(s.supports_pattern)!.add(s.group)
  }

  let best: ReasoningPattern = 'insufficient_evidence'
  let bestCount = 0
  let tied = false

  for (const [pattern, groups] of groupsPerPattern) {
    if (pattern === 'insufficient_evidence') continue
    if (groups.size > bestCount) {
      best = pattern
      bestCount = groups.size
      tied = false
    } else if (groups.size === bestCount && groups.size > 0 && pattern !== best) {
      tied = true
    }
  }

  if (tied || bestCount === 0) {
    return { pattern: 'insufficient_evidence', confidence: 'weak' }
  }

  const confidence: Confidence =
    bestCount >= 3 ? 'strong' : bestCount >= 2 ? 'moderate' : 'weak'

  if (isMisconception(best) && confidence === 'weak') {
    return { pattern: 'insufficient_evidence', confidence: 'weak' }
  }

  return { pattern: best, confidence }
}

export function classifyExplanationDirect(signals: ClassifierSignal[]): ClassResult {
  const counts = new Map<ReasoningPattern, number>()

  for (const s of signals) {
    counts.set(s.supports_pattern, (counts.get(s.supports_pattern) || 0) + 1)
  }

  let best: ReasoningPattern = 'insufficient_evidence'
  let bestCount = 0
  let tied = false

  for (const [pattern, count] of counts) {
    if (pattern === 'insufficient_evidence') continue
    if (count > bestCount) {
      best = pattern
      bestCount = count
      tied = false
    } else if (count === bestCount && count > 0 && pattern !== best) {
      tied = true
    }
  }

  if (tied || bestCount === 0) {
    return { pattern: 'insufficient_evidence', confidence: 'weak' }
  }

  const confidence: Confidence =
    bestCount >= 3 ? 'strong' : bestCount >= 2 ? 'moderate' : 'weak'

  return { pattern: best, confidence }
}

// ── Main Classifier ──

export function classify(trace: StudentTrace): ReasoningAssessment {
  const initialResult = computeBayes(INITIAL_PARAMS)

  const predSignals = extractPredictionSignals(
    trace.prediction.value, INITIAL_PARAMS, initialResult.posterior,
  )
  const freeSignals = extractFreeExploreSignals(trace.actions)
  const explSignals = extractExplanationSignals(trace.explanationAnswers)
  const allSignals = [...predSignals, ...freeSignals, ...explSignals]

  // Phase 1: pre-observation classification (prediction + free_explore only)
  const preObs = classifyByGroupCount([...predSignals, ...freeSignals])

  // Phase 2: post-observation classification (explanation answers only)
  const postObs = classifyExplanationDirect(explSignals)

  let pattern: ReasoningPattern
  let confidence: Confidence
  let recovered = false

  if (isMisconception(preObs.pattern) && preObs.confidence !== 'weak') {
    if (postObs.pattern === 'correct_reasoning' && postObs.confidence !== 'weak') {
      // Recovery: pre-observation misconception → correct post-observation understanding
      pattern = preObs.pattern
      confidence = preObs.confidence
      recovered = true
    } else if (postObs.pattern === preObs.pattern) {
      // Explanation confirms the misconception → boost to strong
      pattern = preObs.pattern
      confidence = 'strong'
      recovered = false
    } else {
      // Ambiguous or different post-observation
      pattern = preObs.pattern
      confidence = preObs.confidence
      recovered = false
    }
  } else if (preObs.pattern === 'correct_reasoning') {
    if (postObs.pattern === 'correct_reasoning' && postObs.confidence !== 'weak') {
      pattern = 'correct_reasoning'
      confidence = 'strong'
      recovered = false
    } else {
      pattern = 'correct_reasoning'
      confidence = preObs.confidence
      recovered = false
    }
  } else {
    // Pre-observation insufficient → fall through to full classification
    const full = classifyByGroupCount(allSignals)
    pattern = full.pattern
    confidence = full.confidence
    recovered = false
  }

  const evidence: EvidenceItem[] = allSignals.map(s => ({
    signal: s.signal,
    observed: s.observed,
    supports_pattern: s.supports_pattern,
  }))

  return {
    traceId: trace.traceId,
    studentId: trace.studentId,
    activityId: trace.activityId,
    pattern,
    confidence,
    recovered,
    evidence,
    timestamp: new Date().toISOString(),
  }
}

// ── Trace Validation ──

export function validateTrace(
  data: unknown,
): { valid: true; trace: StudentTrace } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Trace must be an object' }
  const t = data as Record<string, unknown>

  if (typeof t.traceId !== 'string' || !t.traceId) return { valid: false, error: 'Missing traceId' }
  if (typeof t.studentId !== 'string') return { valid: false, error: 'Missing studentId' }
  if (typeof t.activityId !== 'string') return { valid: false, error: 'Missing activityId' }

  if (!t.prediction || typeof t.prediction !== 'object') return { valid: false, error: 'Missing prediction' }
  const pred = t.prediction as Record<string, unknown>
  if (typeof pred.value !== 'number' || pred.value < 0 || pred.value > 1) {
    return { valid: false, error: 'prediction.value must be a number between 0 and 1' }
  }
  if (typeof pred.timestamp !== 'string') return { valid: false, error: 'Missing prediction.timestamp' }

  if (!Array.isArray(t.actions)) return { valid: false, error: 'Missing actions array' }
  if (!Array.isArray(t.explanationAnswers)) return { valid: false, error: 'Missing explanationAnswers array' }
  if (!Array.isArray(t.stageTransitions)) return { valid: false, error: 'Missing stageTransitions array' }
  if (typeof t.startedAt !== 'string') return { valid: false, error: 'Missing startedAt' }

  return { valid: true, trace: data as StudentTrace }
}
