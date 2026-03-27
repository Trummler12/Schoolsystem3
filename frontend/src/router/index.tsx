import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Layout } from '../components/Layout'

const TopicsListView = lazy(() => import('../views/TopicsListView'))
const TopicDetailView = lazy(() => import('../views/TopicDetailView'))
const InterestSearchView = lazy(() => import('../views/InterestSearchView'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/topics" replace /> },
      {
        path: 'topics',
        element: (
          <Suspense fallback={<p>Loading…</p>}>
            <TopicsListView />
          </Suspense>
        ),
      },
      {
        path: 'topics/:id',
        element: (
          <Suspense fallback={<p>Loading…</p>}>
            <TopicDetailView />
          </Suspense>
        ),
      },
      {
        path: 'interesting',
        element: (
          <Suspense fallback={<p>Loading…</p>}>
            <InterestSearchView />
          </Suspense>
        ),
      },
    ],
  },
])
