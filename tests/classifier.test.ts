import { describe, it, expect } from 'vitest'
import { computeBayes } from '@/lib/bayes'
import type { StudentTrace, TraceAction, ExplanationAnswer } from '@/lib/trace'
import {
  extractPredictionSignals,
  extractFreeExploreSignals,
  extractExplanationSignals,
  classifyByGroupCount,
  classifyExplanationDirect,
  classify,
  validateTrace,
} from '@/lib/classifier'

const INIT = { prevalence: 0.01, sensitivity: 0.95, specificity: 0.95, population: 1000 }
const POSTERIOR = computeBayes(INIT).posterior

function makeTrace(overrides: Partial<StudentTrace>): StudentTrace {
  return {
    traceId: 'test_trace',
    studentId: 'test_student',
    activityId: 'bayes_medical_test_v1',
    prediction: { value: 0.50, timestamp: '2024-01-01T00:00:00Z' },
    actions: [],
    explanationAnswers: [],
    stageTransitions: [
      { stage: 'predict', timestamp: '2024-01-01T00:00:00Z' },
      { stage: 'complete', timestamp: '2024-01-01T00:10:00Z' },
    ],
    finalState: { prevalence: 0.01, sensitivity: 0.95, specificity: 0.95, layoutMode: 'all', posterior: POSTERIOR },
    startedAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:10:00Z',
    ...overrides,
  }
}

function act(phase: 'free_explore' | 'guided_observation', type: 'slider_change' | 'filter_change', detail: Record<string, unknown>): TraceAction {
  return { id: `act_${Math.random()}`, phase, type, timestamp: '2024-01-01T00:05:00Z', detail }
}

function ans(qId: string, optId: string): ExplanationAnswer {
  return { questionId: qId, selectedOptionId: optId, timestamp: '2024-01-01T00:08:00Z' }
}

// ── Prediction Signals ──

describe('extractPredictionSignals', () => {
  it('detects correct prediction near posterior', () => {
    const signals = extractPredictionSignals(POSTERIOR + 0.05, INIT, POSTERIOR)
    expect(signals).toHaveLength(1)
    expect(signals[0].supports_pattern).toBe('correct_reasoning')
  })

  it('detects sensitivity-posterior confusion', () => {
    const signals = extractPredictionSignals(0.95, INIT, POSTERIOR)
    expect(signals).toHaveLength(1)
    expect(signals[0].supports_pattern).toBe('sensitivity_posterior_confusion')
  })

  it('detects base rate neglect for high prediction', () => {
    const signals = extractPredictionSignals(0.75, INIT, POSTERIOR)
    expect(signals).toHaveLength(1)
    expect(signals[0].supports_pattern).toBe('base_rate_neglect')
  })

  it('produces at most one signal', () => {
    const signals = extractPredictionSignals(0.85, INIT, POSTERIOR)
    expect(signals.length).toBeLessThanOrEqual(1)
  })

  it('returns empty for ambiguous middle prediction', () => {
    const signals = extractPredictionSignals(0.35, INIT, POSTERIOR)
    expect(signals).toHaveLength(0)
  })
})

// ── Free Explore Signals ──

describe('extractFreeExploreSignals', () => {
  it('detects thorough exploration (prevalence + positive_only)', () => {
    const actions = [
      act('free_explore', 'slider_change', { parameter: 'prevalence', from: 0.01, to: 0.05 }),
      act('free_explore', 'filter_change', { from: 'all', to: 'positive_only' }),
    ]
    const signals = extractFreeExploreSignals(actions)
    expect(signals.some(s => s.signal === 'thorough_exploration')).toBe(true)
  })

  it('detects no prevalence exploration', () => {
    const actions = [
      act('free_explore', 'slider_change', { parameter: 'sensitivity', from: 0.95, to: 0.80 }),
    ]
    const signals = extractFreeExploreSignals(actions)
    expect(signals.some(s => s.signal === 'no_prevalence_exploration')).toBe(true)
  })

  it('ignores guided_observation actions entirely', () => {
    const actions = [
      act('guided_observation', 'slider_change', { parameter: 'prevalence', from: 0.01, to: 0.05 }),
      act('guided_observation', 'filter_change', { from: 'all', to: 'positive_only' }),
    ]
    const signals = extractFreeExploreSignals(actions)
    expect(signals).toHaveLength(0)
  })

  it('returns empty for no exploration at all', () => {
    const signals = extractFreeExploreSignals([])
    expect(signals).toHaveLength(0)
  })

  it('detects condition without positive_only as denominator confusion', () => {
    const actions = [
      act('free_explore', 'filter_change', { from: 'all', to: 'condition' }),
    ]
    const signals = extractFreeExploreSignals(actions)
    expect(signals.some(s => s.signal === 'condition_without_positive_only')).toBe(true)
    expect(signals.some(s => s.supports_pattern === 'denominator_confusion')).toBe(true)
  })

  it('DC suppresses SPC signal when condition is viewed', () => {
    const actions = [
      act('free_explore', 'filter_change', { from: 'all', to: 'condition' }),
    ]
    const signals = extractFreeExploreSignals(actions)
    expect(signals.some(s => s.signal === 'no_positive_only_view')).toBe(false)
  })
})

// ── Explanation Signals ──

describe('extractExplanationSignals', () => {
  it('maps correct answers to correct_reasoning', () => {
    const answers = [ans('q_key_factor', 'q1_b'), ans('q_denominator', 'q2_b'), ans('q_prevalence_effect', 'q3_a')]
    const signals = extractExplanationSignals(answers)
    expect(signals.every(s => s.supports_pattern === 'correct_reasoning')).toBe(true)
    expect(signals).toHaveLength(3)
  })

  it('maps SPC answers correctly', () => {
    const answers = [ans('q_key_factor', 'q1_a'), ans('q_denominator', 'q2_a')]
    const signals = extractExplanationSignals(answers)
    expect(signals.every(s => s.supports_pattern === 'sensitivity_posterior_confusion')).toBe(true)
  })

  it('produces no signal for neutral options', () => {
    const answers = [ans('q_key_factor', 'q1_c'), ans('q_prevalence_effect', 'q3_c')]
    const signals = extractExplanationSignals(answers)
    expect(signals).toHaveLength(0)
  })
})

// ── Group Count Classification ──

describe('classifyByGroupCount', () => {
  it('returns insufficient_evidence when no signals', () => {
    const result = classifyByGroupCount([])
    expect(result.pattern).toBe('insufficient_evidence')
  })

  it('returns insufficient_evidence on tie', () => {
    const result = classifyByGroupCount([
      { group: 'prediction', signal: 'a', observed: 'x', supports_pattern: 'base_rate_neglect' },
      { group: 'prediction', signal: 'b', observed: 'y', supports_pattern: 'correct_reasoning' },
    ])
    expect(result.pattern).toBe('insufficient_evidence')
  })

  it('returns insufficient_evidence for weak misconception', () => {
    const result = classifyByGroupCount([
      { group: 'prediction', signal: 'a', observed: 'x', supports_pattern: 'base_rate_neglect' },
    ])
    expect(result.pattern).toBe('insufficient_evidence')
  })

  it('allows weak correct_reasoning', () => {
    const result = classifyByGroupCount([
      { group: 'prediction', signal: 'a', observed: 'x', supports_pattern: 'correct_reasoning' },
    ])
    expect(result.pattern).toBe('correct_reasoning')
    expect(result.confidence).toBe('weak')
  })
})

// ── Full Classification (end-to-end) ──

describe('classify', () => {
  it('classifies strong BRN: high prediction + no prevalence + BRN explanations', () => {
    const trace = makeTrace({
      prediction: { value: 0.80, timestamp: '2024-01-01T00:01:00Z' },
      actions: [
        act('free_explore', 'slider_change', { parameter: 'sensitivity', from: 0.95, to: 0.90 }),
        act('free_explore', 'filter_change', { from: 'all', to: 'test_results' }),
      ],
      explanationAnswers: [ans('q_key_factor', 'q1_a'), ans('q_denominator', 'q2_c'), ans('q_prevalence_effect', 'q3_b')],
    })
    const result = classify(trace)
    expect(result.pattern).toBe('base_rate_neglect')
    expect(result.confidence).toBe('strong')
    expect(result.recovered).toBe(false)
  })

  it('classifies strong SPC: prediction ≈ sensitivity + SPC explanations', () => {
    const trace = makeTrace({
      prediction: { value: 0.95, timestamp: '2024-01-01T00:01:00Z' },
      actions: [
        act('free_explore', 'slider_change', { parameter: 'prevalence', from: 0.01, to: 0.02 }),
        act('free_explore', 'filter_change', { from: 'all', to: 'test_results' }),
      ],
      explanationAnswers: [ans('q_key_factor', 'q1_a'), ans('q_denominator', 'q2_a'), ans('q_prevalence_effect', 'q3_b')],
    })
    const result = classify(trace)
    expect(result.pattern).toBe('sensitivity_posterior_confusion')
    expect(result.confidence).toBe('strong')
  })

  it('classifies DC with moderate confidence', () => {
    const trace = makeTrace({
      prediction: { value: 0.35, timestamp: '2024-01-01T00:01:00Z' },
      actions: [
        act('free_explore', 'slider_change', { parameter: 'prevalence', from: 0.01, to: 0.03 }),
        act('free_explore', 'slider_change', { parameter: 'sensitivity', from: 0.95, to: 0.90 }),
        act('free_explore', 'filter_change', { from: 'all', to: 'condition' }),
      ],
      explanationAnswers: [ans('q_key_factor', 'q1_c'), ans('q_denominator', 'q2_d'), ans('q_prevalence_effect', 'q3_c')],
    })
    const result = classify(trace)
    expect(result.pattern).toBe('denominator_confusion')
  })

  it('classifies strong correct reasoning', () => {
    const trace = makeTrace({
      prediction: { value: 0.15, timestamp: '2024-01-01T00:01:00Z' },
      actions: [
        act('free_explore', 'slider_change', { parameter: 'prevalence', from: 0.01, to: 0.05 }),
        act('free_explore', 'filter_change', { from: 'all', to: 'condition' }),
        act('free_explore', 'filter_change', { from: 'condition', to: 'positive_only' }),
      ],
      explanationAnswers: [ans('q_key_factor', 'q1_b'), ans('q_denominator', 'q2_b'), ans('q_prevalence_effect', 'q3_a')],
    })
    const result = classify(trace)
    expect(result.pattern).toBe('correct_reasoning')
    expect(result.confidence).toBe('strong')
  })

  it('detects recovery: SPC pre-obs → correct post-obs', () => {
    const trace = makeTrace({
      prediction: { value: 0.95, timestamp: '2024-01-01T00:01:00Z' },
      actions: [
        act('free_explore', 'slider_change', { parameter: 'sensitivity', from: 0.95, to: 0.99 }),
        act('free_explore', 'filter_change', { from: 'all', to: 'test_results' }),
      ],
      explanationAnswers: [ans('q_key_factor', 'q1_b'), ans('q_denominator', 'q2_b'), ans('q_prevalence_effect', 'q3_a')],
    })
    const result = classify(trace)
    expect(result.recovered).toBe(true)
    expect(result.pattern).toBe('sensitivity_posterior_confusion')
  })

  it('detects recovery: BRN pre-obs → correct post-obs', () => {
    const trace = makeTrace({
      prediction: { value: 0.80, timestamp: '2024-01-01T00:01:00Z' },
      actions: [
        act('free_explore', 'slider_change', { parameter: 'sensitivity', from: 0.95, to: 0.85 }),
        act('free_explore', 'slider_change', { parameter: 'specificity', from: 0.95, to: 0.90 }),
        act('free_explore', 'filter_change', { from: 'all', to: 'test_results' }),
      ],
      explanationAnswers: [ans('q_key_factor', 'q1_b'), ans('q_denominator', 'q2_b'), ans('q_prevalence_effect', 'q3_a')],
    })
    const result = classify(trace)
    expect(result.recovered).toBe(true)
    expect(result.pattern).toBe('base_rate_neglect')
  })

  it('returns insufficient_evidence for empty trace', () => {
    const trace = makeTrace({
      prediction: { value: 0.40, timestamp: '2024-01-01T00:01:00Z' },
      actions: [],
      explanationAnswers: [],
    })
    const result = classify(trace)
    expect(result.pattern).toBe('insufficient_evidence')
  })

  it('returns insufficient_evidence for conflicting signals', () => {
    const trace = makeTrace({
      prediction: { value: 0.40, timestamp: '2024-01-01T00:01:00Z' },
      actions: [],
      explanationAnswers: [ans('q_key_factor', 'q1_a'), ans('q_denominator', 'q2_c'), ans('q_prevalence_effect', 'q3_a')],
    })
    const result = classify(trace)
    expect(result.pattern).toBe('insufficient_evidence')
  })

  it('non-recovered: pre-obs BRN + BRN explanations stay BRN strong', () => {
    const trace = makeTrace({
      prediction: { value: 0.75, timestamp: '2024-01-01T00:01:00Z' },
      actions: [
        act('free_explore', 'slider_change', { parameter: 'sensitivity', from: 0.95, to: 0.90 }),
        act('free_explore', 'filter_change', { from: 'all', to: 'test_results' }),
      ],
      explanationAnswers: [ans('q_key_factor', 'q1_a'), ans('q_denominator', 'q2_c'), ans('q_prevalence_effect', 'q3_b')],
    })
    const result = classify(trace)
    expect(result.pattern).toBe('base_rate_neglect')
    expect(result.confidence).toBe('strong')
    expect(result.recovered).toBe(false)
  })

  it('no-exploration student with only correct explanations but SPC prediction', () => {
    const trace = makeTrace({
      prediction: { value: 0.90, timestamp: '2024-01-01T00:01:00Z' },
      actions: [],
      explanationAnswers: [ans('q_key_factor', 'q1_b'), ans('q_denominator', 'q2_b'), ans('q_prevalence_effect', 'q3_a')],
    })
    const result = classify(trace)
    // Pre-obs: SPC weak → insufficient. Full: SPC(prediction) vs correct(explanation) → tie → insufficient
    expect(result.pattern).toBe('insufficient_evidence')
  })
})

// ── Trace Validation ──

describe('validateTrace', () => {
  it('rejects non-object input', () => {
    const result = validateTrace('not an object')
    expect(result.valid).toBe(false)
  })

  it('rejects missing traceId', () => {
    const result = validateTrace({ studentId: 'a', activityId: 'b' })
    expect(result.valid).toBe(false)
  })

  it('rejects prediction out of range', () => {
    const result = validateTrace({
      traceId: 'x', studentId: 'a', activityId: 'b',
      prediction: { value: 1.5, timestamp: 't' },
      actions: [], explanationAnswers: [], stageTransitions: [],
      startedAt: 't',
    })
    expect(result.valid).toBe(false)
  })

  it('accepts valid trace', () => {
    const result = validateTrace({
      traceId: 'x', studentId: 'a', activityId: 'b',
      prediction: { value: 0.5, timestamp: 't' },
      actions: [], explanationAnswers: [], stageTransitions: [],
      startedAt: 't',
    })
    expect(result.valid).toBe(true)
  })
})
