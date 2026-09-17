'use client'

import { useReducer, useRef, useCallback, useState, Suspense, lazy } from 'react'
import { flowReducer, initialFlowState } from '@/lib/flow'
import { createTraceId, createActionId } from '@/lib/trace'
import { assembleActivityTrace } from '@/lib/activity-trace'
import type { ActivitySpec } from '@/lib/activity-spec'
import type { TraceAction, ExplanationAnswer, StageTransition } from '@/lib/trace'
import type { RendererProps } from '@/lib/renderer-registry'
import GenericPredictionInput from './GenericPredictionInput'
import GenericGuidedOverlay from './GenericGuidedOverlay'
import GenericExplanationStep from './GenericExplanationStep'
import GenericCompleteSummary from './GenericCompleteSummary'

const RENDERERS: Record<string, React.ComponentType<RendererProps>> = {}

function getRendererComponent(type: string): React.ComponentType<RendererProps> | null {
  if (RENDERERS[type]) return RENDERERS[type]
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const mod = type === 'distributions' ? lazy(() => import('./renderers/DistributionsRenderer'))
      : type === 'simulation' ? lazy(() => import('./renderers/SimulationRenderer'))
      : type === 'matrix_transform' ? lazy(() => import('./renderers/MatrixTransformRenderer'))
      : null
    if (mod) RENDERERS[type] = mod
    return mod
  } catch { return null }
}

const STAGE_TO_NAV: Record<string, number> = {
  predict: 0, free_explore: 1, guided_observation: 2, explain: 3, complete: 4,
}

interface Props {
  spec: ActivitySpec
  studentId: string
}

export default function ActivityShell({ spec, studentId }: Props) {
  const [flow, dispatch] = useReducer(flowReducer, undefined, initialFlowState)
  const [submitted, setSubmitted] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  const traceIdRef = useRef(createTraceId())
  const actionsRef = useRef<TraceAction[]>([])
  const stageTransitionsRef = useRef<StageTransition[]>([{ stage: 'predict', timestamp: new Date().toISOString() }])
  const startedAtRef = useRef(new Date().toISOString())
  const flowStageRef = useRef(flow.stage)
  const rendererStateRef = useRef<Record<string, unknown>>({})
  flowStageRef.current = flow.stage

  const logAction = useCallback((type: string, detail: Record<string, unknown>) => {
    const phase = flowStageRef.current
    if (phase !== 'free_explore' && phase !== 'guided_observation') return
    actionsRef.current.push({
      id: createActionId(),
      phase: phase as 'free_explore' | 'guided_observation',
      type: type as 'slider_change' | 'filter_change' | 'stage_transition',
      timestamp: new Date().toISOString(),
      detail,
    })
  }, [])

  const handleRendererAction = useCallback((type: string, detail: Record<string, unknown>) => {
    setHasInteracted(true)
    rendererStateRef.current = { ...rendererStateRef.current, lastAction: type, ...detail }
    logAction(type, detail)
  }, [logAction])

  const commitPrediction = useCallback((value: number) => {
    const timestamp = new Date().toISOString()
    dispatch({ type: 'COMMIT_PREDICTION', value, timestamp })
    stageTransitionsRef.current.push({ stage: 'free_explore', timestamp })
    setHasInteracted(false)
  }, [])

  const finishExploration = useCallback(() => {
    const timestamp = new Date().toISOString()
    dispatch({ type: 'FINISH_EXPLORATION' })
    stageTransitionsRef.current.push({ stage: 'guided_observation', timestamp })
    setHasInteracted(false)
  }, [])

  const completeGuidedStep = useCallback(() => {
    dispatch({ type: 'COMPLETE_GUIDED_STEP' })
    setHasInteracted(false)
  }, [])

  const finishGuided = useCallback(() => {
    const timestamp = new Date().toISOString()
    dispatch({ type: 'FINISH_GUIDED' })
    stageTransitionsRef.current.push({ stage: 'explain', timestamp })
  }, [])

  const handleExplanationComplete = useCallback(async (answers: ExplanationAnswer[]) => {
    const timestamp = new Date().toISOString()
    dispatch({ type: 'SUBMIT_EXPLANATION' })
    stageTransitionsRef.current.push({ stage: 'complete', timestamp })

    const trace = assembleActivityTrace(
      traceIdRef.current, studentId, spec.id, spec.version,
      flow.prediction!, actionsRef.current, answers,
      stageTransitionsRef.current, rendererStateRef.current, startedAtRef.current,
    )

    try {
      await fetch('/api/trace/generic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trace),
      })
      setSubmitted(true)
    } catch {
      setSubmitted(true)
    }
  }, [flow.prediction, spec.id, spec.version, studentId])

  const RendererComponent = getRendererComponent(spec.rendererType)
  const navIndex = STAGE_TO_NAV[flow.stage] ?? 0

  return (
    <div className="activity-shell">
      {/* Phase indicator */}
      <div className="activity-phase-bar">
        {['PREDICT', 'EXPLORE', 'OBSERVE', 'EXPLAIN', 'COMPLETE'].map((label, i) => (
          <div key={label} className={`activity-phase-step ${navIndex === i ? 'active' : ''} ${navIndex > i ? 'done' : ''}`}>
            <div className="activity-phase-dot" />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="activity-header">
        <div className="breadcrumb">{spec.domain} · {spec.concept}</div>
        <h1 className="big-question">{spec.bigQuestion.split('\n').map((line, i) => (
          <span key={i}>{i > 0 && <br />}{line}</span>
        ))}</h1>
      </div>

      {/* Renderer area */}
      <div className="activity-renderer-area">
        {RendererComponent && (
          <Suspense fallback={<div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 40 }}>Loading visualization...</div>}>
            <RendererComponent
              config={spec.rendererConfig}
              onAction={handleRendererAction}
              interactive={flow.stage === 'free_explore' || flow.stage === 'guided_observation'}
            />
          </Suspense>
        )}
        {!RendererComponent && (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 40 }}>
            Renderer "{spec.rendererType}" not yet available.
          </div>
        )}
      </div>

      {/* "Done exploring" button during free_explore */}
      {flow.stage === 'free_explore' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <button className="la-preset-btn active" onClick={finishExploration} style={{ padding: '8px 20px' }}>
            Done exploring →
          </button>
        </div>
      )}

      {/* Stage overlays */}
      {flow.stage === 'predict' && (
        <GenericPredictionInput config={spec.prediction} onCommit={commitPrediction} />
      )}

      {flow.stage === 'guided_observation' && (
        <GenericGuidedOverlay
          steps={spec.guidedSteps}
          stepsCompleted={flow.guidedStepsCompleted}
          hasInteracted={hasInteracted}
          onStepComplete={completeGuidedStep}
          onFinish={finishGuided}
        />
      )}

      {flow.stage === 'explain' && (
        <GenericExplanationStep
          questions={spec.explanationQuestions}
          contextTitle={spec.bigQuestion}
          onComplete={handleExplanationComplete}
        />
      )}

      {flow.stage === 'complete' && (
        <GenericCompleteSummary
          title={spec.title}
          insight={spec.completionInsight}
          submitted={submitted}
        />
      )}
    </div>
  )
}
