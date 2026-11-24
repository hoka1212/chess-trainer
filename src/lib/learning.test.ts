import { describe, expect, it } from 'vitest'
import { ALL_DRILLS, LESSONS } from '../data/academy'
import { EMPTY_LEARNING, lessonState, normalizeLearning, practiceSet, recordAnswer } from './learning'

describe('Learning progress and review', () => {
  const now = new Date(2026, 10, 24, 12).getTime()
  const id = ALL_DRILLS[0].drill.id
  it('does not award solved or mastered credit for revealing the answer', () => {
    const data = recordAnswer(EMPTY_LEARNING, { id, status: 'revealed', mistakes: 0 }, now)
    expect(data.drills[id].solved).toBe(0)
    expect(data.drills[id].independent).toBe(0)
    expect(data.drills[id].dueAt).toBe(now + 4 * 3_600_000)
    expect(lessonState(LESSONS[0].id, data).complete).toBe(false)
    const again = recordAnswer(data, { id, status: 'independent', mistakes: 0 }, now + 60_000)
    expect(again.drills[id].independent).toBe(0)
  })
  it('requires spaced independent attempts rather than repeatedly clicking the same answer', () => {
    let data = recordAnswer(EMPTY_LEARNING, { id, status: 'independent', mistakes: 0 }, now)
    data = recordAnswer(data, { id, status: 'independent', mistakes: 0 }, now + 60_000)
    expect(data.drills[id].independent).toBe(1)
    data = recordAnswer(data, { id, status: 'independent', mistakes: 0 }, now + 86_400_000)
    expect(data.drills[id].independent).toBe(2)
    expect(data.drills[id].dueAt).toBe(now + 4 * 86_400_000)
  })
  it('separates assisted completion and independent skill', () => {
    let data = EMPTY_LEARNING
    for (const drill of LESSONS[0].drills)
      data = recordAnswer(data, { id: drill.id, status: 'assisted', mistakes: 1 }, now)
    expect(lessonState(LESSONS[0].id, data)).toMatchObject({ complete: true, independent: 0, mastered: false })
    expect(practiceSet(data, 'review', undefined, now)).toHaveLength(0)
    expect(practiceSet(data, 'review', undefined, now + 86_400_000)).toHaveLength(3)
  })
  it('normalises malformed imported data without breaking the course', () => {
    expect(normalizeLearning(null)).toEqual(EMPTY_LEARNING)
    expect(
      normalizeLearning({ drills: { [id]: { attempts: -2, dueAt: 'invalid' }, unknown: {} }, journal: [null] }),
    ).toMatchObject({ drills: { [id]: { attempts: 0, dueAt: 0 } }, journal: [] })
  })
  it('starts mixed practice with fundamentals rather than unintroduced advanced motifs', () => {
    expect(
      practiceSet(EMPTY_LEARNING, 'mixed', undefined, now).every(
        (x) => x.lesson.skill === 'safety' || x.lesson.skill === 'king',
      ),
    ).toBe(true)
    expect(practiceSet(EMPTY_LEARNING, 'diagnostic', undefined, now)).toHaveLength(8)
  })
})
