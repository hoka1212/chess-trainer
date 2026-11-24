import { Chess } from 'chess.js'
import { mirrorDrill, position } from '../data/academy'
import { createStore } from './storage'
export const ENDGAMES = [
  {
    id: 'queen',
    name: 'Король и ферзь',
    fen: position('Ke4 Qf3 kc8'),
    target: 'Оттесните короля к краю и поставьте мат.',
    advice:
      'Ограничивайте пространство ферзём, подводите своего короля. Оставляйте легальный ответ, пока не готовы дать мат.',
    icon: 'crown',
  },
  {
    id: 'rook',
    name: 'Король и ладья',
    fen: position('Ke4 Rh1 kd8'),
    target: 'Отрежьте короля ладьёй и доведите до мата.',
    advice:
      'Ладья держит границу, король помогает отнимать поля. Не ставьте незащищённую ладью рядом с королём соперника.',
    icon: 'flag',
  },
  {
    id: 'pawn',
    name: 'Провести пешку',
    fen: position('Ke6 Pe5 ke8'),
    target: 'Проведите пешку в ферзи, затем завершите партию матом.',
    advice:
      'Ваш король уже впереди пешки. Не отдавайте его активность; считайте ответ короля после каждого хода. После превращения берегитесь пата.',
    icon: 'compass',
  },
]
export interface EndingGame {
  id: number
  preset: string
  color: 'w' | 'b'
  startFen: string
  moves: string[]
  hints: number
  result: 'win' | 'draw' | 'loss' | null
  reason: string
}
interface EndingRecord {
  wins: number
  independent: number
}
export interface EndingData {
  active: EndingGame | null
  records: Record<string, EndingRecord>
}
export const EMPTY_ENDINGS: EndingData = { active: null, records: {} }
export function restoreEnding(game: EndingGame) {
  const board = new Chess(game.startFen)
  for (const uci of game.moves) board.move(uci)
  return board
}
export function beginEnding(data: EndingData, preset: string, color: 'w' | 'b', now = Date.now()): EndingData {
  const config = ENDGAMES.find((e) => e.id === preset) ?? ENDGAMES[0]
  const startFen =
    color === 'w'
      ? config.fen
      : mirrorDrill({ id: 'mirror', kind: 'move', fen: config.fen, line: [], prompt: '', hint: '', explanation: '' })
          .fen
  return {
    ...data,
    active: { id: now, preset: config.id, color, startFen, moves: [], hints: 0, result: null, reason: '' },
  }
}
export function applyEndingMove(data: EndingData, id: number, ply: number, uci: string): EndingData {
  const game = data.active
  if (!game || game.id !== id || game.moves.length !== ply || game.result) return data
  const board = restoreEnding(game)
  try {
    board.move(uci)
  } catch {
    return data
  }
  let result: EndingGame['result'] = null
  let reason = ''
  if (board.isCheckmate()) {
    result = board.turn() !== game.color ? 'win' : 'loss'
    reason = 'Мат'
  } else if (board.isStalemate()) {
    result = 'draw'
    reason = 'Пат: нет шаха и нет легальных ходов'
  } else if (board.isInsufficientMaterial()) {
    result = 'draw'
    reason = 'Недостаточно материала для мата'
  } else if (board.isThreefoldRepetition()) {
    result = 'draw'
    reason = 'Позиция повторилась трижды'
  } else if (board.isDrawByFiftyMoves()) {
    result = 'draw'
    reason = '50 ходов без взятий и ходов пешками'
  }
  const records = { ...data.records }
  if (result === 'win') {
    const record = records[game.preset] ?? { wins: 0, independent: 0 }
    records[game.preset] = { wins: record.wins + 1, independent: record.independent + (game.hints === 0 ? 1 : 0) }
  }
  return { records, active: { ...game, moves: [...game.moves, uci], result, reason } }
}
export const endingStore = createStore<EndingData>('endgame-practice', EMPTY_ENDINGS, (raw) => {
  if (!raw || typeof raw !== 'object') return EMPTY_ENDINGS
  const r = raw as EndingData
  const records = Object.fromEntries(
    ENDGAMES.filter((e) => r.records?.[e.id]).map((e) => [
      e.id,
      {
        wins: Math.max(0, Number(r.records[e.id].wins) || 0),
        independent: Math.max(0, Number(r.records[e.id].independent) || 0),
      },
    ]),
  )
  try {
    if (
      !r.active ||
      !ENDGAMES.some((e) => e.id === r.active?.preset) ||
      !['w', 'b'].includes(r.active.color) ||
      !Array.isArray(r.active.moves)
    )
      return { active: null, records }
    restoreEnding(r.active)
    return { active: { ...r.active, hints: Math.max(0, Number(r.active.hints) || 0) }, records }
  } catch {
    return { active: null, records }
  }
})
