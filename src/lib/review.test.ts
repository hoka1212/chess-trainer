import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { describeMoment, parseGame } from './review'
it('parses a real game with reversible before/after positions', () => {
  const moves = parseGame('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 *')
  expect(moves).toHaveLength(6)
  for (const move of moves) {
    const board = new Chess(move.before)
    board.move(move.san)
    expect(board.fen()).toBe(move.after)
  }
})
describe('review input validation', () => {
  it('rejects empty or illegal PGN without inventing a game', () => {
    expect(() => parseGame('')).toThrow()
    expect(() => parseGame('1. e5')).toThrow()
  })
  it('explains a real concrete threat', () => {
    const moves = parseGame('1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6')
    const last = moves[moves.length - 1]
    const text = describeMoment(last, 'g6', 'h5f7')
    expect(text.skill).toBe('king')
    expect(text.explanation).toContain('Qxf7#')
  })
})
