import { describe, it, expect } from 'vitest'
import { generateDemoTraces, classifyDemoTraces } from '@/lib/seed'

describe('seeded demo traces', () => {
  const results = classifyDemoTraces()

  it('generates 19 traces', () => {
    expect(results).toHaveLength(19)
  })

  it('each trace has a unique traceId', () => {
    const ids = results.map(r => r.trace.traceId)
    expect(new Set(ids).size).toBe(19)
  })

  it('each trace has a unique studentId', () => {
    const ids = results.map(r => r.trace.studentId)
    expect(new Set(ids).size).toBe(19)
  })

  it('all traces share the same activityId', () => {
    for (const r of results) {
      expect(r.trace.activityId).toBe('bayes_medical_test_v1')
    }
  })

  it('every assessment has non-empty evidence', () => {
    for (const r of results) {
      expect(r.assessment.evidence.length).toBeGreaterThan(0)
    }
  })

  it('no assessment has pattern undefined', () => {
    for (const r of results) {
      expect(r.assessment.pattern).toBeDefined()
      expect(['base_rate_neglect', 'sensitivity_posterior_confusion', 'denominator_confusion', 'correct_reasoning', 'insufficient_evidence']).toContain(r.assessment.pattern)
    }
  })

  it('students 1-4 classify as base_rate_neglect', () => {
    for (let i = 0; i < 4; i++) {
      expect(results[i].assessment.pattern).toBe('base_rate_neglect')
    }
  })

  it('students 5-7 classify as sensitivity_posterior_confusion', () => {
    for (let i = 4; i < 7; i++) {
      expect(results[i].assessment.pattern).toBe('sensitivity_posterior_confusion')
    }
  })

  it('students 8-9 classify as denominator_confusion', () => {
    expect(results[7].assessment.pattern).toBe('denominator_confusion')
    expect(results[8].assessment.pattern).toBe('denominator_confusion')
  })

  it('students 10-12 classify as correct_reasoning', () => {
    for (let i = 9; i < 12; i++) {
      expect(results[i].assessment.pattern).toBe('correct_reasoning')
    }
  })

  it('students 13-15 are recovered', () => {
    for (let i = 12; i < 15; i++) {
      expect(results[i].assessment.recovered).toBe(true)
    }
  })

  it('students 16-18 classify as insufficient_evidence', () => {
    for (let i = 15; i < 18; i++) {
      expect(results[i].assessment.pattern).toBe('insufficient_evidence')
    }
  })

  it('student 19 is BRN and not recovered', () => {
    expect(results[18].assessment.pattern).toBe('base_rate_neglect')
    expect(results[18].assessment.recovered).toBe(false)
  })

  it('recovery count matches expected 3', () => {
    const recovered = results.filter(r => r.assessment.recovered)
    expect(recovered).toHaveLength(3)
  })
})
