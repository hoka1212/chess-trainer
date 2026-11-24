import { Chess, type Move } from 'chess.js'
import { ALL_DRILLS, LESSONS, type Drill, type MoveDrill, type Skill } from '../data/academy'
import { createStore, dayKey } from './storage'

export type AnswerStatus = 'independent' | 'assisted' | 'revealed'
export interface Answer {
  id: string
  status: AnswerStatus
  mistakes: number
}
export interface DrillProgress {
  attempts: number
  solved: number
  independent: number
  mistakes: number
  lastAt: number
  dueAt: number
  lastIndependentDay: string
  lastRevealDay: string
}
export interface LearningData {
  drills: Record<string, DrillProgress>
  diagnosticAt: number
  journal: { id: number; note: string; skill: Skill; at: number }[]
}
export const EMPTY_LEARNING: LearningData = { drills: {}, diagnosticAt: 0, journal: [] }
const count = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0)
export function normalizeLearning(raw: unknown): LearningData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY_LEARNING
  const r = raw as Partial<LearningData>
  const drills: LearningData['drills'] = {}
  const known = new Set(ALL_DRILLS.map((d) => d.drill.id))
  if (r.drills && typeof r.drills === 'object')
    for (const [id, p] of Object.entries(r.drills)) {
      if (!known.has(id) || !p || typeof p !== 'object') continue
      drills[id] = {
        attempts: count(p.attempts),
        solved: count(p.solved),
        independent: count(p.independent),
        mistakes: count(p.mistakes),
        lastAt: count(p.lastAt),
        dueAt: count(p.dueAt),
        lastIndependentDay: typeof p.lastIndependentDay === 'string' ? p.lastIndependentDay : '',
        lastRevealDay: typeof p.lastRevealDay === 'string' ? p.lastRevealDay : '',
      }
    }
  return {
    drills,
    diagnosticAt: count(r.diagnosticAt),
    journal: Array.isArray(r.journal)
      ? r.journal
          .filter(
            (n) =>
              n && typeof n.note === 'string' && typeof n.at === 'number' && LESSONS.some((l) => l.skill === n.skill),
          )
          .slice(-100)
          .map((n) => ({ ...n, note: n.note.slice(0, 1000) }))
      : [],
  }
}
export const learningStore = createStore<LearningData>('learning-v1', EMPTY_LEARNING, normalizeLearning)
const DAY = 86_400_000

export function recordAnswer(data: LearningData, answer: Answer, now = Date.now()): LearningData {
  const prev = data.drills[answer.id]
  const today = dayKey(now)
  // Seeing a solution and repeating it immediately is practice, not independent mastery.
  const independent = answer.status === 'independent' && prev?.lastRevealDay !== today
  const newIndependentDay = independent && prev?.lastIndependentDay !== today
  const successes = (prev?.independent ?? 0) + (newIndependentDay ? 1 : 0)
  const delay = independent
    ? [1, 1, 3, 7, 14][Math.min(successes, 4)] * DAY
    : answer.status === 'revealed'
      ? 4 * 3_600_000
      : DAY
  return {
    ...data,
    drills: {
      ...data.drills,
      [answer.id]: {
        attempts: (prev?.attempts ?? 0) + 1,
        solved: (prev?.solved ?? 0) + (answer.status === 'revealed' ? 0 : 1),
        independent: successes,
        mistakes: (prev?.mistakes ?? 0) + answer.mistakes,
        lastAt: now,
        dueAt: now + delay,
        lastIndependentDay: independent ? today : (prev?.lastIndependentDay ?? ''),
        lastRevealDay: answer.status === 'revealed' ? today : (prev?.lastRevealDay ?? ''),
      },
    },
  }
}

export function lessonState(id: string, data: LearningData) {
  const lesson = LESSONS.find((l) => l.id === id)!
  const solved = lesson.drills.filter((d) => (data.drills[d.id]?.solved ?? 0) > 0).length
  const independent = lesson.drills.filter((d) => (data.drills[d.id]?.independent ?? 0) > 0).length
  const mastered = lesson.drills.every((d) => (data.drills[d.id]?.independent ?? 0) >= 2)
  return { solved, independent, complete: solved === lesson.drills.length, mastered, total: lesson.drills.length }
}
export function nextLesson(data: LearningData) {
  return LESSONS.find((l) => !lessonState(l.id, data).complete) ?? LESSONS[0]
}
export function dueDrills(data: LearningData, now = Date.now()) {
  return ALL_DRILLS.filter(({ drill }) => data.drills[drill.id] && data.drills[drill.id].dueAt <= now)
}
export function practiceSet(
  data: LearningData,
  mode: 'mixed' | 'review' | 'diagnostic',
  skill?: Skill,
  now = Date.now(),
) {
  const skills: Skill[] = ['safety', 'king', 'tactics', 'opening', 'endgame', 'thinking']
  const frontier = Math.min(skills.indexOf(nextLesson(data).skill) + 1, skills.length - 1)
  const pool = ALL_DRILLS.filter((x) =>
    skill ? x.lesson.skill === skill : mode !== 'mixed' || skills.indexOf(x.lesson.skill) <= frontier,
  )
  if (mode === 'diagnostic') return [0, 4, 10, 13, 24, 39, 48, 67].map((i) => ALL_DRILLS[i])
  const candidates =
    mode === 'review' ? pool.filter((x) => data.drills[x.drill.id] && data.drills[x.drill.id].dueAt <= now) : pool
  const day = Math.floor(now / DAY)
  return candidates
    .map((item, i) => {
      const p = data.drills[item.drill.id]
      // Unseen tasks, accumulated mistakes, then overdue repetition. Daily deterministic tie-break.
      const weight = p ? (p.dueAt <= now ? 50 : -20) + p.mistakes * 4 - p.independent * 5 : 35
      return { item, score: weight + ((i * 17 + day * 7) % 29) / 30 }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((x) => x.item)
}

export function playSan(fen: string, san: string) {
  const board = new Chess(fen)
  const move = board.move(san)
  return { board, move, uci: move.from + move.to + (move.promotion ?? '') }
}
export function assessMove(
  drill: MoveDrill,
  fen: string,
  ply: number,
  input: { from: string; to: string; promotion?: string },
) {
  const board = new Chess(fen)
  let move: Move
  try {
    move = board.move(input)
  } catch {
    return { legal: false, correct: false, board, move: null }
  }
  let correct = false
  if (drill.goal === 'mate' && ply === drill.line.length - 1) correct = board.isCheckmate()
  else if (drill.goal === 'check')
    correct = true // Legal moves have already removed the moving side's check.
  else if (drill.goal === 'safe-knight') {
    const expected = playSan(drill.fen, drill.line[0]).move
    correct = move.piece === 'n' && move.from === expected.from && !board.isAttacked(move.to, board.turn())
  } else {
    const options = [drill.line[ply], ...(ply === 0 ? (drill.alternatives ?? []) : [])]
    correct = options.some((san) => playSan(fen, san).uci === move.from + move.to + (move.promotion ?? ''))
  }
  return { legal: true, correct, board, move }
}
export function incorrectMoveMessage(drill: MoveDrill, after: Chess, move: Move) {
  if (drill.goal === 'mate') {
    if (!after.inCheck()) return 'Этот ход не даёт шаха. Для мата королю нужен шах и ни одного легального ответа.'
    return `Это шах, но ещё не мат: у соперника есть ответ ${after.moves()[0]}. Попробуйте закрыть все выходы.`
  }
  const recapture = after.moves({ verbose: true }).find((m) => m.to === move.to && m.captured)
  if (recapture)
    return `После этого хода соперник может сыграть ${recapture.san} и взять вашу фигуру на ${move.to}. Проверьте её безопасность.`
  if (drill.goal === 'safe-knight')
    return 'Нужно вывести именно атакованного коня на поле, которое не контролирует соперник.'
  return 'Ход легален, но не решает поставленную задачу. Ещё раз проверьте цель и возможный ответ соперника.'
}
export function answerStatus(mistakes: number, hints: number): AnswerStatus {
  return mistakes === 0 && hints === 0 ? 'independent' : 'assisted'
}
export function skillScores(data: LearningData) {
  return Object.fromEntries(
    ['safety', 'king', 'tactics', 'opening', 'endgame', 'thinking'].map((skill) => {
      const tasks = ALL_DRILLS.filter((x) => x.lesson.skill === skill)
      return [
        skill,
        Math.round((tasks.filter((x) => (data.drills[x.drill.id]?.independent ?? 0) > 0).length / tasks.length) * 100),
      ]
    }),
  ) as Record<Skill, number>
}
export function drillLabel(drill: Drill) {
  return drill.kind === 'choice' ? 'Выберите ответ' : 'Сделайте ход на доске'
}

export function practiceDrill(drill: Drill): Drill {
  if (
    ['knight-fork', 'pawn-fork', 'queen-double', 'rook-skewer', 'discovered', 'final-combination'].some((id) =>
      drill.id.startsWith(id),
    )
  ) {
    return { ...drill, prompt: 'Найдите продолжение с выигрышем дорогой фигуры. Сыграйте до взятия.' }
  }
  return drill
}
