import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CHAPTERS, type Skill } from '../data/academy'
import { AcademyIcon } from '../components/AcademyIcons'
import { PuzzleRunner } from '../components/PuzzleRunner'
import { learningStore, practiceDrill, practiceSet, recordAnswer, type Answer } from '../lib/learning'
import { logActivity } from '../store'

export function PracticePage() {
  const [params] = useSearchParams()
  return (
    <PracticeSession key={params.toString()} mode={params.get('mode') ?? 'mixed'} skill={params.get('skill') ?? ''} />
  )
}
function PracticeSession({ mode, skill }: { mode: string; skill: string }) {
  const actualMode = mode === 'review' || mode === 'diagnostic' ? mode : 'mixed'
  const actualSkill = CHAPTERS.some((c) => c.id === skill) ? (skill as Skill) : undefined
  const [queue] = useState(() => practiceSet(learningStore.get(), actualMode, actualSkill))
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [finished, setFinished] = useState(false)
  const current = queue[index]
  const independent = answers.filter((a) => a.status === 'independent').length
  const scores = CHAPTERS.map((chapter) => {
    const tasks = queue.filter((x) => x.lesson.skill === chapter.id)
    const correct = tasks.filter((x) => answers.some((a) => a.id === x.drill.id && a.status === 'independent')).length
    return { chapter, total: tasks.length, correct }
  })
    .filter((s) => s.total > 0)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)
  const focus = scores[0]?.chapter
  const title =
    actualMode === 'diagnostic'
      ? 'Проверим основу'
      : actualMode === 'review'
        ? 'Вернуться к важному'
        : 'Практика без подсказки в названии'
  if (!queue.length)
    return (
      <div className="studio-page">
        <div className="empty-panel">
          <AcademyIcon name="repeat" size={36} />
          <h1>На сегодня повторений нет</h1>
          <p>
            Решённые позиции появятся здесь позже. А сейчас можно продолжить маршрут или попробовать смешанную практику.
          </p>
          <Link className="studio-button" to="/learn">
            Продолжить обучение
          </Link>
          <Link className="text-link" to="/practice">
            Смешанная практика
          </Link>
        </div>
      </div>
    )
  return (
    <div className="studio-page">
      <Link to="/" className="breadcrumb">
        Мой день / Практика
      </Link>
      <div className="studio-heading">
        <div>
          <span className="eyebrow">
            {actualMode === 'diagnostic'
              ? 'Стартовая проверка · без оценки рейтинга'
              : actualSkill
                ? CHAPTERS.find((c) => c.id === actualSkill)?.title
                : 'Вспомнить и применить'}
          </span>
          <h1>{title}</h1>
          <p>
            {finished
              ? 'Посмотрите на результат и выберите следующий небольшой шаг.'
              : `${queue.length} позиций, без таймера. Ищите идею самостоятельно; помощь всегда рядом.`}
          </p>
        </div>
      </div>
      {finished ? (
        <section className="session-result">
          <div className="result-emblem">
            <AcademyIcon name="chart" size={36} />
          </div>
          <span className="eyebrow">Практика завершена</span>
          <h2>
            {independent} из {queue.length} самостоятельно
          </h2>
          <p>
            Это результат конкретных заданий, а не ваш шахматный рейтинг. Ошибки помогают выбрать тему следующего
            занятия.
          </p>
          <div className="result-skills">
            {scores.map(({ chapter, total, correct }) => (
              <div key={chapter.id}>
                <span>{chapter.title}</span>
                <strong>
                  {correct} / {total}
                </strong>
                <div className="skill-bar">
                  <span style={{ width: `${(correct / total) * 100}%`, background: chapter.color }} />
                </div>
              </div>
            ))}
          </div>
          {focus && (
            <div className="focus-note">
              <strong>Следующий фокус: {focus.title.toLowerCase()}</strong>
              <p>
                {independent === queue.length
                  ? 'Всё получилось. Закрепите результат на новых позициях и в спокойной партии.'
                  : 'Разберите один урок по этой теме, затем вернитесь к практике.'}
              </p>
            </div>
          )}
          <div className="result-actions">
            <Link
              className="studio-button"
              to={`/learn/${queue.find((x) => x.lesson.skill === focus?.id)?.lesson.id ?? queue[0].lesson.id}`}
            >
              Разобрать тему
            </Link>
            <Link className="studio-button secondary" to="/">
              К моему дню
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="practice-top">
            <span>
              Позиция {index + 1} из {queue.length}
            </span>
            <span>Самостоятельно: {independent}</span>
          </div>
          <div className="session-progress">
            {queue.map(({ drill }, i) => (
              <span key={drill.id} className={i < index ? 'progress-done' : i === index ? 'progress-current' : ''} />
            ))}
          </div>
          <PuzzleRunner
            key={current.drill.id}
            drill={practiceDrill(current.drill)}
            onDone={(answer) => {
              learningStore.set((data) => recordAnswer(data, answer))
              setAnswers((a) => [...a, answer])
              if (answer.status !== 'revealed') logActivity('tactics')
            }}
          />
          <div className="session-footer">
            <p>Не спешите. Проверьте ответ соперника.</p>
            <button
              className="studio-button"
              disabled={!answers.some((a) => a.id === current.drill.id)}
              onClick={() => {
                if (index + 1 < queue.length) setIndex(index + 1)
                else {
                  setFinished(true)
                  if (actualMode === 'diagnostic') learningStore.set((data) => ({ ...data, diagnosticAt: Date.now() }))
                }
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              {index + 1 === queue.length ? 'Посмотреть результат' : 'Следующая позиция'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
