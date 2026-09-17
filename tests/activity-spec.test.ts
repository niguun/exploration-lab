import { describe, it, expect } from 'vitest'
import { validateActivitySpec, RENDERER_TYPES, type ActivitySpec } from '../lib/activity-spec'

function makeValidSpec(overrides: Partial<ActivitySpec> = {}): Record<string, unknown> {
  return {
    id: 'test_activity_1',
    version: 1,
    title: 'Test Activity',
    bigQuestion: 'What happens when X?',
    domain: 'probability',
    concept: 'expected_value',
    learningObjective: 'Understand expected value',
    rendererType: 'distributions',
    rendererConfig: {},
    prediction: {
      prompt: 'Guess the expected value',
      inputType: 'slider_0_100',
      contextLines: ['A distribution has 6 bars.'],
    },
    guidedSteps: [
      { id: 'step_1', instruction: 'Try the centered preset' },
      { id: 'step_2', instruction: 'Now try bimodal' },
    ],
    explanationQuestions: [
      {
        id: 'q1',
        text: 'Why did E[X] change?',
        options: [
          { id: 'q1_a', text: 'More mass moved right', tag: 'correct' },
          { id: 'q1_b', text: 'The bars got taller', tag: 'misconception' },
        ],
        correctOptionId: 'q1_a',
      },
    ],
    completionInsight: 'The expected value is the center of mass.',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('validateActivitySpec', () => {
  it('accepts a valid spec', () => {
    const result = validateActivitySpec(makeValidSpec())
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.spec.id).toBe('test_activity_1')
    }
  })

  it('rejects null', () => {
    const result = validateActivitySpec(null)
    expect(result.valid).toBe(false)
  })

  it('rejects missing id', () => {
    const result = validateActivitySpec(makeValidSpec({ id: '' as unknown as string }))
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.some(e => e.includes('id'))).toBe(true)
  })

  it('rejects invalid renderer type', () => {
    const result = validateActivitySpec(makeValidSpec({ rendererType: 'nonexistent' as never }))
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.some(e => e.includes('rendererType'))).toBe(true)
  })

  it('rejects empty guided steps', () => {
    const result = validateActivitySpec(makeValidSpec({ guidedSteps: [] as never }))
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.some(e => e.includes('guided step'))).toBe(true)
  })

  it('rejects empty explanation questions', () => {
    const result = validateActivitySpec(makeValidSpec({ explanationQuestions: [] as never }))
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.some(e => e.includes('explanation question'))).toBe(true)
  })

  it('rejects duplicate question IDs', () => {
    const spec = makeValidSpec()
    spec.explanationQuestions = [
      { id: 'q1', text: 'Q?', options: [{ id: 'a', text: 'A', tag: 't' }, { id: 'b', text: 'B', tag: 't' }], correctOptionId: 'a' },
      { id: 'q1', text: 'Q2?', options: [{ id: 'c', text: 'C', tag: 't' }, { id: 'd', text: 'D', tag: 't' }], correctOptionId: 'c' },
    ]
    const result = validateActivitySpec(spec)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.some(e => e.includes('Duplicate question id'))).toBe(true)
  })

  it('rejects missing prediction prompt', () => {
    const spec = makeValidSpec()
    ;(spec.prediction as Record<string, unknown>).prompt = ''
    const result = validateActivitySpec(spec)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.some(e => e.includes('prediction.prompt'))).toBe(true)
  })

  it('rejects question with fewer than 2 options', () => {
    const spec = makeValidSpec()
    spec.explanationQuestions = [
      { id: 'q1', text: 'Q?', options: [{ id: 'a', text: 'A', tag: 't' }], correctOptionId: 'a' },
    ]
    const result = validateActivitySpec(spec)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.some(e => e.includes('>= 2 options'))).toBe(true)
  })
})

describe('RENDERER_TYPES', () => {
  it('contains 8 renderer types', () => {
    expect(RENDERER_TYPES).toHaveLength(8)
  })

  it('includes expected types', () => {
    expect(RENDERER_TYPES).toContain('distributions')
    expect(RENDERER_TYPES).toContain('matrix_transform')
    expect(RENDERER_TYPES).toContain('simulation')
  })
})
