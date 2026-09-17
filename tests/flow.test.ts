import { describe, it, expect } from 'vitest'
import { flowReducer, initialFlowState, type FlowAction, type FlowState } from '../lib/flow'

function applyActions(actions: FlowAction[]): FlowState {
  return actions.reduce(flowReducer, initialFlowState())
}

describe('flowReducer', () => {
  it('starts in predict stage with no prediction', () => {
    const state = initialFlowState()
    expect(state.stage).toBe('predict')
    expect(state.prediction).toBeNull()
    expect(state.guidedStepsCompleted).toBe(0)
  })

  it('transitions predict → free_explore on COMMIT_PREDICTION', () => {
    const state = applyActions([
      { type: 'COMMIT_PREDICTION', value: 0.95, timestamp: '2024-01-01T00:00:00Z' },
    ])
    expect(state.stage).toBe('free_explore')
    expect(state.prediction).toEqual({ value: 0.95, timestamp: '2024-01-01T00:00:00Z' })
  })

  it('preserves prediction through all subsequent stages', () => {
    const state = applyActions([
      { type: 'COMMIT_PREDICTION', value: 0.42, timestamp: 'ts' },
      { type: 'FINISH_EXPLORATION' },
      { type: 'FINISH_GUIDED' },
      { type: 'SUBMIT_EXPLANATION' },
    ])
    expect(state.stage).toBe('complete')
    expect(state.prediction!.value).toBe(0.42)
  })

  it('prevents prediction overwrite after commit', () => {
    const state = applyActions([
      { type: 'COMMIT_PREDICTION', value: 0.95, timestamp: 'ts1' },
      { type: 'COMMIT_PREDICTION', value: 0.10, timestamp: 'ts2' },
    ])
    expect(state.prediction!.value).toBe(0.95)
    expect(state.stage).toBe('free_explore')
  })

  it('cannot skip from predict to guided_observation', () => {
    const state = applyActions([
      { type: 'FINISH_EXPLORATION' },
    ])
    expect(state.stage).toBe('predict')
  })

  it('cannot skip from predict to explain', () => {
    const state = applyActions([
      { type: 'SUBMIT_EXPLANATION' },
    ])
    expect(state.stage).toBe('predict')
  })

  it('cannot go backward from free_explore to predict', () => {
    const state = applyActions([
      { type: 'COMMIT_PREDICTION', value: 0.5, timestamp: 'ts' },
      { type: 'COMMIT_PREDICTION', value: 0.8, timestamp: 'ts2' },
    ])
    expect(state.stage).toBe('free_explore')
    expect(state.prediction!.value).toBe(0.5)
  })

  it('completes full flow: predict → free_explore → guided → explain → complete', () => {
    const state = applyActions([
      { type: 'COMMIT_PREDICTION', value: 0.9, timestamp: 'ts' },
      { type: 'FINISH_EXPLORATION' },
      { type: 'COMPLETE_GUIDED_STEP' },
      { type: 'COMPLETE_GUIDED_STEP' },
      { type: 'COMPLETE_GUIDED_STEP' },
      { type: 'FINISH_GUIDED' },
      { type: 'SUBMIT_EXPLANATION' },
    ])
    expect(state.stage).toBe('complete')
    expect(state.guidedStepsCompleted).toBe(3)
  })

  it('tracks guided steps completed', () => {
    const state = applyActions([
      { type: 'COMMIT_PREDICTION', value: 0.5, timestamp: 'ts' },
      { type: 'FINISH_EXPLORATION' },
      { type: 'COMPLETE_GUIDED_STEP' },
      { type: 'COMPLETE_GUIDED_STEP' },
    ])
    expect(state.stage).toBe('guided_observation')
    expect(state.guidedStepsCompleted).toBe(2)
  })

  it('ignores COMPLETE_GUIDED_STEP outside guided_observation', () => {
    const state = applyActions([
      { type: 'COMMIT_PREDICTION', value: 0.5, timestamp: 'ts' },
      { type: 'COMPLETE_GUIDED_STEP' },
    ])
    expect(state.guidedStepsCompleted).toBe(0)
  })

  it('cannot transition from complete to anything', () => {
    const state = applyActions([
      { type: 'COMMIT_PREDICTION', value: 0.5, timestamp: 'ts' },
      { type: 'FINISH_EXPLORATION' },
      { type: 'FINISH_GUIDED' },
      { type: 'SUBMIT_EXPLANATION' },
      { type: 'SUBMIT_EXPLANATION' },
    ])
    expect(state.stage).toBe('complete')
  })
})
