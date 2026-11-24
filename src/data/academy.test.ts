import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { ALL_DRILLS, CHAPTERS, LESSONS, mirrorDrill } from './academy'
import { assessMove, playSan } from '../lib/learning'

describe('Beginner academy content', () => {
  it('accepts safe alternatives but rejects saving a knight onto another pawn attack', () => {
    const drill = LESSONS.find((lesson) => lesson.id === 'save-piece')!.drills[0]
    if (drill.kind !== 'move') throw new Error('Expected move drill')
    expect(assessMove(drill, drill.fen, 0, { from: 'd4', to: 'f3' }).correct).toBe(true)
    expect(assessMove(drill, drill.fen, 0, { from: 'd4', to: 'f5' }).correct).toBe(false)
  })
  it('has a complete route with unique drills and both colours', () => {
    expect(LESSONS).toHaveLength(24)
    expect(ALL_DRILLS).toHaveLength(72)
    expect(new Set(ALL_DRILLS.map((x) => x.drill.id)).size).toBe(72)
    for (const chapter of CHAPTERS) expect(LESSONS.filter((l) => l.skill === chapter.id)).toHaveLength(4)
  })
  for (const { drill } of ALL_DRILLS)
    it(`${drill.id}: valid position, legal solution and accurate goal`, () => {
      const board = new Chess(drill.fen)
      const other = board.turn() === 'w' ? 'b' : 'w'
      const enemyKing = board
        .board()
        .flat()
        .find((p) => p?.type === 'k' && p.color === other)!
      expect(
        board.isAttacked(enemyKing.square, board.turn()),
        'The side that just moved cannot have left its king in check',
      ).toBe(false)
      if (drill.kind === 'choice') {
        expect(drill.options[drill.answer]).toBeDefined()
        if (drill.id === 'recognise-pat' || drill.id === 'queen-plan') expect(board.isStalemate()).toBe(true)
        return
      }
      const initialSide = board.turn()
      drill.line.forEach((san, ply) => {
        if (board.turn() === initialSide) {
          const { move } = playSan(board.fen(), san)
          expect(assessMove(drill, board.fen(), ply, move).correct).toBe(true)
        }
        board.move(san)
      })
      if (drill.goal === 'mate') expect(board.isCheckmate()).toBe(true)
      if (drill.alternatives)
        for (const san of drill.alternatives)
          expect(assessMove(drill, drill.fen, 0, playSan(drill.fen, san).move).correct).toBe(true)
      const twice = mirrorDrill(mirrorDrill(drill))
      expect(new Chess(twice.fen).fen().split(' ').slice(0, 4)).toEqual(
        new Chess(drill.fen).fen().split(' ').slice(0, 4),
      )
      expect(twice.line).toEqual(drill.line)
    })
})
