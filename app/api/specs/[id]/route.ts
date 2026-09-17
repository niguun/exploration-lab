import { NextResponse } from 'next/server'
import { loadActivitySpec } from '@/lib/persistence'
import { getBuiltinSpec } from '@/lib/builtin-specs'
import { validateActivitySpec } from '@/lib/activity-spec'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const builtin = getBuiltinSpec(id)
  if (builtin) return NextResponse.json(builtin)

  const diskSpec = await loadActivitySpec(id)
  if (diskSpec) {
    const v = validateActivitySpec(diskSpec)
    if (v.valid) return NextResponse.json(v.spec)
  }

  return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
}
