import { Chess } from 'chess.js'
import { defaultPieces } from 'react-chessboard'
import { Link } from 'react-router'
import { CHAPTERS, LESSONS } from '../data/academy'
import { AcademyIcon } from '../components/AcademyIcons'
import { dueDrills, learningStore, lessonState, nextLesson, skillScores } from '../lib/learning'
import { useStore } from '../lib/storage'
import { activityStore, currentStreak } from '../store'

function StudyDiagram() {
  const board = new Chess(LESSONS[0].drills[0].fen)
  return (
    <div className="study-diagram" aria-hidden="true">
      <div className="diagram-label">
        <span className="diagram-token">Учимся замечать</span>
        <span>Ход белых</span>
      </div>
      <div className="mini-board">
        {board.board().flatMap((rank, r) =>
          rank.map((piece, f) => {
            const square = `${'abcdefgh'[f]}${8 - r}`
            const render = piece ? defaultPieces[`${piece.color}${piece.type.toUpperCase()}`] : null
            return (
              <div
                key={square}
                className={`mini-square ${(r + f) % 2 ? 'mini-dark' : 'mini-light'} ${square === 'a5' || square === 'a1' ? 'mini-focus' : ''}`}
              >
                {render?.()}
                {f === 0 && <span className="mini-rank">{8 - r}</span>}
                {r === 7 && <span className="mini-file">{'abcdefgh'[f]}</span>}
              </div>
            )
          }),
        )}
      </div>
      <div className="diagram-caption">
        <span className="diagram-caption-icon">
          <AcademyIcon name="spark" size={18} />
        </span>
        <div>
          <strong>Сначала найдите возможность.</strong>
          <span>Какую фигуру можно взять без потерь?</span>
        </div>
      </div>
    </div>
  )
}
export function DashboardPage() {
  const data = useStore(learningStore)
  const activity = useStore(activityStore)
  const next = nextLesson(data)
  const completed = LESSONS.filter((l) => lessonState(l.id, data).complete).length
  const independent = Object.values(data.drills).filter((p) => p.independent > 0).length
  const due = dueDrills(data).length
  const scores = skillScores(data)
  const streak = currentStreak(activity)
  return (
    <div className="studio-page dashboard-page">
      <header className="day-heading">
        <div>
          <span className="eyebrow">Личная шахматная практика</span>
          <h1>С каждым ходом — увереннее.</h1>
        </div>
        <span className="day-streak">
          <AcademyIcon name="clock" size={18} />
          {streak > 0 ? `Дней подряд: ${streak}` : 'В вашем темпе'}
        </span>
      </header>
      <section className="learning-hero">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="small-pill">{completed ? 'Продолжаем маршрут' : 'Для тех, кто уже знает ходы фигур'}</span>
            <span className="hero-time">
              <AcademyIcon name="clock" size={15} />5 минут
            </span>
          </div>
          <h2>
            {completed ? (
              next.title
            ) : (
              <>
                Замечайте угрозы.
                <br />
                <em>Находите свой ход.</em>
              </>
            )}
          </h2>
          <p>
            {completed
              ? next.summary
              : 'Шаг за шагом учитесь сохранять фигуры, видеть тактику и доводить перевес до победы. С понятными объяснениями и практикой на доске.'}
          </p>
          <div className="hero-actions">
            <Link className="studio-button" to={`/learn/${next.id}`}>
              {completed ? 'Продолжить обучение' : 'Начать первый урок'}
            </Link>
            <Link className="text-button" to="/practice?mode=diagnostic">
              {data.diagnosticAt ? 'Повторить проверку' : 'Сначала проверить основу'}
            </Link>
          </div>
          <div className="hero-footnote">
            <AcademyIcon name="check" size={16} />
            Без таймера · с разбором ошибок · прогресс сохраняется
          </div>
        </div>
        <StudyDiagram />
      </section>
      <div className="dashboard-stats">
        <div>
          <span>Учебный маршрут</span>
          <strong>
            {completed}
            <small> / 24 урока</small>
          </strong>
          <div className="skill-bar">
            <span style={{ width: `${(completed / 24) * 100}%` }} />
          </div>
        </div>
        <div>
          <span>Самостоятельно решено</span>
          <strong>
            {independent}
            <small> / 72 задания</small>
          </strong>
          <p>Без подсказок и ошибок</p>
        </div>
        <div>
          <span>Пора повторить</span>
          <strong>
            {due}
            <small> позиций</small>
          </strong>
          {due ? (
            <Link to="/practice?mode=review" className="text-link">
              Закрепить навык
            </Link>
          ) : (
            <p>Повторения появятся после практики</p>
          )}
        </div>
      </div>
      <section className="today-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Небольшая привычка, большой смысл</span>
            <h2>Ваше занятие на сегодня</h2>
          </div>
          <span className="quiet-label">Около 15 минут</span>
        </div>
        <div className="daily-grid">
          <Link className="daily-card" to={`/learn/${next.id}`}>
            <span className="daily-icon">
              <AcademyIcon name="book" size={24} />
            </span>
            <span className="daily-time">5 минут</span>
            <h3>{next.title}</h3>
            <p>Короткая идея и три задания на доске.</p>
            <span className="daily-link">{completed ? 'Продолжить урок' : 'Разобрать идею'}</span>
          </Link>
          <Link className="daily-card" to={due ? '/practice?mode=review' : '/practice'}>
            <span className="daily-icon violet">
              <AcademyIcon name={due ? 'repeat' : 'spark'} size={24} />
            </span>
            <span className="daily-time">5 минут</span>
            <h3>{due ? 'Вспомнить сложное' : 'Проверить себя'}</h3>
            <p>{due ? 'Вернитесь к позициям, которым нужно внимание.' : 'Смешанные задачи: определите идею сами.'}</p>
            <span className="daily-link">Начать практику</span>
          </Link>
          <Link className="daily-card" to="/review">
            <span className="daily-icon amber">
              <AcademyIcon name="compass" size={24} />
            </span>
            <span className="daily-time">5 минут</span>
            <h3>Понять свою партию</h3>
            <p>Разберите один важный момент и выберите навык для повторения.</p>
            <span className="daily-link">Открыть разбор</span>
          </Link>
        </div>
      </section>
      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Сначала основа, затем глубина</span>
            <h2>Шесть опор хорошей игры</h2>
          </div>
          <Link to="/learn" className="text-link">
            Весь маршрут
          </Link>
        </div>
        <div className="skill-grid">
          {CHAPTERS.map((chapter) => (
            <Link
              key={chapter.id}
              to={`/learn/${LESSONS.find((l) => l.skill === chapter.id && !lessonState(l.id, data).complete)?.id ?? LESSONS.find((l) => l.skill === chapter.id)!.id}`}
              className="skill-card"
            >
              <span className="skill-icon" style={{ color: chapter.color }}>
                <AcademyIcon name={chapter.icon} size={24} />
              </span>
              <div>
                <h3>{chapter.title}</h3>
                <p>{chapter.subtitle}</p>
                <div className="skill-bar">
                  <span style={{ width: `${scores[chapter.id]}%`, background: chapter.color }} />
                </div>
                <span className="skill-caption">{scores[chapter.id]}% заданий решено самостоятельно</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="play-invitation">
        <div className="play-invitation-icon">
          <AcademyIcon name="crown" size={40} />
        </div>
        <div>
          <span className="eyebrow">Переносим знания в игру</span>
          <h2>Одна спокойная партия.</h2>
          <p>Проверьте привычку замечать угрозы против бота. После партии разберите важный момент.</p>
        </div>
        <Link to="/play" className="studio-button secondary">
          Сыграть партию
        </Link>
      </section>
    </div>
  )
}
