import { promises as fs } from 'fs'
import path from 'path'
import type { StudentTrace } from './trace'
import type { ReasoningAssessment } from './assessment-types'

const DATA_DIR = path.join(process.cwd(), 'data')
const TRACES_DIR = path.join(DATA_DIR, 'traces')
const ASSESSMENTS_DIR = path.join(DATA_DIR, 'assessments')

async function ensureDirs() {
  await fs.mkdir(TRACES_DIR, { recursive: true })
  await fs.mkdir(ASSESSMENTS_DIR, { recursive: true })
}

export async function saveTrace(
  trace: StudentTrace,
): Promise<{ saved: boolean; duplicate: boolean }> {
  await ensureDirs()
  const filePath = path.join(TRACES_DIR, `${trace.traceId}.json`)

  try {
    await fs.access(filePath)
    return { saved: false, duplicate: true }
  } catch {
    await fs.writeFile(filePath, JSON.stringify(trace, null, 2))
    return { saved: true, duplicate: false }
  }
}

export async function loadTrace(traceId: string): Promise<StudentTrace | null> {
  try {
    const filePath = path.join(TRACES_DIR, `${traceId}.json`)
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

export async function saveAssessment(assessment: ReasoningAssessment): Promise<void> {
  await ensureDirs()
  const filePath = path.join(ASSESSMENTS_DIR, `${assessment.traceId}.json`)
  await fs.writeFile(filePath, JSON.stringify(assessment, null, 2))
}

export async function loadAssessment(traceId: string): Promise<ReasoningAssessment | null> {
  try {
    const filePath = path.join(ASSESSMENTS_DIR, `${traceId}.json`)
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

export async function loadAssessmentsByActivity(
  activityId: string,
): Promise<ReasoningAssessment[]> {
  await ensureDirs()
  const results: ReasoningAssessment[] = []

  let files: string[]
  try {
    files = await fs.readdir(ASSESSMENTS_DIR)
  } catch {
    return []
  }

  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const data = await fs.readFile(path.join(ASSESSMENTS_DIR, file), 'utf-8')
      const assessment: ReasoningAssessment = JSON.parse(data)
      if (assessment.activityId === activityId) {
        results.push(assessment)
      }
    } catch {
      // Skip malformed files
    }
  }

  return results
}

export async function loadAllAssessments(): Promise<ReasoningAssessment[]> {
  await ensureDirs()
  const results: ReasoningAssessment[] = []
  let files: string[]
  try {
    files = await fs.readdir(ASSESSMENTS_DIR)
  } catch {
    return []
  }
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const data = await fs.readFile(path.join(ASSESSMENTS_DIR, file), 'utf-8')
      results.push(JSON.parse(data))
    } catch {
      // skip malformed
    }
  }
  return results
}

/* ── Assignments ── */

export interface Assignment {
  id: string
  activityId: string
  pattern: string
  recommendation: string
  studentIds: string[]
  createdAt: string
}

const ASSIGNMENTS_FILE = path.join(DATA_DIR, 'assignments.json')

export async function saveAssignment(assignment: Assignment): Promise<void> {
  await ensureDirs()
  const existing = await loadAssignments()
  existing.push(assignment)
  await fs.writeFile(ASSIGNMENTS_FILE, JSON.stringify(existing, null, 2))
}

export async function loadAssignments(): Promise<Assignment[]> {
  try {
    const data = await fs.readFile(ASSIGNMENTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function loadAssignmentsForStudent(
  studentId: string,
): Promise<Assignment[]> {
  const all = await loadAssignments()
  return all.filter(a => a.studentIds.includes(studentId))
}

export async function clearData(): Promise<void> {
  try {
    await fs.rm(DATA_DIR, { recursive: true, force: true })
  } catch {
    // Already clean
  }
}

/* ── Activity Specs ── */

const SPECS_DIR = path.join(DATA_DIR, 'specs')

async function ensureSpecsDir() {
  await fs.mkdir(SPECS_DIR, { recursive: true })
}

export async function saveActivitySpec(spec: { id: string; [key: string]: unknown }): Promise<void> {
  await ensureSpecsDir()
  const filePath = path.join(SPECS_DIR, `${spec.id}.json`)
  await fs.writeFile(filePath, JSON.stringify(spec, null, 2))
}

export async function loadActivitySpec(id: string): Promise<{ id: string; [key: string]: unknown } | null> {
  try {
    const data = await fs.readFile(path.join(SPECS_DIR, `${id}.json`), 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

export async function listActivitySpecs(): Promise<{ id: string; [key: string]: unknown }[]> {
  try {
    await ensureSpecsDir()
    const files = await fs.readdir(SPECS_DIR)
    const results: { id: string; [key: string]: unknown }[] = []
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      try {
        const data = await fs.readFile(path.join(SPECS_DIR, file), 'utf-8')
        results.push(JSON.parse(data))
      } catch { /* skip malformed */ }
    }
    return results
  } catch {
    return []
  }
}
