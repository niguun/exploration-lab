export type FlowStage = 'predict' | 'free_explore' | 'guided_observation' | 'explain' | 'complete'

export interface FlowState {
  stage: FlowStage
  prediction: { value: number; timestamp: string } | null
  guidedStepsCompleted: number
}

export type FlowAction =
  | { type: 'COMMIT_PREDICTION'; value: number; timestamp: string }
  | { type: 'FINISH_EXPLORATION' }
  | { type: 'COMPLETE_GUIDED_STEP' }
  | { type: 'FINISH_GUIDED' }
  | { type: 'SUBMIT_EXPLANATION' }

export function initialFlowState(): FlowState {
  return { stage: 'predict', prediction: null, guidedStepsCompleted: 0 }
}

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'COMMIT_PREDICTION':
      if (state.stage !== 'predict') return state
      return {
        ...state,
        stage: 'free_explore',
        prediction: { value: action.value, timestamp: action.timestamp },
      }

    case 'FINISH_EXPLORATION':
      if (state.stage !== 'free_explore') return state
      return { ...state, stage: 'guided_observation' }

    case 'COMPLETE_GUIDED_STEP':
      if (state.stage !== 'guided_observation') return state
      return { ...state, guidedStepsCompleted: state.guidedStepsCompleted + 1 }

    case 'FINISH_GUIDED':
      if (state.stage !== 'guided_observation') return state
      return { ...state, stage: 'explain' }

    case 'SUBMIT_EXPLANATION':
      if (state.stage !== 'explain') return state
      return { ...state, stage: 'complete' }

    default:
      return state
  }
}
