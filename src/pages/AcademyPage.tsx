import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { CHAPTERS, LESSONS, type Lesson } from '../data/academy'
import { AcademyIcon } from '../components/AcademyIcons'
import { PuzzleRunner } from '../components/PuzzleRunner'
import { learningStore, lessonState, nextLesson, recordAnswer, type Answer } from '../lib/learning'
import { useStore } from '../lib/storage'
import { logActivity } from '../store'

export function AcademyPage() {
  const progress = useStore(learningStore)
  const next = nextLesson(progress)
  const complete = LESSONS.filter((l) => lessonState(l.id, progress).complete).length
  return (
    <div className="studio-page">
      <div className="studio-heading">
        <div>
          <span className="eyebrow">Ваш учебный маршрут</span>
          <h1>Игра начинается с понимания.</h1>
          <p>24 коротких урока: от безопасного хода до уверенного завершения партии.</p>
        </div>
        <div className="route-total">
          <strong>
            {complete}
            <span> / 24</span>
          </strong>
          <span>уроков пройдено</span>
        </div>
      </div>
      <div className="method-strip">
        <AcademyIcon name="compass" />
        <p>
          <strong>Разберите идею. Попробуйте на доске. Вернитесь к сложному.</strong>
          <br />
          Все уроки открыты. Подсказки помогают учиться, самостоятельные ответы показывают, что навык закрепился.
        </p>
        <Link className="studio-button secondary" to="/practice?mode=diagnostic">
          Проверить основу
        </Link>
      </div>
      <div className="chapter-list">
        {CHAPTERS.map((chapter) => {
          const lessons = LESSONS.filter((l) => l.skill === chapter.id)
          const solved = lessons.filter((l) => lessonState(l.id, progress).complete).length
          return (
            <section
              className="chapter"
              key={chapter.id}
              style={{ '--chapter-color': chapter.color } as React.CSSProperties}
            >
              <div className="chapter-header">
                <span className="chapter-icon">
                  <AcademyIcon name={chapter.icon} size={24} />
                </span>
                <div>
                  <h2>{chapter.title}</h2>
                  <p>{chapter.subtitle}</p>
                </div>
                <span className="chapter-count">{solved} из 4</span>
              </div>
              <div className="lesson-grid">
                {lessons.map((lesson) => {
                  const state = lessonState(lesson.id, progress)
                  const current = next.id === lesson.id && !state.complete
                  return (
                    <Link
                      key={lesson.id}
                      to={`/learn/${lesson.id}`}
                      className={`lesson-card ${current ? 'lesson-current' : ''}`}
                    >
                      <div className="lesson-card-top">
                        <span className={`lesson-state ${state.mastered ? 'state-done' : ''}`}>
                          {state.mastered
                            ? 'Навык закреплён'
                            : state.complete
                              ? 'Пройдено'
                              : current
                                ? 'Следующий шаг'
                                : 'Урок открыт'}
                        </span>
                        {state.complete ? (
                          <AcademyIcon name="check" size={18} />
                        ) : (
                          <AcademyIcon name="book" size={18} />
                        )}
                      </div>
                      <h3>{lesson.title}</h3>
                      <p>{lesson.summary}</p>
                      <div className="lesson-card-bottom">
                        <span>
                          <AcademyIcon name="clock" size={15} />
                          {lesson.minutes} минут
                        </span>
                        <span>
                          {state.solved}/{state.total} задания
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
      <div className="method-strip">
        <AcademyIcon name="flag" />
        <p>
          <strong>Знаете рисунок мата? Попробуйте довести до него сами.</strong>
          <br />
          Три учебных окончания против движка: король и ферзь, король и ладья, проходная пешка.
        </p>
        <Link className="studio-button secondary" to="/endgames">
          Доиграть позицию
        </Link>
      </div>
      <div className="method-note">
        <h2>От практики — к своей партии</h2>
        <p>
          Занимайтесь небольшими порциями. После урока сыграйте спокойную партию с человеком, например 15+10, и
          разберите один важный момент. Победы над ботом и прогресс курса не переводятся в рейтинг автоматически.
        </p>
        <Link to="/review" className="text-link">
          Разобрать свою партию
        </Link>
      </div>
    </div>
  )
}

export function LessonPage() {
  const { lessonId } = useParams()
  const lesson = LESSONS.find((l) => l.id === lessonId)
  if (!lesson)
    return (
      <div className="studio-page">
        <h1>Урок не найден</h1>
        <Link to="/learn" className="studio-button">
          Открыть учебный маршрут
        </Link>
      </div>
    )
  return <LessonSession key={lesson.id} lesson={lesson} />
}
function LessonSession({ lesson }: { lesson: Lesson }) {
  const chapter = CHAPTERS.find((c) => c.id === lesson.skill)!
  const progress = useStore(learningStore)
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [finished, setFinished] = useState(false)
  const current = lesson.drills[index]
  const answered = answers.some((a) => a.id === current.id)
  const next = LESSONS[LESSONS.findIndex((l) => l.id === lesson.id) + 1]
  const onDone = (answer: Answer) => {
    learningStore.set((data) => recordAnswer(data, answer))
    setAnswers((previous) => [...previous.filter((a) => a.id !== answer.id), answer])
    if (answer.status !== 'revealed') logActivity('tactics')
  }
  return (
    <div className="studio-page">
      <Link to="/learn" className="breadcrumb">
        Учебный маршрут / {chapter.title}
      </Link>
      <div className="studio-heading">
        <div>
          <span className="eyebrow">
            {started && !finished
              ? `Практика · задание ${index + 1} из ${lesson.drills.length}`
              : `${lesson.minutes} минут · объяснение и практика`}
          </span>
          <h1>{lesson.title}</h1>
          <p>{lesson.summary}</p>
        </div>
        <span className="chapter-icon" style={{ color: chapter.color }}>
          <AcademyIcon name={chapter.icon} size={28} />
        </span>
      </div>
      {!started ? (
        <div className="lesson-intro">
          <section className="theory-card">
            <span className="eyebrow">Сначала — одна идея</span>
            {lesson.ideas.map((idea) => (
              <p key={idea}>{idea}</p>
            ))}
            <div className="habit">
              <AcademyIcon name="compass" />
              <div>
                <strong>Возьмите в следующую партию</strong>
                <p>{lesson.habit}</p>
              </div>
            </div>
            <button className="studio-button" onClick={() => setStarted(true)}>
              Попробовать на доске
            </button>
          </section>
          <aside className="lesson-preview">
            <span className="eyebrow">Как проходит урок</span>
            <h2>Понятно. На практике.</h2>
            <ol>
              <li>Разберите учебную позицию</li>
              <li>Выберите ответ или сделайте ход</li>
              <li>Проверьте идею за другой цвет</li>
            </ol>
            <p>Можно ошибаться и брать подсказки. Самостоятельный результат сохранится отдельно.</p>
            <span className="lesson-resume">
              Уже решено: {lessonState(lesson.id, progress).solved} из {lesson.drills.length}
            </span>
          </aside>
        </div>
      ) : finished ? (
        <section className="session-result">
          <div className="result-emblem">
            <AcademyIcon name="check" size={36} />
          </div>
          <span className="eyebrow">Урок разобран</span>
          <h2>
            {answers.every((a) => a.status === 'independent') ? 'Вы справились самостоятельно.' : 'Хороший шаг вперёд.'}
          </h2>
          <p>
            {answers.filter((a) => a.status === 'independent').length} из {lesson.drills.length} заданий — без ошибок и
            подсказок.{' '}
            {answers.some((a) => a.status === 'revealed')
              ? 'Задания с открытым решением пока не засчитаны — вернитесь к ним позже.'
              : 'Сложные позиции вернутся в повторении.'}
          </p>
          <div className="habit">
            <AcademyIcon name="compass" />
            <div>
              <strong>Полезная привычка</strong>
              <p>{lesson.habit}</p>
            </div>
          </div>
          <div className="result-actions">
            {lesson.skill === 'endgame' && (
              <Link className="studio-button" to="/endgames">
                Доиграть против движка
              </Link>
            )}
            {next && (
              <Link className="studio-button" to={`/learn/${next.id}`}>
                Следующий урок
              </Link>
            )}
            <Link className="studio-button secondary" to="/learn">
              К маршруту
            </Link>
            <Link className="text-button" to={`/practice?skill=${lesson.skill}`}>
              Проверить тему вперемешку
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="session-progress" aria-label={`Задание ${index + 1} из ${lesson.drills.length}`}>
            {lesson.drills.map((d, i) => (
              <span key={d.id} className={i < index ? 'progress-done' : i === index ? 'progress-current' : ''} />
            ))}
          </div>
          <PuzzleRunner key={current.id} drill={current} onDone={onDone} />
          <div className="session-footer">
            <p>{lesson.habit}</p>
            <button
              className="studio-button"
              disabled={!answered}
              onClick={() => {
                if (index + 1 < lesson.drills.length) setIndex(index + 1)
                else {
                  setFinished(true)
                  logActivity('lessons')
                }
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              {index + 1 === lesson.drills.length ? 'Подвести итог' : 'Следующее задание'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
