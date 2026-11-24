import { Link } from 'react-router'
import { AcademyIcon } from '../components/AcademyIcons'
export function ToolsPage() {
  const tools = [
    {
      to: '/endgames',
      icon: 'flag',
      title: 'Доигрывание окончаний',
      text: 'Ферзь, ладья или проходная пешка: реализуйте перевес против защиты движка.',
    },
    {
      to: '/coordinates',
      icon: 'grid',
      title: 'Координаты доски',
      text: 'Короткая разминка для чтения ходов и ориентации за оба цвета.',
    },
    {
      to: '/openings',
      icon: 'book',
      title: 'Библиотека дебютов',
      text: '42 курса, свой репертуар и импорт PGN. Дополнение к основному маршруту.',
    },
    {
      to: '/settings',
      icon: 'compass',
      title: 'Настройки и сохранения',
      text: 'Цвет доски, анимация, экспорт и восстановление всего прогресса.',
    },
  ]
  return (
    <div className="studio-page">
      <div className="studio-heading">
        <div>
          <span className="eyebrow">Всё под рукой</span>
          <h1>Библиотека и инструменты</h1>
          <p>Дополнительная практика и привычные возможности тренажёра.</p>
        </div>
      </div>
      <div className="daily-grid">
        {tools.map((tool) => (
          <Link key={tool.to} to={tool.to} className="daily-card">
            <span className="daily-icon">
              <AcademyIcon name={tool.icon} size={24} />
            </span>
            <h2>{tool.title}</h2>
            <p>{tool.text}</p>
            <span className="daily-link">Открыть</span>
          </Link>
        ))}
      </div>
      <section className="method-note">
        <span className="eyebrow">Как устроено обучение</span>
        <h2>Сначала безопасность и понимание</h2>
        <p>
          Маршрут рассчитан на человека, который знает правила и хочет увереннее играть обычные партии. Основу
          составляют сохранение фигур, защита, тактика, простые окончания и разбор своих решений. Дебюты остаются
          отдельной библиотекой.
        </p>
        <p>
          Пройденный урок и освоенный навык различаются: для закрепления нужны самостоятельные решения в разные дни.
          Подсказки доступны всегда, а повторения назначаются по результатам. Это учебная программа, а не измеритель
          рейтинга.
        </p>
        <details>
          <summary>Методические ориентиры</summary>
          <p>
            Программа и учебные позиции созданы для этого проекта. При выборе порядка тем использованы открытые
            рекомендации первичных источников:
          </p>
          <ul>
            <li>
              <a
                href="https://www.chess.com/article/view/coach-danes-beginner-improvement-guide"
                target="_blank"
                rel="noreferrer"
              >
                Chess.com: руководство для уровня 0–600
              </a>
            </li>
            <li>
              <a href="https://lichess.org/practice" target="_blank" rel="noreferrer">
                Lichess Practice: тактика, маты и окончания
              </a>
            </li>
            <li>
              <a href="https://www.stappenmethode.nl/en/material/step1" target="_blank" rel="noreferrer">
                Steps Method: базовые навыки, Step 1
              </a>
            </li>
            <li>
              <a href="https://www.chess.com/article/view/beginner-chess-strategy" target="_blank" rel="noreferrer">
                Chess.com: дебютные принципы
              </a>
            </li>
          </ul>
        </details>
      </section>
    </div>
  )
}
