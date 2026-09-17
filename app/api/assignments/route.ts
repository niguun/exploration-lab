import { NextResponse } from 'next/server'
import { saveAssignment, type Assignment } from '@/lib/persistence'

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { activityId, pattern, recommendation, studentIds } = body
  if (!activityId || !pattern || !recommendation || !Array.isArray(studentIds)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const assignment: Assignment = {
    id: `assign_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    activityId: activityId as string,
    pattern: pattern as string,
    recommendation: recommendation as string,
    studentIds: studentIds as string[],
    createdAt: new Date().toISOString(),
  }

  await saveAssignment(assignment)
  return NextResponse.json({ assignment }, { status: 201 })
}
