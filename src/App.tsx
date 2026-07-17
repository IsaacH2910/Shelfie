import { Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthProvider'
import { AppLayout } from '@/components/AppLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { FullScreenLoader } from '@/components/Spinner'
import { REDIRECT_KEY } from '@/lib/constants'
import { lazyWithRetry } from '@/lib/lazyRetry'
import AddBookPage from '@/pages/AddBook'

const AuthPage = lazyWithRetry(() => import('@/pages/Auth'))
const HomePage = lazyWithRetry(() => import('@/pages/Home'))
const LibraryPage = lazyWithRetry(() => import('@/pages/Library'))
const SearchPage = lazyWithRetry(() => import('@/pages/Search'))
const BookDetailPage = lazyWithRetry(() => import('@/pages/BookDetail'))
const HouseholdPage = lazyWithRetry(() => import('@/pages/Household'))
const SettingsPage = lazyWithRetry(() => import('@/pages/Settings'))
const OrganizePage = lazyWithRetry(() => import('@/pages/Organize'))
const DownloadPage = lazyWithRetry(() => import('@/pages/Download'))
const JoinPage = lazyWithRetry(() => import('@/pages/Join'))
const StatsPage = lazyWithRetry(() => import('@/pages/Stats'))
const ShopPage = lazyWithRetry(() => import('@/pages/Shop'))
const ShelvesPage = lazyWithRetry(() => import('@/pages/Shelves'))
const AdminPage = lazyWithRetry(() => import('@/pages/Admin'))

function ProtectedRoutes() {
  const { session, loading } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (!loading && !session && location.pathname !== '/') {
      localStorage.setItem(REDIRECT_KEY, location.pathname + location.search)
    }
  }, [loading, session, location])

  if (loading) return <FullScreenLoader label="Signing you in…" />
  if (!session) return <Navigate to="/auth" replace />
  return <AppLayout />
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route element={<ProtectedRoutes />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/add" element={<AddBookPage />} />
            <Route path="/book/:id" element={<BookDetailPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shelves" element={<ShelvesPage />} />
            <Route path="/organize" element={<OrganizePage />} />
            <Route path="/download" element={<DownloadPage />} />
            <Route path="/household" element={<HouseholdPage />} />
            <Route path="/join/:code" element={<JoinPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
