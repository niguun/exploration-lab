import { NextResponse } from 'next/server'
import { validateActivityTrace } from '@/lib/activity-trace'
import { assessActivity } from '@/lib/activity-assessment'
import { loadActivitySpec } from '@/lib/persistence'
import { getBuiltinSpec } from '@/lib/builtin-specs'
import { validateActivitySpec } from '@/lib/activity-spec'
import type { ActivitySpec } from '@/lib/activity-spec'
import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')

async function ensureDirs() {
  await fs.mkdir(path.join(DATA_DIR, 'traces'), { recursive: true })
  await fs.mkdir(path.join(DATA_DIR, 'assessments'), { recursive: true })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = validateActivityTrace(body)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const trace = validation.trace
  await ensureDirs()

  const tracePath = path.join(DATA_DIR, 'traces', `${trace.traceId}.json`)
  try {
    await fs.access(tracePath)
    return NextResponse.json({ error: 'Duplicate trace', duplicate: true }, { status: 200 })
  } catch { /* not duplicate */ }

  await fs.writeFile(tracePath, JSON.stringify(trace, null, 2))

  let spec: ActivitySpec | null = null
  const diskSpec = await loadActivitySpec(trace.activityId)
  if (diskSpec) {
    const v = validateActivitySpec(diskSpec)
    if (v.valid) spec = v.spec
  }
  if (!spec) spec = getBuiltinSpec(trace.activityId)

  let assessment = null
  if (spec) {
    assessment = assessActivity(trace, spec)
    await fs.writeFile(
      path.join(DATA_DIR, 'assessments', `${trace.traceId}.json`),
      JSON.stringify(assessment, null, 2),
    )
  }

  return NextResponse.json({ assessment, duplicate: false }, { status: 201 })
}
