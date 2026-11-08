/* This module owns routing, not rendering. The small fallback components
   below exist only to give each lazy route a boundary, so the fast-refresh
   export rule does not apply. */
/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import Home from './pages/Home';

// Route-level code splitting keeps the first paint small; each page loads on demand.
const SectionListPage = lazy(() =>
  import('./pages/SectionListPage').then((module) => ({ default: module.SectionListPage }))
);
const ArticlePage = lazy(() => import('./pages/ArticlePage'));
const Books = lazy(() => import('./pages/Books'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const Study = lazy(() => import('./pages/Study'));
const Ideas = lazy(() => import('./pages/Ideas'));
const Bookmarks = lazy(() => import('./pages/Bookmarks'));
const Search = lazy(() => import('./pages/Search'));
const Login = lazy(() => import('./pages/Login'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminSection = lazy(() => import('./pages/AdminSection'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageFallback() {
  return (
    <div className="wrap py-24" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-md space-y-4">
        <div className="h-5 w-32 animate-pulse rounded bg-elevated" />
        <div className="h-9 w-full animate-pulse rounded bg-elevated" />
        <div className="h-24 w-full animate-pulse rounded-2xl bg-elevated" />
      </div>
      <p className="sr-only">Loading page…</p>
    </div>
  );
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <RootLayout />,
      children: [
        { index: true, element: <Home /> },

        // Section listings
        {
          path: 'news',
          element: withSuspense(
            <SectionListPage
              section="news"
              eyebrow="News"
              title="News"
              description="Timely reporting and updates across the topics NEXORA follows."
              basePath="/news"
            />
          ),
        },
        {
          path: 'knowledge',
          element: withSuspense(
            <SectionListPage
              section="knowledge"
              eyebrow="Knowledge"
              title="Knowledge"
              description="Explanations that connect ideas across fields."
              basePath="/knowledge"
            />
          ),
        },
        {
          path: 'writing',
          element: withSuspense(
            <SectionListPage
              section="writing"
              eyebrow="Writing"
              title="My Writing"
              description="Essays, reflections and longer-form work."
              basePath="/writing"
            />
          ),
        },
        {
          path: 'learning',
          element: withSuspense(
            <SectionListPage
              section="learning"
              eyebrow="Learning"
              title="Learning"
              description="Guides on learning effectively and studying with structure."
              basePath="/learning"
            />
          ),
        },

        // Article detail
        { path: 'news/:slug', element: withSuspense(<ArticlePage />) },
        { path: 'knowledge/:slug', element: withSuspense(<ArticlePage />) },
        { path: 'writing/:slug', element: withSuspense(<ArticlePage />) },
        { path: 'learning/:slug', element: withSuspense(<ArticlePage />) },

        // Books
        { path: 'books', element: withSuspense(<Books />) },
        { path: 'books/:slug', element: withSuspense(<BookDetail />) },

        // Study
        { path: 'study', element: withSuspense(<Study />) },
        {
          path: 'study/resources',
          element: withSuspense(
            <SectionListPage
              section="study"
              eyebrow="Study"
              title="Study resources"
              description="Published notes, guides and worksheets."
              basePath="/study/resources"
            />
          ),
        },

        // Other sections
        { path: 'ideas', element: withSuspense(<Ideas />) },
        { path: 'bookmarks', element: withSuspense(<Bookmarks />) },
        { path: 'search', element: withSuspense(<Search />) },
        { path: 'login', element: withSuspense(<Login />) },

        // Admin (guarded; RLS enforces the same rule server-side)
        {
          path: 'admin',
          element: withSuspense(
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          ),
        },
        {
          path: 'admin/:section',
          element: withSuspense(
            <ProtectedRoute>
              <AdminSection />
            </ProtectedRoute>
          ),
        },

        { path: '*', element: withSuspense(<NotFound />) },
      ],
    },
  ],
  {
    // Matches the Vite base so deep links resolve on GitHub Pages.
    basename: import.meta.env.BASE_URL,
  }
);
