import { NextResponse } from 'next/server'
import { listActivitySpecs, saveActivitySpec } from '@/lib/persistence'
import { validateActivitySpec } from '@/lib/activity-spec'
import { BUILTIN_SPECS } from '@/lib/builtin-specs'

export async function GET() {
  const diskSpecs = await listActivitySpecs()
  const builtinIds = new Set(BUILTIN_SPECS.map(s => s.id))
  const custom = diskSpecs.filter(s => !builtinIds.has(s.id as string))
  return NextResponse.json({ specs: [...BUILTIN_SPECS, ...custom] })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = validateActivitySpec(body)
  if (!result.valid) {
    return NextResponse.json({ errors: result.errors }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await saveActivitySpec(result.spec as any)
  return NextResponse.json({ spec: result.spec }, { status: 201 })
}
