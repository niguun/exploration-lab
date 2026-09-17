import type { LayoutMode } from './bayes'

export interface GuidedStep {
  id: string
  instruction: string
  requiredFilter: LayoutMode
}

export const GUIDED_STEPS: GuidedStep[] = [
  {
    id: 'step_condition',
    instruction:
      "Switch to 'By Condition' — see how the population splits between those with and without the disease.",
    requiredFilter: 'condition',
  },
  {
    id: 'step_test_results',
    instruction:
      "Now switch to 'Test Results' — notice the four groups: true positives, false negatives, false positives, and true negatives.",
    requiredFilter: 'test_results',
  },
  {
    id: 'step_positive_only',
    instruction:
      "Click 'Positive Only' — these people form the denominator of P(Disease | Positive). The gold-to-total ratio IS the answer.",
    requiredFilter: 'positive_only',
  },
]

export interface QuestionOption {
  id: string
  text: string
  patternTag: string
}

export interface ExplanationQuestion {
  id: string
  text: string
  options: QuestionOption[]
  correctOptionId: string
}

export const EXPLANATION_QUESTIONS: ExplanationQuestion[] = [
  {
    id: 'q_key_factor',
    text: 'Which factor has the biggest impact on whether a positive test truly means disease?',
    options: [
      { id: 'q1_a', text: 'How accurate the test is (its sensitivity)', patternTag: 'sensitivity_posterior_confusion' },
      { id: 'q1_b', text: 'How common the condition is in the population (prevalence)', patternTag: 'correct' },
      { id: 'q1_c', text: 'The total number of people who were tested', patternTag: 'incorrect' },
      { id: 'q1_d', text: 'Whether the test was administered correctly', patternTag: 'irrelevant' },
    ],
    correctOptionId: 'q1_b',
  },
  {
    id: 'q_denominator',
    text: "In the 'Positive Only' view, what does the ratio of gold dots to total dots represent?",
    options: [
      { id: 'q2_a', text: 'The sensitivity of the test', patternTag: 'sensitivity_posterior_confusion' },
      { id: 'q2_b', text: 'The probability that someone who tested positive actually has the disease', patternTag: 'correct' },
      { id: 'q2_c', text: 'The prevalence of the disease in the population', patternTag: 'base_rate_neglect' },
      { id: 'q2_d', text: 'The false positive rate of the test', patternTag: 'specificity_confusion' },
    ],
    correctOptionId: 'q2_b',
  },
  {
    id: 'q_prevalence_effect',
    text: 'If the disease becomes 10× more common, what happens to the probability that a positive test means you actually have it?',
    options: [
      { id: 'q3_a', text: 'It increases substantially — more positive results will be true positives', patternTag: 'correct' },
      { id: 'q3_b', text: "It stays roughly the same — the test's accuracy determines this", patternTag: 'base_rate_neglect' },
      { id: 'q3_c', text: 'It decreases because there are more sick people overwhelming the test', patternTag: 'incorrect' },
      { id: 'q3_d', text: 'It depends only on sensitivity and specificity, not on prevalence', patternTag: 'base_rate_neglect' },
    ],
    correctOptionId: 'q3_a',
  },
]
