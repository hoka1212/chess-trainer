import { lazy, Suspense } from 'react'
import { createHashRouter, RouterProvider } from 'react-router'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { AcademyPage, LessonPage } from './pages/AcademyPage'
import { ToolsPage } from './pages/ToolsPage'
import { PracticePage } from './pages/PracticePage'
const CoordinatesPage = lazy(() => import('./pages/CoordinatesPage').then((m) => ({ default: m.CoordinatesPage })))
const CoursePage = lazy(() => import('./pages/CoursePage').then((m) => ({ default: m.CoursePage })))
const EditorPage = lazy(() => import('./pages/EditorPage').then((m) => ({ default: m.EditorPage })))
const OpeningsPage = lazy(() => import('./pages/OpeningsPage').then((m) => ({ default: m.OpeningsPage })))
const PlayPage = lazy(() => import('./pages/PlayPage').then((m) => ({ default: m.PlayPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const TrainerPage = lazy(() => import('./pages/TrainerPage').then((m) => ({ default: m.TrainerPage })))
const ReviewPage = lazy(() => import('./pages/ReviewPage').then((m) => ({ default: m.ReviewPage })))
const EndgamesPage = lazy(() => import('./pages/EndgamesPage').then((m) => ({ default: m.EndgamesPage })))

// Хэш-роутинг: приложение работает на любом статическом хостинге (в т.ч. GitHub Pages в подпапке).
const router = createHashRouter([
  {
    element: (
      <Suspense
        fallback={
          <div className="page-loading" role="status">
            Подготавливаем доску…
          </div>
        }
      >
        <Layout />
      </Suspense>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'learn', element: <AcademyPage /> },
      { path: 'learn/:lessonId', element: <LessonPage /> },
      { path: 'practice', element: <PracticePage /> },
      { path: 'tools', element: <ToolsPage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'endgames', element: <EndgamesPage /> },
      { path: 'coordinates', element: <CoordinatesPage /> },
      { path: 'openings', element: <OpeningsPage /> },
      { path: 'openings/new', element: <EditorPage /> },
      { path: 'openings/:courseId', element: <CoursePage /> },
      { path: 'openings/:courseId/edit', element: <EditorPage /> },
      { path: 'openings/:courseId/train', element: <TrainerPage /> },
      { path: 'play', element: <PlayPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <DashboardPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
