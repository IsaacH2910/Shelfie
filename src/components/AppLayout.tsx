import { Suspense } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  BookMarked,
  Library,
  MapPin,
  Plus,
  Settings,
  ShoppingBag,
  Users,
} from 'lucide-react'
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts'
import { LoanReminders } from '@/components/LoanReminders'
import { Onboarding } from '@/components/Onboarding'
import { ProfileMenu } from '@/components/ProfileMenu'
import { FullScreenLoader } from '@/components/Spinner'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Library', icon: Library, end: true },
  { to: '/stats', label: 'Stats', icon: BarChart3, end: false },
  { to: '/shelves', label: 'Shelves', icon: MapPin, end: false },
  { to: '/shop', label: 'Shop', icon: ShoppingBag, end: false },
  { to: '/household', label: 'Household', icon: Users, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
]

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

export function AppLayout() {
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
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card/40 px-4 py-5 md:flex">
        <div className="px-2">
          <Brand />
        </div>
        <Link
          to="/add"
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Add book
        </Link>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
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
          ))}
        </nav>
        <div className="border-t border-border pt-4">
          <div className="px-1">
            <ProfileMenu />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md md:hidden">
        <Brand />
        <ProfileMenu />
      </header>

      {/* Content */}
      <main id="main-content" className="md:pl-60" tabIndex={-1}>
        <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 md:pb-12 md:pt-8">
          <Suspense fallback={<FullScreenLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 items-center border-t border-border bg-background/90 px-2 pt-1.5 backdrop-blur-md md:hidden">
        <BottomTab to="/" label="Library" icon={Library} end />
        <BottomTab to="/stats" label="Stats" icon={BarChart3} />
        <div className="flex items-center justify-center">
          <Link
            to="/add"
            aria-label="Add book"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>
        <BottomTab to="/settings" label="Settings" icon={Settings} />
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
