import { describe, it, expect } from 'vitest'
import { aggregateAssessments } from '@/lib/aggregation'
import { classifyDemoTraces } from '@/lib/seed'

describe('aggregateAssessments', () => {
  const results = classifyDemoTraces()
  const assessments = results.map(r => r.assessment)
  const agg = aggregateAssessments('bayes_medical_test_v1', assessments)

  it('reports correct total students', () => {
    expect(agg.totalStudents).toBe(19)
  })

  it('pattern counts sum to total students', () => {
    const sum = Object.values(agg.patternCounts).reduce((a, b) => a + b, 0)
    expect(sum).toBe(19)
  })

  it('insufficientEvidenceCount matches patternCounts', () => {
    expect(agg.insufficientEvidenceCount).toBe(agg.patternCounts.insufficient_evidence)
  })

  it('confidence breakdown sums to total students', () => {
    const sum = Object.values(agg.confidenceBreakdown).reduce((a, b) => a + b, 0)
    expect(sum).toBe(19)
  })

  it('studentsByPattern concatenation covers all students', () => {
    const all = Object.values(agg.studentsByPattern).flat()
    expect(all).toHaveLength(19)
    expect(new Set(all).size).toBe(19)
  })

  it('has evidence summaries for non-empty patterns (except insufficient_evidence)', () => {
    for (const [pattern, count] of Object.entries(agg.patternCounts)) {
      if (count > 0 && pattern !== 'insufficient_evidence') {
        expect(agg.evidenceSummaries[pattern as keyof typeof agg.evidenceSummaries].length).toBeGreaterThan(0)
      }
    }
  })

  it('handles empty assessments list', () => {
    const empty = aggregateAssessments('empty', [])
    expect(empty.totalStudents).toBe(0)
    expect(Object.values(empty.patternCounts).every(c => c === 0)).toBe(true)
  })
})
