import { NextResponse } from 'next/server'

const ACTIVITIES: Record<string, object> = {
  bayes_medical_test_v1: {
    id: 'bayes_medical_test_v1',
    title: 'Medical Test Accuracy',
    description: 'Explore how disease prevalence, test sensitivity, and specificity affect the probability that a positive test result is a true positive.',
    defaultParams: {
      prevalence: 0.01,
      sensitivity: 0.95,
      specificity: 0.95,
      population: 1000,
    },
    guidedSteps: 3,
    explanationQuestions: 3,
  },
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const activity = ACTIVITIES[id]

  if (!activity) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
  }

  return NextResponse.json(activity)
}
