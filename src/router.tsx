/* This module owns routing, not rendering. The fallback component below
   exists only to give each lazy route a boundary, so the fast-refresh export
   rule does not apply. */
/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import Home from './pages/Home';
import CategoryPage from './pages/CategoryPage';

// Route-level code splitting keeps the first paint small; each page loads on demand.
const Explore = lazy(() => import('./pages/Explore'));
const Search = lazy(() => import('./pages/Search'));
const Library = lazy(() => import('./pages/Library'));
const Saved = lazy(() => import('./pages/Saved'));
const History = lazy(() => import('./pages/History'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const About = lazy(() => import('./pages/About'));

// Knowledge base (Supabase-backed, admin published)
const SectionListPage = lazy(() =>
  import('./pages/SectionListPage').then((module) => ({ default: module.SectionListPage }))
);
const ArticlePage = lazy(() => import('./pages/ArticlePage'));
const Books = lazy(() => import('./pages/Books'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const Study = lazy(() => import('./pages/Study'));
const Ideas = lazy(() => import('./pages/Ideas'));
const Bookmarks = lazy(() => import('./pages/Bookmarks'));

// Auth and admin
const Login = lazy(() => import('./pages/Login'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminSection = lazy(() => import('./pages/AdminSection'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageFallback() {
  return (
    <div className="px-4 py-20 sm:px-6 lg:px-8" aria-busy="true" aria-live="polite">
      <div className="max-w-2xl space-y-4">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-10 w-3/4" />
        <div className="skeleton h-28 w-full" />
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

        // Discovery
        { path: 'explore', element: withSuspense(<Explore />) },
        { path: 'search', element: withSuspense(<Search />) },

        // Live feeds — one page per category, each driven by real publisher feeds
        { path: 'world', element: withSuspense(<CategoryPage category="world" />) },
        { path: 'technology', element: withSuspense(<CategoryPage category="technology" />) },
        { path: 'ai', element: withSuspense(<CategoryPage category="ai" />) },
        { path: 'science', element: withSuspense(<CategoryPage category="science" />) },
        { path: 'education', element: withSuspense(<CategoryPage category="education" />) },
        { path: 'business', element: withSuspense(<CategoryPage category="business" />) },

        // Personal library
        { path: 'library', element: withSuspense(<Library />) },
        { path: 'saved', element: withSuspense(<Saved />) },
        { path: 'history', element: withSuspense(<History />) },
        { path: 'profile', element: withSuspense(<Profile />) },
        { path: 'settings', element: withSuspense(<Settings />) },
        { path: 'about', element: withSuspense(<About />) },

        // Knowledge base — admin-published content from Supabase
        {
          path: 'news',
          element: withSuspense(
            <SectionListPage
              section="news"
              eyebrow="Knowledge base"
              title="News archive"
              description="Longer pieces published from the NEXORA dashboard, alongside the live feeds."
              basePath="/news"
            />
          ),
        },
        {
          path: 'knowledge',
          element: withSuspense(
            <SectionListPage
              section="knowledge"
              eyebrow="Knowledge base"
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
              eyebrow="Knowledge base"
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
              eyebrow="Knowledge base"
              title="Learning"
              description="Guides on learning effectively and studying with structure."
              basePath="/learning"
            />
          ),
        },
        { path: 'news/:slug', element: withSuspense(<ArticlePage />) },
        { path: 'knowledge/:slug', element: withSuspense(<ArticlePage />) },
        { path: 'writing/:slug', element: withSuspense(<ArticlePage />) },
        { path: 'learning/:slug', element: withSuspense(<ArticlePage />) },

        // Books and study
        { path: 'books', element: withSuspense(<Books />) },
        { path: 'books/:slug', element: withSuspense(<BookDetail />) },
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
        { path: 'ideas', element: withSuspense(<Ideas />) },
        { path: 'bookmarks', element: withSuspense(<Bookmarks />) },
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
