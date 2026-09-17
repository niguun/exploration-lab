import { NextResponse } from 'next/server'
import { loadAssessmentsByActivity } from '@/lib/persistence'
import { aggregateAssessments } from '@/lib/aggregation'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const { activityId } = await params
  const assessments = await loadAssessmentsByActivity(activityId)

  if (assessments.length === 0) {
    return NextResponse.json(
      { error: 'No assessments found for this activity' },
      { status: 404 },
    )
  }

  const aggregation = aggregateAssessments(activityId, assessments)
  return NextResponse.json(aggregation)
}
