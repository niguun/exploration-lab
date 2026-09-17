import { describe, it, expect } from 'vitest'
import { assembleTrace, createTraceId, createActionId, type TraceAction, type ExplanationAnswer, type StageTransition } from '../lib/trace'

describe('createTraceId', () => {
  it('generates unique ids', () => {
    const a = createTraceId()
    const b = createTraceId()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^trace_/)
  })
})

describe('createActionId', () => {
  it('generates unique ids', () => {
    const a = createActionId()
    const b = createActionId()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^act_/)
  })
})

describe('assembleTrace', () => {
  const prediction = { value: 0.95, timestamp: '2024-01-01T00:00:00Z' }
  const actions: TraceAction[] = [
    { id: 'a1', phase: 'free_explore', type: 'slider_change', timestamp: '2024-01-01T00:01:00Z', detail: { parameter: 'prevalence', from: 0.01, to: 0.05 } },
    { id: 'a2', phase: 'free_explore', type: 'filter_change', timestamp: '2024-01-01T00:02:00Z', detail: { from: 'all', to: 'condition' } },
    { id: 'a3', phase: 'guided_observation', type: 'filter_change', timestamp: '2024-01-01T00:03:00Z', detail: { from: 'condition', to: 'positive_only' } },
  ]
  const answers: ExplanationAnswer[] = [
    { questionId: 'q1', selectedOptionId: 'q1_b', timestamp: '2024-01-01T00:04:00Z' },
    { questionId: 'q2', selectedOptionId: 'q2_b', timestamp: '2024-01-01T00:05:00Z' },
    { questionId: 'q3', selectedOptionId: 'q3_a', timestamp: '2024-01-01T00:06:00Z' },
  ]
  const transitions: StageTransition[] = [
    { stage: 'predict', timestamp: '2024-01-01T00:00:00Z' },
    { stage: 'free_explore', timestamp: '2024-01-01T00:00:01Z' },
    { stage: 'guided_observation', timestamp: '2024-01-01T00:02:30Z' },
    { stage: 'explain', timestamp: '2024-01-01T00:03:30Z' },
    { stage: 'complete', timestamp: '2024-01-01T00:06:00Z' },
  ]
  const finalState = { prevalence: 0.05, sensitivity: 0.95, specificity: 0.95, layoutMode: 'positive_only' as const, posterior: 0.5 }

  it('produces a complete trace with all required fields', () => {
    const trace = assembleTrace('trace_123', 'test_student', 'test_activity', prediction, actions, answers, transitions, finalState, '2024-01-01T00:00:00Z')
    expect(trace.traceId).toBe('trace_123')
    expect(trace.studentId).toBe('test_student')
    expect(trace.activityId).toBe('test_activity')
    expect(trace.prediction.value).toBe(0.95)
    expect(trace.actions).toHaveLength(3)
    expect(trace.explanationAnswers).toHaveLength(3)
    expect(trace.stageTransitions).toHaveLength(5)
    expect(trace.finalState.posterior).toBe(0.5)
    expect(trace.startedAt).toBe('2024-01-01T00:00:00Z')
    expect(trace.completedAt).toBeTruthy()
  })

  it('preserves prediction value unchanged', () => {
    const trace = assembleTrace('trace_123', 'test_student', 'test_activity', prediction, actions, answers, transitions, finalState, '2024-01-01T00:00:00Z')
    expect(trace.prediction.value).toBe(0.95)
    expect(trace.prediction.timestamp).toBe('2024-01-01T00:00:00Z')
  })

  it('preserves action ordering', () => {
    const trace = assembleTrace('trace_123', 'test_student', 'test_activity', prediction, actions, answers, transitions, finalState, '2024-01-01T00:00:00Z')
    expect(trace.actions[0].timestamp < trace.actions[1].timestamp).toBe(true)
    expect(trace.actions[1].timestamp < trace.actions[2].timestamp).toBe(true)
  })

  it('correctly tags action phases', () => {
    const trace = assembleTrace('trace_123', 'test_student', 'test_activity', prediction, actions, answers, transitions, finalState, '2024-01-01T00:00:00Z')
    expect(trace.actions[0].phase).toBe('free_explore')
    expect(trace.actions[1].phase).toBe('free_explore')
    expect(trace.actions[2].phase).toBe('guided_observation')
  })

  it('returns defensive copies of arrays', () => {
    const trace = assembleTrace('trace_123', 'test_student', 'test_activity', prediction, actions, answers, transitions, finalState, '2024-01-01T00:00:00Z')
    actions.push({ id: 'a4', phase: 'free_explore', type: 'slider_change', timestamp: 'later', detail: {} })
    expect(trace.actions).toHaveLength(3)
  })

  it('sets completedAt to a non-null ISO timestamp', () => {
    const trace = assembleTrace('trace_123', 'test_student', 'test_activity', prediction, actions, answers, transitions, finalState, '2024-01-01T00:00:00Z')
    expect(trace.completedAt).not.toBeNull()
    expect(() => new Date(trace.completedAt!)).not.toThrow()
  })
})
