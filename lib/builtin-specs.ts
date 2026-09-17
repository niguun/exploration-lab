import type { ActivitySpec } from './activity-spec'

export const BUILTIN_SPECS: ActivitySpec[] = [
  {
    id: 'distributions_expected_value',
    version: 1,
    title: 'Expected Value & Variance',
    bigQuestion: 'Where does the expected value actually live?',
    domain: 'Probability',
    concept: 'Expected Value',
    learningObjective: 'Understand that E[X] is the balance point of a distribution, and variance measures spread around it.',
    rendererType: 'distributions',
    rendererConfig: {},
    prediction: {
      prompt: 'A distribution has most of its mass split between values 1 and 5. Where do you think the expected value will be?',
      inputType: 'slider_custom',
      min: 0,
      max: 6,
      step: 0.1,
      unit: '',
      contextLines: [
        'A discrete distribution over values 0–6.',
        'You can drag probability bars to reshape it.',
      ],
    },
    guidedSteps: [
      { id: 'gs_centered', instruction: 'Select the "Centered" preset. Observe where E[X] falls relative to the peak.' },
      { id: 'gs_bimodal', instruction: 'Now select "Bimodal". Notice that E[X] sits between the two peaks — where almost no probability lives.' },
      { id: 'gs_spread', instruction: 'Select "Same Mean · More Spread". The mean stays fixed, but watch what happens to variance.' },
    ],
    explanationQuestions: [
      {
        id: 'eq_balance',
        text: 'When probability is split evenly between values 1 and 5, where is the expected value?',
        options: [
          { id: 'eq_balance_a', text: 'At value 1, because it has the most mass on the left', tag: 'mode_confusion' },
          { id: 'eq_balance_b', text: 'At value 3, the balance point between the two peaks', tag: 'correct' },
          { id: 'eq_balance_c', text: 'It depends on which peak is taller', tag: 'mode_confusion' },
          { id: 'eq_balance_d', text: 'Undefined, because no probability sits at value 3', tag: 'misunderstanding' },
        ],
        correctOptionId: 'eq_balance_b',
      },
      {
        id: 'eq_variance',
        text: 'Two distributions have the same mean. Distribution A is concentrated near the center; B is spread across the extremes. Which has higher variance?',
        options: [
          { id: 'eq_variance_a', text: 'Distribution A — more probability at the center means more variance', tag: 'inverted_variance' },
          { id: 'eq_variance_b', text: 'Distribution B — values farther from the mean contribute more to variance', tag: 'correct' },
          { id: 'eq_variance_c', text: 'They have the same variance since the mean is the same', tag: 'mean_variance_confusion' },
        ],
        correctOptionId: 'eq_variance_b',
      },
      {
        id: 'eq_mean_mode',
        text: 'Can the expected value be at a point where the probability is zero?',
        options: [
          { id: 'eq_mean_mode_a', text: 'No — the expected value must be where probability is highest', tag: 'mode_confusion' },
          { id: 'eq_mean_mode_b', text: 'Yes — the bimodal distribution demonstrates exactly this', tag: 'correct' },
          { id: 'eq_mean_mode_c', text: 'Only in continuous distributions, not discrete ones', tag: 'misunderstanding' },
        ],
        correctOptionId: 'eq_mean_mode_b',
      },
    ],
    completionInsight: 'The expected value is the balance point of a distribution — it can live where no probability exists. Variance measures how far the mass spreads from that center.',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'simulation_law_of_large_numbers',
    version: 1,
    title: 'Law of Large Numbers',
    bigQuestion: 'When does randomness become predictable?',
    domain: 'Probability',
    concept: 'Law of Large Numbers',
    learningObjective: 'Understand that observed frequencies converge to theoretical probability as trials increase.',
    rendererType: 'simulation',
    rendererConfig: {},
    prediction: {
      prompt: 'After 10 coin flips with P(heads) = 0.30, how close will the observed proportion be to 0.30?',
      inputType: 'slider_0_100',
      contextLines: [
        'A biased coin with P(heads) = 30%.',
        'You will flip it many times and watch the running proportion.',
      ],
    },
    guidedSteps: [
      { id: 'gs_one', instruction: 'Click "+1 Trial" a few times. Notice how erratic the running proportion is with very few trials.' },
      { id: 'gs_hundred', instruction: 'Now click "+100 Trials". The proportion starts settling but still fluctuates.' },
      { id: 'gs_ten_thousand', instruction: 'Click "Run 10,000". Watch the trajectory — it locks onto the true probability.' },
    ],
    explanationQuestions: [
      {
        id: 'eq_converge',
        text: 'Why does the observed proportion stabilize near 0.30 after many trials?',
        options: [
          { id: 'eq_converge_a', text: 'The coin "remembers" past flips and self-corrects', tag: 'gamblers_fallacy' },
          { id: 'eq_converge_b', text: 'Individual randomness averages out — extreme runs become proportionally smaller', tag: 'correct' },
          { id: 'eq_converge_c', text: 'After enough trials, every flip becomes deterministic', tag: 'misunderstanding' },
        ],
        correctOptionId: 'eq_converge_b',
      },
      {
        id: 'eq_small_sample',
        text: 'After just 10 flips, you observe 6 heads (60%). Does this mean the coin is unfair?',
        options: [
          { id: 'eq_small_a', text: 'Yes — 60% is far from 30%, so the coin must be biased differently', tag: 'small_sample_overconfidence' },
          { id: 'eq_small_b', text: 'Not necessarily — small samples have high natural variability', tag: 'correct' },
          { id: 'eq_small_c', text: 'We need exactly 100 flips to know if a coin is fair', tag: 'magic_number' },
        ],
        correctOptionId: 'eq_small_b',
      },
      {
        id: 'eq_guarantee',
        text: 'Does the law of large numbers guarantee the proportion will equal 0.30 exactly?',
        options: [
          { id: 'eq_guarantee_a', text: 'Yes — with infinite trials it must be exactly 0.30', tag: 'exact_convergence' },
          { id: 'eq_guarantee_b', text: 'No — it converges close to 0.30, but any finite sample may differ slightly', tag: 'correct' },
          { id: 'eq_guarantee_c', text: 'Only if the trials are truly independent', tag: 'partial_understanding' },
        ],
        correctOptionId: 'eq_guarantee_b',
      },
    ],
    completionInsight: 'Short runs are wild — randomness dominates. But as trials accumulate, the proportion locks onto the true probability. The law of large numbers is about averages stabilizing, not individual outcomes becoming predictable.',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'matrix_transform_space',
    version: 1,
    title: 'Matrix Transformations',
    bigQuestion: 'What does a matrix do to space?',
    domain: 'Linear Algebra',
    concept: 'Linear Transformations',
    learningObjective: 'Understand that a 2×2 matrix defines a linear transformation by specifying where the basis vectors land.',
    rendererType: 'matrix_transform',
    rendererConfig: {},
    prediction: {
      prompt: 'A shear matrix keeps horizontal lines fixed but tilts vertical lines. What happens to the area of the unit square?',
      inputType: 'slider_custom',
      min: 0,
      max: 4,
      step: 0.1,
      unit: '×',
      contextLines: [
        'A 2×2 matrix A acts on every point in the plane.',
        'The unit square maps to a parallelogram.',
      ],
    },
    guidedSteps: [
      { id: 'gs_identity', instruction: 'Select the "Identity" preset. Verify that nothing moves — the identity transformation preserves everything.' },
      { id: 'gs_shear', instruction: 'Now select "Shear". Watch how Ae₁ stays fixed while Ae₂ tilts. The parallelogram has the same area as the original square.' },
      { id: 'gs_collapse', instruction: 'Select "Collapse". The parallelogram degenerates — det(A) = 0 means the transformation crushes a dimension.' },
    ],
    explanationQuestions: [
      {
        id: 'eq_basis',
        text: 'A matrix is completely determined by:',
        options: [
          { id: 'eq_basis_a', text: 'Where it sends the basis vectors e₁ and e₂', tag: 'correct' },
          { id: 'eq_basis_b', text: 'Its trace (sum of diagonal entries)', tag: 'trace_confusion' },
          { id: 'eq_basis_c', text: 'How it transforms the origin', tag: 'origin_confusion' },
          { id: 'eq_basis_d', text: 'The eigenvalues alone', tag: 'eigenvalue_confusion' },
        ],
        correctOptionId: 'eq_basis_a',
      },
      {
        id: 'eq_det_area',
        text: 'What does det(A) tell you geometrically?',
        options: [
          { id: 'eq_det_a', text: 'The signed area scaling factor — how much the unit square area changes', tag: 'correct' },
          { id: 'eq_det_b', text: 'The angle of rotation', tag: 'rotation_confusion' },
          { id: 'eq_det_c', text: 'The length of the longest eigenvector', tag: 'eigenvector_confusion' },
        ],
        correctOptionId: 'eq_det_a',
      },
      {
        id: 'eq_singular',
        text: 'When det(A) = 0, what happens to space?',
        options: [
          { id: 'eq_singular_a', text: 'Nothing — det = 0 means the identity', tag: 'det_misunderstanding' },
          { id: 'eq_singular_b', text: 'Space collapses by at least one dimension — information is lost', tag: 'correct' },
          { id: 'eq_singular_c', text: 'All vectors point in the same direction', tag: 'partial_understanding' },
        ],
        correctOptionId: 'eq_singular_b',
      },
    ],
    completionInsight: 'A matrix is a rule for reshaping space. It is fully defined by where it sends the basis vectors. The determinant measures how area scales — when it hits zero, the transformation crushes a dimension.',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'inference_sampling_variability',
    version: 1,
    title: 'Sampling Variability',
    bigQuestion: 'Why does the sample mean settle down?',
    domain: 'Probability',
    concept: 'Sampling Distributions',
    learningObjective: 'Understand that larger samples produce less variable sample means, and the sampling distribution concentrates around the true mean.',
    rendererType: 'inference',
    rendererConfig: {},
    prediction: {
      prompt: 'You draw 100 samples of size n=5 and 100 samples of size n=50. Which set of sample means will be more spread out?',
      inputType: 'slider_0_100',
      contextLines: [
        'A population of 1000 values with a known mean.',
        'You will draw many samples and observe their means.',
      ],
    },
    guidedSteps: [
      { id: 'gs_small', instruction: 'Set the sample size to n = 5 and click "Draw 100 Samples". Notice how spread out the sample means are.' },
      { id: 'gs_large', instruction: 'Now change to n = 50 and reset. Draw 100 samples again. The means cluster much more tightly around the population mean.' },
      { id: 'gs_compare', instruction: 'Compare the two histograms mentally: same center, very different spread. Larger n → narrower sampling distribution.' },
    ],
    explanationQuestions: [
      {
        id: 'eq_spread',
        text: 'Why are sample means less variable with larger sample sizes?',
        options: [
          { id: 'eq_spread_a', text: 'Larger samples have more extreme values that cancel out individual noise', tag: 'correct' },
          { id: 'eq_spread_b', text: 'The population changes when you take larger samples', tag: 'population_confusion' },
          { id: 'eq_spread_c', text: 'Larger samples are biased toward the mean', tag: 'bias_confusion' },
        ],
        correctOptionId: 'eq_spread_a',
      },
      {
        id: 'eq_center',
        text: 'Where does the sampling distribution of the mean center?',
        options: [
          { id: 'eq_center_a', text: 'At the sample mean of the most recent sample', tag: 'recent_sample_confusion' },
          { id: 'eq_center_b', text: 'At the population mean, regardless of sample size', tag: 'correct' },
          { id: 'eq_center_c', text: 'Somewhere between the population mean and the sample median', tag: 'misunderstanding' },
        ],
        correctOptionId: 'eq_center_b',
      },
      {
        id: 'eq_single',
        text: 'A single sample of n = 50 gives a mean of 72.1, but the population mean is 70.0. Is this a problem?',
        options: [
          { id: 'eq_single_a', text: 'Yes — the sample must be biased', tag: 'sampling_error_confusion' },
          { id: 'eq_single_b', text: 'No — any single sample may deviate; the sampling distribution tells us how much to expect', tag: 'correct' },
          { id: 'eq_single_c', text: 'We need at least n = 200 to trust the sample mean', tag: 'magic_number' },
        ],
        correctOptionId: 'eq_single_b',
      },
    ],
    completionInsight: 'Every sample mean is a little off — that is sampling variability. But larger samples produce means that cluster tightly around the truth. The sampling distribution shows us how much uncertainty a given sample size carries.',
    createdAt: '2024-01-01T00:00:00Z',
  },
]

export function getBuiltinSpec(id: string): ActivitySpec | null {
  return BUILTIN_SPECS.find(s => s.id === id) ?? null
}
