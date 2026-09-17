import { NextResponse } from 'next/server'
import { loadAssignmentsForStudent } from '@/lib/persistence'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params
  const assignments = await loadAssignmentsForStudent(studentId)

  if (assignments.length === 0) {
    return NextResponse.json({ assignment: null })
  }

  const latest = assignments[assignments.length - 1]
  return NextResponse.json({ assignment: latest })
}
