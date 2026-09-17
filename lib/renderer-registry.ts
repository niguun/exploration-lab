import type { RendererType } from './activity-spec'

export interface RendererProps {
  config: Record<string, unknown>
  onAction: (type: string, detail: Record<string, unknown>) => void
  interactive: boolean
}

export interface RendererEntry {
  type: RendererType
  label: string
  domain: 'probability' | 'linear_algebra'
  description: string
}

const REGISTRY: Record<RendererType, RendererEntry> = {
  distributions: {
    type: 'distributions',
    label: 'Distribution Explorer',
    domain: 'probability',
    description: 'Drag probability mass to reshape discrete distributions and see how expectation and variance respond.',
  },
  simulation: {
    type: 'simulation',
    label: 'Monte Carlo Simulation',
    domain: 'probability',
    description: 'Run Bernoulli trials and watch the running proportion converge to the true probability.',
  },
  inference: {
    type: 'inference',
    label: 'Sampling Inference',
    domain: 'probability',
    description: 'Draw samples from a population and observe how the sampling distribution of the mean behaves.',
  },
  matrix_transform: {
    type: 'matrix_transform',
    label: 'Matrix Transformation',
    domain: 'linear_algebra',
    description: 'Manipulate a 2×2 matrix and see how it deforms the entire plane.',
  },
  basis: {
    type: 'basis',
    label: 'Basis Explorer',
    domain: 'linear_algebra',
    description: 'Drag basis vectors to reshape the coordinate system and see how coordinates change.',
  },
  determinant: {
    type: 'determinant',
    label: 'Determinant & Area',
    domain: 'linear_algebra',
    description: 'See how the determinant measures area scaling and orientation of a linear transformation.',
  },
  eigenvectors: {
    type: 'eigenvectors',
    label: 'Eigenvector Explorer',
    domain: 'linear_algebra',
    description: 'Find the directions that a matrix preserves — the eigenvectors.',
  },
  projections: {
    type: 'projections',
    label: 'Projection Explorer',
    domain: 'linear_algebra',
    description: 'Decompose a vector into its parallel and perpendicular components.',
  },
}

export function getRenderer(type: RendererType): RendererEntry | null {
  return REGISTRY[type] ?? null
}

export function listRenderers(): RendererEntry[] {
  return Object.values(REGISTRY)
}
