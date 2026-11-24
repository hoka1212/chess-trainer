import { Chess } from 'chess.js'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AcademyIcon } from '../components/AcademyIcons'
import { ChessBoard, type BoardMove } from '../components/ChessBoard'
import { CHAPTERS, LESSONS, type Skill } from '../data/academy'
import { askBot } from '../engine/client'
import { replay } from '../lib/botGame'
import { learningStore, playSan } from '../lib/learning'
import { ruSan } from '../lib/pgn'
import { describeMoment, parseGame, type ReviewMoment } from '../lib/review'
import { useStore } from '../lib/storage'
import { botGameStore, logActivity } from '../store'

export function ReviewPage() {
  const game = useStore(botGameStore)
  const data = useStore(learningStore)
  const [pgn, setPgn] = useState('')
  const [color, setColor] = useState<'w' | 'b'>('w')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState('')
  const [moments, setMoments] = useState<ReviewMoment[] | null>(null)
  const [note, setNote] = useState('')
  const [skill, setSkill] = useState<Skill>('safety')
  const [saved, setSaved] = useState(false)
  const generation = useRef(0)
  useEffect(
    () => () => {
      generation.current++
    },
    [],
  )
  const analyse = async () => {
    setError('')
    setMoments(null)
    let moves
    try {
      moves = parseGame(pgn)
        .map((move, index) => ({ move, index }))
        .filter(({ move }) => move.color === color)
        .slice(0, 30)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось прочитать партию.')
      return
    }
    if (!moves.length) {
      setError('В партии пока нет ходов выбранной стороны.')
      return
    }
    const current = ++generation.current
    setBusy(true)
    setProgress({ done: 0, total: moves.length })
    const found: ReviewMoment[] = []
    try {
      for (let i = 0; i < moves.length; i++) {
        const { move, index } = moves[i]
        const best = await askBot({ kind: 'best', startFen: move.before, moves: [], timeMs: 180 })
        if (generation.current !== current) return
        const after = new Chess(move.after)
        const reply = after.isGameOver()
          ? { move: null, score: after.isCheckmate() ? -30000 : 0 }
          : await askBot({ kind: 'best', startFen: move.after, moves: [], timeMs: 180 })
        if (generation.current !== current) return
        const loss = Math.max(0, best.score + reply.score)
        if (best.move && best.move !== move.from + move.to + (move.promotion ?? '')) {
          const recommendationSan = playSan(move.before, best.move).move.san
          found.push({
            index,
            move,
            recommendation: best.move,
            recommendationSan,
            reply: reply.move,
            loss,
            ...describeMoment(move, recommendationSan, reply.move),
          })
        }
        setProgress({ done: i + 1, total: moves.length })
      }
      setMoments(found.sort((a, b) => b.loss - a.loss).slice(0, 3))
    } catch {
      if (generation.current === current)
        setError('Движок не смог закончить расчёт. Попробуйте ещё раз или вставьте более короткую запись.')
    } finally {
      if (generation.current === current) setBusy(false)
    }
  }
  return (
    <div className="studio-page">
      <div className="studio-heading">
        <div>
          <span className="eyebrow">Одна партия — один следующий шаг</span>
          <h1>Поймите свой ход.</h1>
          <p>Загрузите запись партии и разберите до трёх моментов. Все вычисления происходят в вашем браузере.</p>
        </div>
        <span className="chapter-icon">
          <AcademyIcon name="compass" size={30} />
        </span>
      </div>
      <div className="review-input-layout">
        <section className="theory-card">
          <label className="field-label" htmlFor="pgn-input">
            Запись партии в PGN
          </label>
          <textarea
            id="pgn-input"
            className="pgn-input"
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
            placeholder={'Вставьте PGN с chess.com или Lichess\n\n1. e4 e5 2. Nf3 Nc6 ...'}
            maxLength={100_000}
            disabled={busy}
          />
          <div className="review-input-tools">
            <label className="studio-button secondary file-label">
              Открыть файл
              <input
                type="file"
                accept=".pgn,.txt"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file && file.size <= 100_000) setPgn(await file.text())
                  else if (file) setError('Файл слишком большой: выберите одну партию до 100 КБ.')
                }}
              />
            </label>
            <button
              className="text-button"
              disabled={busy || !game?.moves.length}
              onClick={() => {
                if (game) {
                  setPgn(replay(game.moves).pgn())
                  setColor(game.color)
                }
              }}
            >
              Взять партию с ботом
            </button>
          </div>
          <div className="review-start">
            <label className="field-label" htmlFor="review-color">
              Вы играли
              <select
                id="review-color"
                value={color}
                onChange={(e) => setColor(e.target.value as 'w' | 'b')}
                disabled={busy}
              >
                <option value="w">Белыми</option>
                <option value="b">Чёрными</option>
              </select>
            </label>
            <button className="studio-button" disabled={busy || !pgn.trim()} onClick={() => void analyse()}>
              {busy ? `Проверено ${progress.done} из ${progress.total}` : 'Найти важные моменты'}
            </button>
            {busy && (
              <button
                className="text-button"
                onClick={() => {
                  generation.current++
                  setBusy(false)
                }}
              >
                Остановить
              </button>
            )}
          </div>
          {busy && (
            <div
              className="skill-bar"
              role="progressbar"
              aria-label="Разбор партии"
              aria-valuenow={progress.done}
              aria-valuemin={0}
              aria-valuemax={progress.total}
            >
              <span style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
            </div>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <p className="field-note">
            Короткий учебный расчёт первых 30 ходов вашей стороны. Рекомендации приблизительные: проверяйте вариант на
            доске. Это не оценка рейтинга и не полный глубокий анализ.
          </p>
        </section>
        <aside className="lesson-preview">
          <span className="eyebrow">Как получить пользу</span>
          <h2>Не спешите к следующей партии.</h2>
          <ol>
            <li>Вспомните, что вы хотели сделать.</li>
            <li>Найдите ответ, который упустили.</li>
            <li>Выберите одну привычку на следующую игру.</li>
          </ol>
          <p>Например: «Перед взятием считаю ответную пешку». Этого достаточно для одного полезного разбора.</p>
        </aside>
      </div>
      {moments && (
        <section className="review-results">
          <div className="section-heading">
            <h2>{moments.length ? 'Позиции для спокойного разбора' : 'Явных отличий в коротком расчёте не найдено'}</h2>
          </div>
          {!moments.length && (
            <p className="method-strip">
              Это не означает, что партия сыграна без ошибок. Вспомните сложный момент сами или выберите другую партию
              для разбора.
            </p>
          )}
          {moments.map((moment) => (
            <MomentCard key={moment.move.before + moment.index} moment={moment} />
          ))}
        </section>
      )}
      <section className="method-note">
        <span className="eyebrow">Дневник практики</span>
        <h2>Что возьмёте в следующую партию?</h2>
        <label htmlFor="review-note" className="field-label">
          Один вывод своими словами
        </label>
        <textarea
          id="review-note"
          className="journal-input"
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
            setSaved(false)
          }}
          maxLength={1000}
          placeholder="Например: я пропустил нападение на коня. После хода соперника буду проверять его угрозу."
        />
        <div className="review-start">
          <label className="field-label" htmlFor="journal-skill">
            Тема для повторения
            <select id="journal-skill" value={skill} onChange={(e) => setSkill(e.target.value as Skill)}>
              {CHAPTERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <button
            className="studio-button secondary"
            disabled={!note.trim() || saved}
            onClick={() => {
              const at = Date.now()
              learningStore.set((d) => ({
                ...d,
                journal: [...d.journal, { id: at, at, note: note.trim(), skill }].slice(-100),
              }))
              setSaved(true)
              logActivity('reviews')
            }}
          >
            {saved ? 'Вывод сохранён' : 'Сохранить вывод'}
          </button>
          <Link className="text-link" to={`/practice?skill=${skill}`}>
            Повторить тему
          </Link>
        </div>
        {data.journal.length > 0 && (
          <div className="journal-history">
            {data.journal
              .slice(-3)
              .reverse()
              .map((n) => (
                <div key={n.id}>
                  <span>
                    {new Date(n.at).toLocaleDateString('ru-RU')} · {CHAPTERS.find((c) => c.id === n.skill)?.title}
                  </span>
                  <p>{n.note}</p>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  )
}
function MomentCard({ moment }: { moment: ReviewMoment }) {
  const [fen, setFen] = useState(moment.move.before)
  const [reveal, setReveal] = useState(false)
  const [trial, setTrial] = useState('')
  const [moved, setMoved] = useState(false)
  const onMove = (input: BoardMove) => {
    try {
      const board = new Chess(moment.move.before)
      const move = board.move(input)
      setFen(board.fen())
      setMoved(true)
      setTrial(
        `Ваш вариант: ${ruSan(move.san)}. ${move.san === moment.recommendationSan ? 'Он совпадает с рекомендацией короткого расчёта.' : 'Посмотрите ответ соперника и сравните с рекомендацией.'}`,
      )
      return true
    } catch {
      return false
    }
  }
  const recommended = playSan(moment.move.before, moment.recommendation).move
  return (
    <article className="review-moment">
      <div>
        <div className="board-status">
          <span>
            Перед ходом {Math.floor(moment.index / 2) + 1}
            {moment.move.color === 'w' ? '.' : '…'} {ruSan(moment.move.san)}
          </span>
        </div>
        <ChessBoard
          id={`review-${moment.index}`}
          fen={fen}
          orientation={moment.move.color === 'w' ? 'white' : 'black'}
          interactive={!moved}
          onMove={onMove}
          showNotation
          arrows={
            reveal && !moved ? [{ startSquare: recommended.from, endSquare: recommended.to, color: '#96d9bc' }] : []
          }
        />
      </div>
      <div>
        <span className="eyebrow">{moment.loss >= 140 ? 'Стоит уделить внимание' : 'Сравнение вариантов'}</span>
        <h3>{moment.title}</h3>
        <p>Сначала попробуйте улучшить ход самостоятельно на доске.</p>
        {trial && <p className="hint-box">{trial}</p>}
        {reveal && (
          <div className="feedback feedback-think">
            <AcademyIcon name="compass" />
            <div>
              <strong>Рекомендация: {ruSan(moment.recommendationSan)}</strong>
              <p>{moment.explanation}</p>
              <p className="feedback-note">
                Короткий расчёт может не учитывать глубокую компенсацию. Проверьте идею и ответ соперника.
              </p>
            </div>
          </div>
        )}
        <div className="exercise-tools">
          <button className="studio-button secondary" onClick={() => setReveal(true)}>
            Сравнить с рекомендацией
          </button>
          <button
            className="text-button"
            onClick={() => {
              setFen(moment.move.before)
              setMoved(false)
              setTrial('')
            }}
          >
            Вернуть позицию
          </button>
        </div>
        <Link className="text-link" to={`/learn/${LESSONS.find((l) => l.skill === moment.skill)!.id}`}>
          Повторить полезный навык
        </Link>
      </div>
    </article>
  )
}
