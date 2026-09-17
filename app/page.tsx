'use client'

import { Suspense, useState, useMemo, useCallback, useReducer, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import PhaseNav from '@/components/PhaseNav'
import LeftSidebar from '@/components/LeftSidebar'
import BottomPhaseNav from '@/components/BottomPhaseNav'
import PopulationCanvas from '@/components/PopulationCanvas'
import ParameterControls from '@/components/ParameterControls'
import PredictionInput from '@/components/PredictionInput'
import GuidedOverlay from '@/components/GuidedOverlay'
import ExplanationStep from '@/components/ExplanationStep'
import CompleteSummary from '@/components/CompleteSummary'
import { computeBayes, type LayoutMode } from '@/lib/bayes'
import { flowReducer, initialFlowState, type FlowStage } from '@/lib/flow'
import {
  createTraceId, createActionId, assembleTrace,
  type TraceAction, type ExplanationAnswer, type StageTransition, type StudentTrace,
} from '@/lib/trace'

const POPULATION = 1000
const ACTIVITY_ID = 'bayes_medical_test_v1'

const FILTERS: { mode: LayoutMode; label: string; primary?: boolean }[] = [
  { mode: 'all', label: 'Population' },
  { mode: 'condition', label: 'By Condition' },
  { mode: 'test_results', label: 'Test Results' },
  { mode: 'positive_only', label: 'Positive Only', primary: true },
]

const STAGE_TO_NAV: Record<FlowStage, number> = {
  predict: 0,
  free_explore: 1,
  guided_observation: 2,
  explain: 3,
  complete: 4,
}

function BayesActivityInner() {
  const searchParams = useSearchParams()
  const studentId = searchParams.get('student') || 'anonymous'

  const [flow, dispatch] = useReducer(flowReducer, initialFlowState())

  const [prevalence, setPrevalence] = useState(0.01)
  const [sensitivity, setSensitivity] = useState(0.95)
  const [specificity, setSpecificity] = useState(0.95)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('all')
  const [isDragging, setIsDragging] = useState(false)

  const traceIdRef = useRef(createTraceId())
  const startedAtRef = useRef(new Date().toISOString())
  const actionsRef = useRef<TraceAction[]>([])
  const stageTransitionsRef = useRef<StageTransition[]>([{ stage: 'predict', timestamp: new Date().toISOString() }])
  const sliderDragRef = useRef<{ param: string; value: number } | null>(null)
  const flowStageRef = useRef<FlowStage>('predict')
  flowStageRef.current = flow.stage

  const [completedTrace, setCompletedTrace] = useState<StudentTrace | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Follow-up assignment detection
  const [followUpBanner, setFollowUpBanner] = useState<{
    recommendation: string
    pattern: string
  } | null>(null)

  useEffect(() => {
    if (studentId === 'anonymous') return
    fetch(`/api/assignments/${studentId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.assignment) {
          setFollowUpBanner({
            recommendation: data.assignment.recommendation,
            pattern: data.assignment.pattern,
          })
        }
      })
      .catch(() => {})
  }, [studentId])

  const result = useMemo(
    () => computeBayes({ prevalence, sensitivity, specificity, population: POPULATION }),
    [prevalence, sensitivity, specificity],
  )

  const logAction = useCallback((type: TraceAction['type'], detail: Record<string, unknown>) => {
    const stage = flowStageRef.current
    if (stage !== 'free_explore' && stage !== 'guided_observation') return
    actionsRef.current.push({
      id: createActionId(),
      phase: stage,
      type,
      timestamp: new Date().toISOString(),
      detail,
    })
  }, [])

  const recordStageTransition = useCallback((stage: FlowStage) => {
    const ts = new Date().toISOString()
    stageTransitionsRef.current.push({ stage, timestamp: ts })
  }, [])

  const commitPrediction = useCallback((value: number) => {
    const ts = new Date().toISOString()
    dispatch({ type: 'COMMIT_PREDICTION', value, timestamp: ts })
    recordStageTransition('free_explore')
  }, [recordStageTransition])

  const handleFinishExploration = useCallback(() => {
    logAction('stage_transition', { to: 'guided_observation' })
    dispatch({ type: 'FINISH_EXPLORATION' })
    recordStageTransition('guided_observation')
  }, [logAction, recordStageTransition])

  const handleGuidedStepComplete = useCallback(() => {
    dispatch({ type: 'COMPLETE_GUIDED_STEP' })
  }, [])

  const handleFinishGuided = useCallback(() => {
    logAction('stage_transition', { to: 'explain' })
    dispatch({ type: 'FINISH_GUIDED' })
    recordStageTransition('explain')
  }, [logAction, recordStageTransition])

  const handleExplanationComplete = useCallback((answers: ExplanationAnswer[]) => {
    dispatch({ type: 'SUBMIT_EXPLANATION' })
    recordStageTransition('complete')

    const trace = assembleTrace(
      traceIdRef.current,
      studentId,
      ACTIVITY_ID,
      flow.prediction!,
      actionsRef.current,
      answers,
      stageTransitionsRef.current,
      { prevalence, sensitivity, specificity, layoutMode, posterior: result.posterior },
      startedAtRef.current,
    )
    setCompletedTrace(trace)

    fetch('/api/trace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trace),
    })
      .then(r => r.json())
      .then(() => setSubmitted(true))
      .catch(() => setSubmitted(true))
  }, [studentId, flow.prediction, prevalence, sensitivity, specificity, layoutMode, result.posterior, recordStageTransition])

  const handleSliderDragStart = useCallback((param: string, value: number) => {
    setIsDragging(true)
    sliderDragRef.current = { param, value }
  }, [])

  const handleSliderDragEnd = useCallback((param: string, value: number) => {
    setIsDragging(false)
    const start = sliderDragRef.current
    if (start && start.value !== value) {
      logAction('slider_change', { parameter: start.param, from: start.value, to: value })
    }
    sliderDragRef.current = null
  }, [logAction])

  const handleFilterChange = useCallback((mode: LayoutMode) => {
    const prev = layoutMode
    setLayoutMode(mode)
    if (prev !== mode) {
      logAction('filter_change', { from: prev, to: mode })
    }
  }, [layoutMode, logAction])

  const controlsLocked = flow.stage === 'predict'
  const posteriorPct = (result.posterior * 100).toFixed(1)
  const circumference = 2 * Math.PI * 20
  const filled = circumference * result.posterior
  const empty = circumference - filled

  return (
    <div className="scene">
      <PhaseNav />
      <LeftSidebar />

      <div className="stage">
        <div className="stage-top">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="breadcrumb">Probability Explorer</div>
              <h1 className="big-question">
                If the test is <span className="hl">positive</span>,<br />
                how likely is the condition?
              </h1>
            </div>
            <div className="floating-quote" style={{ textAlign: 'right', flexShrink: 0, marginLeft: 32, marginTop: 4 }}>
              &ldquo;Base rates<br />change everything.&rdquo;
            </div>
          </div>
        </div>

        <div className="stage-center">
          <div className="canvas-area">
            {/* Controls rail — overlaid left */}
            <div className="controls-rail">
              <ParameterControls
                prevalence={prevalence}
                sensitivity={sensitivity}
                specificity={specificity}
                onPrevalenceChange={setPrevalence}
                onSensitivityChange={setSensitivity}
                onSpecificityChange={setSpecificity}
                onSliderDragStart={handleSliderDragStart}
                onSliderDragEnd={handleSliderDragEnd}
                disabled={controlsLocked}
              />
            </div>

            {/* Population label + legend */}
            <div className="canvas-toolbar">
              <div className="canvas-toolbar-left">
                <span className="canvas-title">
                  Entire Population
                  <span className="canvas-subtitle">
                    &nbsp;&middot;&nbsp;{result.totalPopulation.toLocaleString()} people
                  </span>
                </span>
                <div className="legend-row">
                  <div className="legend-item">
                    <div className="legend-dot" style={{ background: 'var(--dot-diseased)' }} />
                    Condition ({Math.round(prevalence * 100)}%)
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot" style={{ background: 'var(--dot-healthy)' }} />
                    Healthy ({Math.round((1 - prevalence) * 100)}%)
                  </div>
                </div>
              </div>

              <div className="filter-bar">
                {FILTERS.map(f => (
                  <button
                    key={f.mode}
                    className={`filter-btn ${f.primary ? 'primary-action' : ''} ${layoutMode === f.mode ? 'active' : ''}`}
                    onClick={() => handleFilterChange(f.mode)}
                    disabled={controlsLocked}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <PopulationCanvas result={result} layoutMode={layoutMode} isDragging={isDragging} />

            {/* Right-side readouts: visible during explore/guided stages */}
            {!controlsLocked && flow.stage !== 'explain' && flow.stage !== 'complete' && (
              <div className="right-readouts">
                {flow.prediction && (
                  <div className="prediction-badge">
                    <div className="prediction-badge-label">Your Prediction</div>
                    <div className="prediction-badge-value">{Math.round(flow.prediction.value * 100)}%</div>
                  </div>
                )}

                <div className="readout-posterior">
                  <div className="readout-posterior-label">P(D | +)</div>
                  <div className="readout-posterior-row">
                    <div className="readout-ring" style={{ width: 46, height: 46 }}>
                      <svg width={46} height={46} viewBox="0 0 46 46">
                        <circle cx={23} cy={23} r={20} fill="none" stroke="rgba(232,226,214,0.06)" strokeWidth={3.5} />
                        <circle
                          cx={23} cy={23} r={20} fill="none"
                          stroke="var(--gold)"
                          strokeWidth={3.5}
                          strokeDasharray={`${filled} ${empty}`}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dasharray 0.4s ease' }}
                        />
                      </svg>
                      <div className="readout-ring-label">{(result.posterior * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="readout-big">
                        <span className="readout-approx">&asymp;</span>
                        {posteriorPct}%
                      </div>
                    </div>
                  </div>
                  <div className="readout-sub">
                    {result.truePositive} of {result.totalPositive} positive tests
                  </div>
                </div>

                <div className="readout-breakdown">
                  <div className="readout-breakdown-row">
                    <div className="readout-dot" style={{ background: 'var(--dot-diseased)' }} />
                    True pos: <strong>{result.truePositive}</strong>
                  </div>
                  <div className="readout-breakdown-row">
                    <div className="readout-dot" style={{ background: 'var(--dot-healthy)' }} />
                    False pos: <strong>{result.falsePositive}</strong>
                  </div>
                </div>

                <div className="readout-annotation">
                  The ratio of gold to total in &ldquo;Positive Only&rdquo; is the answer.
                </div>

                {flow.stage === 'free_explore' && (
                  <button className="advance-btn" onClick={handleFinishExploration}>
                    Done exploring &rarr;
                  </button>
                )}
              </div>
            )}

            {/* Follow-up banner (shows before prediction when assignment exists) */}
            {flow.stage === 'predict' && followUpBanner && (
              <div className="predict-overlay">
                <div className="predict-card followup-entrance" style={{ maxWidth: 440 }}>
                  <div className="followup-badge">Follow-Up Activity</div>
                  <h2 className="predict-heading" style={{ fontSize: '1.1rem', marginTop: 12 }}>
                    Your teacher wants you to try again
                  </h2>
                  <p className="followup-rec">
                    &ldquo;{followUpBanner.recommendation}&rdquo;
                  </p>
                  <p className="followup-hint">
                    This time, pay close attention to how prevalence affects the result.
                  </p>
                  <button
                    className="predict-commit"
                    onClick={() => setFollowUpBanner(null)}
                  >
                    Begin Follow-Up
                  </button>
                </div>
              </div>
            )}

            {/* Normal prediction input (no follow-up banner) */}
            {flow.stage === 'predict' && !followUpBanner && (
              <PredictionInput
                prevalence={prevalence}
                sensitivity={sensitivity}
                specificity={specificity}
                onCommit={commitPrediction}
              />
            )}

            {flow.stage === 'guided_observation' && (
              <GuidedOverlay
                currentFilter={layoutMode}
                stepsCompleted={flow.guidedStepsCompleted}
                onStepComplete={handleGuidedStepComplete}
                onFinish={handleFinishGuided}
              />
            )}

            {flow.stage === 'explain' && flow.prediction && (
              <ExplanationStep
                predictionValue={flow.prediction.value}
                posterior={result.posterior}
                onComplete={handleExplanationComplete}
              />
            )}

            {flow.stage === 'complete' && completedTrace && (
              <CompleteSummary trace={completedTrace} submitted={submitted} />
            )}
          </div>
        </div>

        <div className="bottom-strip">
          <div className="bottom-strip-left">
            <div>
              <span className="result-label">Observed Result</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="result-big">{posteriorPct}%</span>
                <span className="result-context">
                  probability of disease, given a positive test
                </span>
              </div>
            </div>
          </div>

          <div className="equation-inline">
            <span className="equation-var" style={{ color: 'var(--text-secondary)' }}>P(D|+)</span>
            <span className="equation-eq">&nbsp;=&nbsp;</span>
            <span className="equation-fraction">
              <span className="equation-num">
                <span className="equation-var gold">P(+|D)</span>
                <span className="equation-eq"> &middot; </span>
                <span className="equation-var gold">P(D)</span>
              </span>
              <span className="equation-den">
                <span className="equation-var gold">P(+|D)</span>
                <span className="equation-eq"> &middot; </span>
                <span className="equation-var gold">P(D)</span>
                <span className="equation-eq"> + </span>
                <span className="equation-var blue">P(+|&not;D)</span>
                <span className="equation-eq"> &middot; </span>
                <span className="equation-var blue">P(&not;D)</span>
              </span>
            </span>
            <span className="equation-result">&nbsp;= {posteriorPct}%</span>
          </div>
        </div>
      </div>

      <BottomPhaseNav activeIndex={STAGE_TO_NAV[flow.stage]} />
    </div>
  )
}

export default function BayesActivity() {
  return (
    <Suspense>
      <BayesActivityInner />
    </Suspense>
  )
}
