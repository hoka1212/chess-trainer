import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AcademyIcon } from '../components/AcademyIcons'
import { ChessBoard, type BoardMove } from '../components/ChessBoard'
import { askBot } from '../engine/client'
import { ENDGAMES, applyEndingMove, beginEnding, endingStore, restoreEnding, type EndingGame } from '../lib/endgames'
import { playSan } from '../lib/learning'
import { ruSan } from '../lib/pgn'
import { useStore } from '../lib/storage'
import { logActivity } from '../store'
export function EndgamesPage() {
  const data = useStore(endingStore)
  const [preset, setPreset] = useState(ENDGAMES[0].id)
  const [color, setColor] = useState<'w' | 'b'>('w')
  const [setup, setSetup] = useState(false)
  const game = data.active
  if (game && !setup) return <EndingBoard key={game.id} game={game} onSetup={() => setSetup(true)} />
  return (
    <div className="studio-page">
      <Link to="/learn" className="breadcrumb">
        Учебный маршрут / Окончания
      </Link>
      <div className="studio-heading">
        <div>
          <span className="eyebrow">Практика до последнего хода</span>
          <h1>Доведите перевес до победы.</h1>
          <p>Здесь соперник отвечает сам. Начните с готовой позиции и поставьте настоящий мат.</p>
        </div>
      </div>
      <div className="daily-grid">
        {ENDGAMES.map((e) => (
          <button
            key={e.id}
            className={`daily-card ending-choice ${preset === e.id ? 'ending-selected' : ''}`}
            aria-pressed={preset === e.id}
            onClick={() => setPreset(e.id)}
          >
            <span className="daily-icon">
              <AcademyIcon name={e.icon} size={25} />
            </span>
            <h2>{e.name}</h2>
            <p>{e.target}</p>
            <span className="daily-link">Самостоятельных побед: {data.records[e.id]?.independent ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="method-strip ending-start">
        <div>
          <label htmlFor="ending-color" className="field-label">
            Сторона
            <select id="ending-color" value={color} onChange={(e) => setColor(e.target.value as 'w' | 'b')}>
              <option value="w">Белые</option>
              <option value="b">Чёрные</option>
            </select>
          </label>
        </div>
        <p>
          Без часов и штрафа за ошибку. Воспользуйтесь подсказкой, если застряли; результат с помощью сохраняется
          отдельно.
        </p>
        <button
          className="studio-button"
          onClick={() => {
            endingStore.set((d) => beginEnding(d, preset, color))
            setSetup(false)
          }}
        >
          Начать доигрывание
        </button>
        {game && (
          <button className="text-button" onClick={() => setSetup(false)}>
            Вернуться в позицию
          </button>
        )}
      </div>
    </div>
  )
}
function EndingBoard({ game, onSetup }: { game: EndingGame; onSetup: () => void }) {
  const config = ENDGAMES.find((e) => e.id === game.preset)!
  const board = restoreEnding(game)
  const ply = game.moves.length
  const userTurn = !game.result && board.turn() === game.color
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [hint, setHint] = useState<{ ply: number; uci: string; san: string } | null>(null)
  const [hintBusy, setHintBusy] = useState(false)
  const [moveInput, setMoveInput] = useState('')
  const commit = useCallback(
    (uci: string) => {
      const previous = endingStore.get()
      const next = applyEndingMove(previous, game.id, ply, uci)
      endingStore.set(next)
      if (next.active?.result && !previous.active?.result) logActivity('tactics')
    },
    [game.id, ply],
  )
  useEffect(() => {
    if (userTurn || game.result) return
    let cancelled = false
    void askBot({ kind: 'best', startFen: game.startFen, moves: game.moves, timeMs: 300 })
      .then((answer) => {
        if (!cancelled && answer.move) {
          commit(answer.move)
          setError('')
        } else if (!cancelled) setError('Не удалось выбрать ответ. Повторите расчёт.')
      })
      .catch(() => {
        if (!cancelled) setError('Движок не ответил. Можно повторить расчёт.')
      })
    return () => {
      cancelled = true
    }
  }, [commit, game.startFen, game.moves, retry, userTurn, game.result])
  const onMove = (input: BoardMove) => {
    if (!userTurn) return false
    try {
      const { move } = playSan(board.fen(), input.from + input.to + (input.promotion ?? ''))
      commit(move.from + move.to + (move.promotion ?? ''))
      return true
    } catch {
      return false
    }
  }
  const showHint = async () => {
    if (!userTurn || hintBusy) return
    endingStore.set((d) =>
      d.active?.id === game.id ? { ...d, active: { ...d.active, hints: d.active.hints + 1 } } : d,
    )
    setHintBusy(true)
    try {
      const answer = await askBot({ kind: 'best', startFen: game.startFen, moves: game.moves, timeMs: 700 })
      if (answer.move && endingStore.get().active?.moves.length === ply && endingStore.get().active?.id === game.id)
        setHint({ ply, uci: answer.move, san: playSan(board.fen(), answer.move).move.san })
    } catch {
      setError('Подсказка не загрузилась. Попробуйте снова.')
    } finally {
      setHintBusy(false)
    }
  }
  const submitMove = (event: FormEvent) => {
    event.preventDefault()
    if (!userTurn) return
    try {
      const result = playSan(board.fen(), moveInput.trim())
      commit(result.uci)
      setMoveInput('')
      setError('')
    } catch {
      setError('Введите легальный ход, например e4e5, Kd6 или Ra8. Можно ходить и на самой доске.')
    }
  }
  const activeHint = hint?.ply === ply ? hint : null
  const last = game.moves.at(-1)
  return (
    <div className="studio-page">
      <Link to="/learn" className="breadcrumb">
        Учебный маршрут / Доигрывание
      </Link>
      <div className="studio-heading">
        <div>
          <span className="eyebrow">Тренируем завершение партии</span>
          <h1>{config.name}</h1>
          <p>{config.target}</p>
        </div>
      </div>
      <div className="exercise-layout">
        <section className="exercise-board-panel">
          <div className="board-status">
            <span>{game.result ? game.reason : userTurn ? 'Ваш ход' : 'Соперник ищет защиту…'}</span>
            <span className="board-status-note">Без таймера</span>
          </div>
          <ChessBoard
            id="endgame-practice"
            fen={board.fen()}
            orientation={game.color === 'w' ? 'white' : 'black'}
            interactive={userTurn}
            movableColor={game.color}
            onMove={onMove}
            showNotation
            lastMove={last ? { from: last.slice(0, 2), to: last.slice(2, 4) } : null}
            arrows={
              activeHint
                ? [{ startSquare: activeHint.uci.slice(0, 2), endSquare: activeHint.uci.slice(2, 4), color: '#e4c792' }]
                : []
            }
          />
          <p className="board-instruction">Позиция и ходы сохраняются при перезагрузке.</p>
          {!game.result && (
            <details className="keyboard-move">
              <summary>Ввести ход с клавиатуры</summary>
              <form onSubmit={submitMove}>
                <label className="sr-only" htmlFor="ending-move">
                  Ход в окончании
                </label>
                <input
                  id="ending-move"
                  value={moveInput}
                  onChange={(e) => setMoveInput(e.target.value)}
                  placeholder="Например, e4e5"
                  disabled={!userTurn}
                />
                <button className="studio-button secondary" disabled={!userTurn}>
                  Сделать ход
                </button>
              </form>
            </details>
          )}
        </section>
        <section className="exercise-content">
          <span className="eyebrow">План на доске</span>
          <h2 className="exercise-prompt">
            {game.result === 'win'
              ? 'Вы довели позицию до мата.'
              : game.result === 'draw'
                ? 'Ничья — хороший момент для разбора.'
                : 'Ограничивайте пространство. Проверяйте ответ.'}
          </h2>
          <div className="hint-box">
            <p>
              {game.result === 'draw'
                ? `${game.reason}. Вернитесь к уроку о пате или попробуйте снова, сохраняя сопернику легальные ходы до финального шаха.`
                : config.advice}
            </p>
          </div>
          {game.result === 'win' && (
            <div className="feedback feedback-success">
              <AcademyIcon name="check" />
              <p>
                {game.hints === 0
                  ? 'Самостоятельная победа сохранена.'
                  : 'Победа с подсказками сохранена. Повторите позже без помощи.'}
              </p>
            </div>
          )}
          {activeHint && <p className="hint-box">Рекомендация: {ruSan(activeHint.san)}. Проверьте ответ короля.</p>}
          <div className="ending-summary">
            <span>Сделано ходов: {Math.ceil(ply / 2)}</span>
            <span>Подсказок: {game.hints}</span>
          </div>
          {error && (
            <p className="error-message" role="alert">
              {error}
              <button className="text-button" onClick={() => setRetry((n) => n + 1)}>
                Повторить расчёт
              </button>
            </p>
          )}
          <div className="exercise-tools">
            {!game.result && (
              <button
                className="studio-button secondary"
                disabled={!userTurn || hintBusy}
                onClick={() => void showHint()}
              >
                {hintBusy ? 'Ищем полезный ход…' : 'Подсказать ход'}
              </button>
            )}
            <button className="text-button" onClick={onSetup}>
              Выбрать позицию
            </button>
          </div>
          <div className="exercise-tools">
            <button
              className="studio-button secondary"
              onClick={() => endingStore.set((d) => beginEnding(d, game.preset, game.color))}
            >
              Начать заново
            </button>
            <Link
              className="text-link"
              to={`/learn/${game.preset === 'rook' ? 'rook-endgame' : game.preset === 'pawn' ? 'passed-pawn' : 'queen-endgame'}`}
            >
              Вспомнить идею
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
