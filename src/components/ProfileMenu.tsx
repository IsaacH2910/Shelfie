import { Link } from 'react-router-dom'
import {
  BarChart3,
  Check,
  Download,
  FolderOpen,
  LogOut,
  MapPin,
  Monitor,
  Moon,
  Settings,
  ShoppingBag,
  Sun,
  Users,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/AuthProvider'
import { useProfile } from '@/hooks/useProfile'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({
  name,
  url,
  className,
}: {
  name: string
  url?: string | null
  className?: string
}) {
  return (
    <span
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-semibold text-primary',
        className,
      )}
    >
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  )
}

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

export function ProfileMenu() {
  const { user, signOut } = useAuth()
  const { data: profile } = useProfile()
  const { theme, setTheme } = useTheme()
  const name = profile?.display_name || user?.email?.split('@')[0] || 'You'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Account menu"
        >
          <Avatar name={name} url={profile?.avatar_url} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{name}</span>
          {user?.email ? (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/stats">
            <BarChart3 />
            Stats
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/shop">
            <ShoppingBag />
            Shop mode
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/organize">
            <FolderOpen />
            Organize
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/shelves">
            <MapPin />
            Shelves
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/household">
            <Users />
            Household
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/download">
            <Download />
            Download app
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Appearance
        </DropdownMenuLabel>
        {THEMES.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onSelect={(e) => {
              e.preventDefault()
              setTheme(value)
            }}
          >
            <Icon />
            <span className="flex-1">{label}</span>
            {theme === value ? <Check className="h-4 w-4" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void signOut()
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
