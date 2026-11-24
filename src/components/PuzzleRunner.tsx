import { Chess } from 'chess.js'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { type Drill } from '../data/academy'
import { answerStatus, assessMove, drillLabel, incorrectMoveMessage, playSan, type Answer } from '../lib/learning'
import { ruSan } from '../lib/pgn'
import { ChessBoard, type BoardMove } from './ChessBoard'
import { AcademyIcon } from './AcademyIcons'

export function PuzzleRunner({ drill, onDone }: { drill: Drill; onDone: (answer: Answer) => void }) {
  const [fen, setFen] = useState(drill.fen)
  const [ply, setPly] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [hints, setHints] = useState(0)
  const [phase, setPhase] = useState<'solving' | 'reply' | 'solved' | 'revealed'>('solving')
  const [feedback, setFeedback] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [moveText, setMoveText] = useState('')
  const finished = useRef(false)
  const side = new Chess(drill.fen).turn()
  const done = phase === 'solved' || phase === 'revealed'
  const finish = (revealed = false) => {
    if (finished.current) return
    finished.current = true
    setPhase(revealed ? 'revealed' : 'solved')
    setFeedback('')
    onDone({ id: drill.id, status: revealed ? 'revealed' : answerStatus(mistakes, hints), mistakes })
  }
  const finishRef = useRef(finish)
  useEffect(() => {
    finishRef.current = finish
  })
  useEffect(() => {
    if (phase !== 'reply' || drill.kind !== 'move') return
    const timer = window.setTimeout(() => {
      const result = playSan(fen, drill.line[ply])
      setFen(result.board.fen())
      setPly(ply + 1)
      if (ply + 1 >= drill.line.length) finishRef.current()
      else {
        setPhase('solving')
        setFeedback('Соперник ответил. Теперь доведите идею до конца.')
      }
    }, 650)
    return () => window.clearTimeout(timer)
  }, [phase, ply, fen, drill])

  const onMove = (input: BoardMove): boolean => {
    if (drill.kind !== 'move' || phase !== 'solving') return false
    const result = assessMove(drill, fen, ply, input)
    if (!result.legal || !result.move) {
      setFeedback('Так ходить нельзя: проверьте ход фигуры и безопасность своего короля.')
      return false
    }
    if (!result.correct) {
      setMistakes((n) => n + 1)
      setFeedback(incorrectMoveMessage(drill, result.board, result.move))
      return false
    }
    setFeedback('')
    setMoveText('')
    setFen(result.board.fen())
    setPly(ply + 1)
    if (ply + 1 >= drill.line.length) finish()
    else setPhase('reply')
    return true
  }
  const submitMove = (event: FormEvent) => {
    event.preventDefault()
    try {
      const board = new Chess(fen)
      const value = moveText.trim()
      const match = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(value.toLowerCase())
      const move = match ? board.move({ from: match[1], to: match[2], promotion: match[3] }) : board.move(value)
      onMove(move)
    } catch {
      setFeedback('Введите ход, например e2e4, Nf3 или O-O. Можно также нажать фигуру и нужное поле на доске.')
    }
  }
  const reveal = () => {
    if (phase !== 'solving') return
    if (drill.kind === 'move') {
      const board = new Chess(drill.fen)
      for (const san of drill.line) board.move(san)
      setFen(board.fen())
    } else setSelected(drill.answer)
    finish(true)
  }
  const expected = drill.kind === 'move' && !done && ply < drill.line.length ? playSan(fen, drill.line[ply]).move : null
  const board = (
    <ChessBoard
      id={`academy-${drill.id}`}
      fen={fen}
      orientation={side === 'w' ? 'white' : 'black'}
      interactive={drill.kind === 'move' && phase === 'solving'}
      movableColor={side}
      onMove={onMove}
      showNotation
      arrows={
        hints >= 2 && phase === 'solving' && expected
          ? [{ startSquare: expected.from, endSquare: expected.to, color: '#e8bd79' }]
          : []
      }
    />
  )

  return (
    <div className="exercise-layout">
      <section className="exercise-board-panel" aria-label="Учебная позиция">
        <h2 className="mobile-exercise-prompt">{drill.prompt}</h2>
        <div className="board-status">
          <span className={`side-token ${side === 'w' ? 'side-white' : 'side-black'}`} />
          <span>
            {done
              ? 'Разбор позиции'
              : phase === 'reply'
                ? 'Ответ соперника…'
                : side === 'w'
                  ? 'Ход белых'
                  : 'Ход чёрных'}
          </span>
          <span className="board-status-note">Без таймера</span>
        </div>
        {board}
        <p className="board-instruction">
          {drill.kind === 'move'
            ? 'Нажмите фигуру, затем поле. Можно перетаскивать.'
            : 'Рассмотрите позицию и выберите ответ справа.'}
        </p>
      </section>
      <section className="exercise-content">
        <span className="eyebrow">{drillLabel(drill)}</span>
        <h2 className="exercise-prompt">{drill.prompt}</h2>
        {drill.kind === 'choice' && (
          <div className="answer-options">
            {drill.options.map((option, i) => (
              <button
                key={option.text}
                disabled={done}
                aria-pressed={selected === i}
                className={`answer-option ${selected === i ? (i === drill.answer ? 'answer-correct' : 'answer-wrong') : ''}`}
                onClick={() => {
                  setSelected(i)
                  if (i === drill.answer) finish()
                  else {
                    if (selected !== i) setMistakes((n) => n + 1)
                    setFeedback(option.feedback)
                  }
                }}
              >
                <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                {option.text}
              </button>
            ))}
          </div>
        )}
        <div aria-live="polite" aria-atomic="true">
          {feedback && (
            <div className="feedback feedback-think">
              <AcademyIcon name="compass" />
              <p>{feedback}</p>
            </div>
          )}
          {hints >= 1 && !done && (
            <div className="hint-box">
              <span className="eyebrow">Подсказка</span>
              <p>{drill.hint}</p>
            </div>
          )}
          {done && (
            <div className={`feedback ${phase === 'revealed' ? 'feedback-think' : 'feedback-success'}`}>
              <AcademyIcon name={phase === 'revealed' ? 'book' : 'check'} />
              <div>
                <strong>
                  {phase === 'revealed'
                    ? 'Посмотрели разбор'
                    : mistakes === 0 && hints === 0
                      ? 'Получилось самостоятельно'
                      : 'Задача разобрана'}
                </strong>
                <p>{drill.explanation}</p>
                {drill.kind === 'move' && <p className="solution-line">{drill.line.map(ruSan).join(' · ')}</p>}
                <p className="feedback-note">
                  {phase === 'revealed'
                    ? 'Решение не засчитано. Вернитесь позже и попробуйте без помощи.'
                    : mistakes || hints
                      ? 'Полезная практика. Для самостоятельного освоения повторите задачу позже.'
                      : 'Сохранено. Позже проверим навык повторением.'}
                </p>
              </div>
            </div>
          )}
        </div>
        {!done && (
          <>
            <div className="exercise-tools">
              <button
                className="studio-button secondary"
                disabled={phase === 'reply'}
                onClick={() => setHints((n) => Math.min(n + 1, 2))}
              >
                {hints === 0 ? 'Небольшая подсказка' : drill.kind === 'move' ? 'Показать ход' : 'Подсказка открыта'}
              </button>
              <button className="text-button" disabled={phase === 'reply'} onClick={reveal}>
                Посмотреть разбор
              </button>
            </div>
            {drill.kind === 'move' && (
              <details className="keyboard-move">
                <summary>Ввести ход с клавиатуры</summary>
                <form onSubmit={submitMove}>
                  <label htmlFor="move-input" className="sr-only">
                    Ход в формате e2e4 или Nf3
                  </label>
                  <input
                    id="move-input"
                    value={moveText}
                    onChange={(e) => setMoveText(e.target.value)}
                    placeholder="Например, e2e4"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={phase !== 'solving'}
                  />
                  <button className="studio-button secondary" disabled={phase !== 'solving'}>
                    Сделать ход
                  </button>
                </form>
              </details>
            )}
          </>
        )}
      </section>
    </div>
  )
}
