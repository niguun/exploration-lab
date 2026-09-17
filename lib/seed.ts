import { computeBayes } from './bayes'
import type { StudentTrace, TraceAction, ExplanationAnswer, StageTransition } from './trace'
import { classify } from './classifier'
import { saveTrace, saveAssessment } from './persistence'
import type { ReasoningAssessment } from './assessment-types'

const INITIAL_PARAMS = { prevalence: 0.01, sensitivity: 0.95, specificity: 0.95, population: 1000 }

interface TraceSpec {
  studentNum: number
  prediction: number
  sliders: { param: string; from: number; to: number }[]
  filters: string[]
  answers: [string, string, string]
}

function buildTrace(spec: TraceSpec): StudentTrace {
  const studentId = `demo_student_${String(spec.studentNum).padStart(2, '0')}`
  const traceId = `demo_trace_${String(spec.studentNum).padStart(2, '0')}`
  const baseTime = new Date('2024-06-15T10:00:00Z')
  const t = (min: number) => new Date(baseTime.getTime() + min * 60000).toISOString()

  const actions: TraceAction[] = []
  let at = 2

  for (const s of spec.sliders) {
    actions.push({
      id: `${traceId}_act_${at}`,
      phase: 'free_explore',
      type: 'slider_change',
      timestamp: t(at),
      detail: { parameter: s.param, from: s.from, to: s.to },
    })
    at += 0.5
  }

  let prevFilter = 'all'
  for (const f of spec.filters) {
    actions.push({
      id: `${traceId}_act_${at}`,
      phase: 'free_explore',
      type: 'filter_change',
      timestamp: t(at),
      detail: { from: prevFilter, to: f },
    })
    prevFilter = f
    at += 0.5
  }

  const gt = at + 1
  const guided = ['condition', 'test_results', 'positive_only']
  for (let i = 0; i < guided.length; i++) {
    actions.push({
      id: `${traceId}_guided_${i}`,
      phase: 'guided_observation',
      type: 'filter_change',
      timestamp: t(gt + i * 0.5),
      detail: { from: i === 0 ? prevFilter : guided[i - 1], to: guided[i] },
    })
  }

  const explanationAnswers: ExplanationAnswer[] = [
    { questionId: 'q_key_factor', selectedOptionId: spec.answers[0], timestamp: t(gt + 3) },
    { questionId: 'q_denominator', selectedOptionId: spec.answers[1], timestamp: t(gt + 4) },
    { questionId: 'q_prevalence_effect', selectedOptionId: spec.answers[2], timestamp: t(gt + 5) },
  ]

  const stageTransitions: StageTransition[] = [
    { stage: 'predict', timestamp: t(0) },
    { stage: 'free_explore', timestamp: t(1) },
    { stage: 'guided_observation', timestamp: t(gt - 0.5) },
    { stage: 'explain', timestamp: t(gt + 2) },
    { stage: 'complete', timestamp: t(gt + 6) },
  ]

  const posterior = computeBayes(INITIAL_PARAMS).posterior

  return {
    traceId,
    studentId,
    activityId: 'bayes_medical_test_v1',
    prediction: { value: spec.prediction, timestamp: t(1) },
    actions,
    explanationAnswers,
    stageTransitions,
    finalState: {
      prevalence: 0.01,
      sensitivity: 0.95,
      specificity: 0.95,
      layoutMode: 'positive_only',
      posterior,
    },
    startedAt: t(0),
    completedAt: t(gt + 6),
  }
}

const SPECS: TraceSpec[] = [
  // ── Base Rate Neglect (4) ──
  { studentNum: 1, prediction: 0.80,
    sliders: [{ param: 'sensitivity', from: 0.95, to: 0.90 }, { param: 'specificity', from: 0.95, to: 0.90 }],
    filters: ['test_results'],
    answers: ['q1_a', 'q2_c', 'q3_b'] },
  { studentNum: 2, prediction: 0.70,
    sliders: [{ param: 'sensitivity', from: 0.95, to: 0.85 }],
    filters: ['test_results'],
    answers: ['q1_d', 'q2_c', 'q3_d'] },
  { studentNum: 3, prediction: 0.75,
    sliders: [{ param: 'specificity', from: 0.95, to: 0.98 }],
    filters: [],
    answers: ['q1_b', 'q2_c', 'q3_b'] },
  { studentNum: 4, prediction: 0.60,
    sliders: [{ param: 'sensitivity', from: 0.95, to: 0.80 }],
    filters: [],
    answers: ['q1_c', 'q2_c', 'q3_b'] },

  // ── Sensitivity/Posterior Confusion (3) ──
  { studentNum: 5, prediction: 0.95,
    sliders: [{ param: 'prevalence', from: 0.01, to: 0.02 }],
    filters: ['test_results'],
    answers: ['q1_a', 'q2_a', 'q3_b'] },
  { studentNum: 6, prediction: 0.93,
    sliders: [{ param: 'sensitivity', from: 0.95, to: 0.99 }],
    filters: ['test_results'],
    answers: ['q1_a', 'q2_a', 'q3_a'] },
  { studentNum: 7, prediction: 0.92,
    sliders: [{ param: 'specificity', from: 0.95, to: 0.90 }],
    filters: ['test_results'],
    answers: ['q1_a', 'q2_a', 'q3_d'] },

  // ── Denominator Confusion (2) ──
  { studentNum: 8, prediction: 0.35,
    sliders: [{ param: 'prevalence', from: 0.01, to: 0.03 }, { param: 'sensitivity', from: 0.95, to: 0.90 }],
    filters: ['condition'],
    answers: ['q1_c', 'q2_d', 'q3_c'] },
  { studentNum: 9, prediction: 0.40,
    sliders: [{ param: 'sensitivity', from: 0.95, to: 0.85 }, { param: 'specificity', from: 0.95, to: 0.90 }],
    filters: ['condition'],
    answers: ['q1_a', 'q2_d', 'q3_c'] },

  // ── Correct Reasoning (3) ──
  { studentNum: 10, prediction: 0.15,
    sliders: [{ param: 'prevalence', from: 0.01, to: 0.05 }, { param: 'specificity', from: 0.95, to: 0.99 }],
    filters: ['condition', 'positive_only'],
    answers: ['q1_b', 'q2_b', 'q3_a'] },
  { studentNum: 11, prediction: 0.20,
    sliders: [{ param: 'prevalence', from: 0.01, to: 0.10 }, { param: 'sensitivity', from: 0.95, to: 0.90 }, { param: 'specificity', from: 0.95, to: 0.98 }],
    filters: ['condition', 'test_results', 'positive_only'],
    answers: ['q1_b', 'q2_b', 'q3_a'] },
  { studentNum: 12, prediction: 0.18,
    sliders: [{ param: 'prevalence', from: 0.01, to: 0.02 }],
    filters: ['test_results', 'positive_only'],
    answers: ['q1_b', 'q2_b', 'q3_a'] },

  // ── Recovered (3) ──
  { studentNum: 13, prediction: 0.95,
    sliders: [{ param: 'sensitivity', from: 0.95, to: 0.99 }],
    filters: ['test_results'],
    answers: ['q1_b', 'q2_b', 'q3_a'] },
  { studentNum: 14, prediction: 0.80,
    sliders: [{ param: 'sensitivity', from: 0.95, to: 0.85 }, { param: 'specificity', from: 0.95, to: 0.90 }],
    filters: ['test_results'],
    answers: ['q1_b', 'q2_b', 'q3_a'] },
  { studentNum: 15, prediction: 0.90,
    sliders: [{ param: 'sensitivity', from: 0.95, to: 0.98 }],
    filters: ['test_results'],
    answers: ['q1_b', 'q2_b', 'q3_a'] },

  // ── Insufficient Evidence (3) ──
  { studentNum: 16, prediction: 0.40,
    sliders: [],
    filters: [],
    answers: ['q1_c', 'q2_c', 'q3_c'] },
  { studentNum: 17, prediction: 0.70,
    sliders: [{ param: 'prevalence', from: 0.01, to: 0.05 }],
    filters: ['positive_only'],
    answers: ['q1_a', 'q2_c', 'q3_a'] },
  { studentNum: 18, prediction: 0.90,
    sliders: [],
    filters: [],
    answers: ['q1_b', 'q2_b', 'q3_a'] },

  // ── Not Recovered (1) ──
  { studentNum: 19, prediction: 0.75,
    sliders: [{ param: 'sensitivity', from: 0.95, to: 0.90 }],
    filters: ['test_results'],
    answers: ['q1_a', 'q2_c', 'q3_b'] },
]

export function generateDemoTraces(): StudentTrace[] {
  return SPECS.map(buildTrace)
}

export function classifyDemoTraces(): { trace: StudentTrace; assessment: ReasoningAssessment }[] {
  return generateDemoTraces().map(trace => ({
    trace,
    assessment: classify(trace),
  }))
}

export async function seedDemoData(): Promise<ReasoningAssessment[]> {
  const results = classifyDemoTraces()
  const assessments: ReasoningAssessment[] = []

  for (const { trace, assessment } of results) {
    await saveTrace(trace)
    await saveAssessment(assessment)
    assessments.push(assessment)
  }

  return assessments
}
