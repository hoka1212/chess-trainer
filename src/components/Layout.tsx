import { NavLink, Outlet, useLocation } from 'react-router'
import { useEffect } from 'react'
import { AcademyIcon } from './AcademyIcons'
import { learningStore, lessonState } from '../lib/learning'
import { useStore } from '../lib/storage'
import { LESSONS } from '../data/academy'
const NAV = [
  { to: '/', label: 'Мой день', short: 'День', icon: 'grid', end: true },
  { to: '/learn', label: 'Учебный маршрут', short: 'Уроки', icon: 'book', end: false },
  { to: '/practice', label: 'Практика', short: 'Задачи', icon: 'spark', end: false },
  { to: '/play', label: 'Игра с ботом', short: 'Партия', icon: 'crown', end: false },
  { to: '/review', label: 'Разбор партии', short: 'Разбор', icon: 'compass', end: false },
  { to: '/tools', label: 'Библиотека и настройки', short: 'Ещё', icon: 'grid', end: false },
]
export function Layout() {
  const { pathname } = useLocation()
  const data = useStore(learningStore)
  const complete = LESSONS.filter((l) => lessonState(l.id, data).complete).length
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  const extra = ['/openings', '/coordinates', '/settings', '/endgames'].some((p) => pathname.startsWith(p))
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <NavLink to="/" className="studio-brand">
          <span className="brand-mark">
            <AcademyIcon name="crown" size={29} />
          </span>
          <span>
            <strong>Ход за ходом</strong>
            <small>Шахматная мастерская</small>
          </span>
        </NavLink>
        <span className="sidebar-caption">Ваша практика</span>
        <nav className="desktop-navigation" aria-label="Основная навигация">
          {NAV.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `desktop-nav-item ${isActive || (to === '/tools' && extra) ? 'nav-active' : ''}`
              }
            >
              <AcademyIcon name={icon} size={21} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-progress">
            <span>Маленькие шаги каждый день</span>
            <strong>
              {complete} <small>из 24 уроков</small>
            </strong>
            <div className="skill-bar">
              <span style={{ width: `${(complete / 24) * 100}%` }} />
            </div>
          </div>
          <p>Прогресс хранится в этом браузере.</p>
          <NavLink to="/settings" className="sidebar-backup">
            Сохранить резервную копию
          </NavLink>
        </div>
      </aside>
      <header className="mobile-header">
        <NavLink to="/" className="studio-brand">
          <span className="brand-mark">
            <AcademyIcon name="crown" size={23} />
          </span>
          <strong>Ход за ходом</strong>
        </NavLink>
        <span className="mobile-progress">{complete}/24 урока</span>
      </header>
      <a
        className="skip-content"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        Перейти к содержанию
      </a>
      <main id="main-content" className="app-main" tabIndex={-1}>
        <Outlet />
      </main>
      <nav className="mobile-navigation" aria-label="Мобильная навигация">
        {NAV.map(({ to, short, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `mobile-nav-item ${isActive || (to === '/tools' && extra) ? 'nav-active' : ''}`
            }
          >
            <AcademyIcon name={icon} size={21} />
            <span>{short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
