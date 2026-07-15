import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthProvider'
import { AppLayout } from '@/components/AppLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { FullScreenLoader } from '@/components/Spinner'
import { REDIRECT_KEY } from '@/lib/constants'
import AddBookPage from '@/pages/AddBook'

const AuthPage = lazy(() => import('@/pages/Auth'))
const LibraryPage = lazy(() => import('@/pages/Library'))
const BookDetailPage = lazy(() => import('@/pages/BookDetail'))
const HouseholdPage = lazy(() => import('@/pages/Household'))
const SettingsPage = lazy(() => import('@/pages/Settings'))
const JoinPage = lazy(() => import('@/pages/Join'))
const StatsPage = lazy(() => import('@/pages/Stats'))
const ShopPage = lazy(() => import('@/pages/Shop'))
const ShelvesPage = lazy(() => import('@/pages/Shelves'))

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
          <Route element={<ProtectedRoutes />}>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/add" element={<AddBookPage />} />
            <Route path="/book/:id" element={<BookDetailPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shelves" element={<ShelvesPage />} />
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
