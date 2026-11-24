import { describe, expect, it } from 'vitest'
import { ENDGAMES, EMPTY_ENDINGS, applyEndingMove, beginEnding, restoreEnding } from './endgames'
describe('Practical endgames', () => {
  it('starts legal practice positions with the selected side to move', () => {
    for (const preset of ENDGAMES)
      for (const side of ['w', 'b'] as const) {
        const data = beginEnding(EMPTY_ENDINGS, preset.id, side)
        expect(restoreEnding(data.active!).turn()).toBe(side)
        expect(restoreEnding(data.active!).isGameOver()).toBe(false)
      }
  })
  it('records mate once and rejects a stale engine reply', () => {
    const data = {
      ...beginEnding(EMPTY_ENDINGS, 'queen', 'w', 10),
      active: { ...beginEnding(EMPTY_ENDINGS, 'queen', 'w', 10).active!, startFen: '7k/8/5KQ1/8/8/8/8/8 w - - 0 1' },
    }
    expect(applyEndingMove(data, 9, 0, 'g6g7')).toBe(data)
    const next = applyEndingMove(data, 10, 0, 'g6g7')
    expect(next.active?.result).toBe('win')
    expect(next.records.queen.independent).toBe(1)
    expect(applyEndingMove(next, 10, 0, 'g6g7')).toBe(next)
  })
  it('does not count stalemate as a win', () => {
    const data = {
      ...beginEnding(EMPTY_ENDINGS, 'queen', 'w', 10),
      active: { ...beginEnding(EMPTY_ENDINGS, 'queen', 'w', 10).active!, startFen: '7k/5K2/8/6Q1/8/8/8/8 w - - 0 1' },
    }
    const next = applyEndingMove(data, 10, 0, 'g5g6')
    expect(next.active?.result).toBe('draw')
    expect(next.records.queen).toBeUndefined()
  })
})
