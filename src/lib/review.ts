import { Chess, type Move } from 'chess.js'
import type { Skill } from '../data/academy'

export interface ReviewMoment {
  index: number
  move: Move
  recommendation: string
  recommendationSan: string
  reply: string | null
  loss: number
  title: string
  explanation: string
  skill: Skill
}
export function parseGame(pgn: string): Move[] {
  if (!pgn.trim() || pgn.length > 100_000) throw new Error('Вставьте PGN одной партии размером до 100 КБ.')
  const board = new Chess()
  try {
    board.loadPgn(pgn)
  } catch {
    throw new Error('Не удалось прочитать PGN. Скопируйте всю запись партии, включая ходы.')
  }
  const history = board.history({ verbose: true })
  if (!history.length) throw new Error('В записи нет ходов. Нужна сыгранная партия.')
  return history
}
export function describeMoment(
  move: Move,
  recommendedSan: string,
  reply: string | null,
): Pick<ReviewMoment, 'title' | 'explanation' | 'skill'> {
  if (recommendedSan.endsWith('#'))
    return {
      title: 'Возможность поставить мат',
      explanation: `В исходной позиции был матующий ход ${recommendedSan}. Сначала проверьте шахи и все ответы соперника.`,
      skill: 'king',
    }
  if (reply) {
    const board = new Chess(move.after)
    const answer = board.move(reply)
    if (board.isCheckmate())
      return {
        title: 'Нужно было защитить короля',
        explanation: `После ${move.san} возможен мат ${answer.san}. Перед своим планом проверьте прямую угрозу королю.`,
        skill: 'king',
      }
    if (answer.captured)
      return {
        title: 'Проверить взятие соперника',
        explanation: `После ${move.san} соперник может ответить ${answer.san} и забрать фигуру на ${answer.to}. Сравните это с рекомендацией и посчитайте ответное взятие.`,
        skill: 'safety',
      }
  }
  return {
    title: 'Сравнить два плана',
    explanation: `Сравните сыгранный ход ${move.san} с ${recommendedSan}. Посмотрите, как меняются активность фигур и безопасность короля.`,
    skill: 'thinking',
  }
}
