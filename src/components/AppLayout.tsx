import { Suspense } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  BookMarked,
  Home,
  Library,
  Search,
  Settings,
} from 'lucide-react'
import { AddFab } from '@/components/AddFab'
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts'
import { LoanReminders } from '@/components/LoanReminders'
import { MoreNav } from '@/components/MoreNav'
import { OfflineBanner } from '@/components/OfflineBanner'
import { Onboarding } from '@/components/Onboarding'
import { ProfileMenu } from '@/components/ProfileMenu'
import { FullScreenLoader } from '@/components/Spinner'
import { cn } from '@/lib/utils'

const SIDE_LINKS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/library', label: 'Library', icon: Library, end: false },
  { to: '/search', label: 'Search', icon: Search, end: false },
  { to: '/stats', label: 'Stats', icon: BarChart3, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
] as const

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <BookMarked className="h-5 w-5" />
      </span>
      <span className="text-lg font-bold tracking-tight">Shelfie</span>
    </Link>
  )
}

function SideLink({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: typeof Library
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        )
      }
    >
      <Icon className="h-4.5 w-4.5" />
      {label}
    </NavLink>
  )
}

export function AppLayout() {
  const location = useLocation()
  const hideFab =
    location.pathname.startsWith('/add') ||
    location.pathname.startsWith('/book/')

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <KeyboardShortcuts />
      <Onboarding />
      <LoanReminders />
      <OfflineBanner />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-border bg-card/40 px-3 py-5 md:flex">
        <div className="px-2">
          <Brand />
        </div>
        <Link
          to="/add?scan=barcode"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
        >
          Scan / Add
        </Link>

        <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto">
          {SIDE_LINKS.map((item) => (
            <SideLink key={item.to} {...item} />
          ))}
        </nav>

        <div className="border-t border-border pt-4">
          <div className="px-1">
            <ProfileMenu />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md md:hidden">
        <Brand />
        <ProfileMenu />
      </header>

      <main id="main-content" className="md:pl-56" tabIndex={-1}>
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 md:pb-12 md:pt-8">
          <Suspense fallback={<FullScreenLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {!hideFab ? (
        <div className="safe-fab fixed bottom-20 right-4 z-40 md:hidden">
          <AddFab />
        </div>
      ) : null}

      {!hideFab ? (
        <div className="fixed bottom-6 right-6 z-40 hidden md:block">
          <AddFab />
        </div>
      ) : null}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-center border-t border-border bg-background/90 px-1 pt-1.5 backdrop-blur-md md:hidden">
        <BottomTab to="/" label="Home" icon={Home} end />
        <BottomTab to="/library" label="Library" icon={Library} />
        <BottomTab to="/search" label="Search" icon={Search} />
        <BottomTab to="/stats" label="Stats" icon={BarChart3} />
        <MoreNav />
      </nav>
    </div>
  )
}

function BottomTab({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: typeof Library
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground',
        )
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  )
}
