import { Link } from 'react-router-dom'
import {
  Download,
  FolderOpen,
  Keyboard,
  MoreHorizontal,
  Settings,
  ShoppingBag,
  Upload,
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
import { cn } from '@/lib/utils'

const MORE_LINKS = [
  { to: '/organize', label: 'Organize', icon: FolderOpen, hint: 'Categories, shelves, collections' },
  { to: '/shop', label: 'Shop mode', icon: ShoppingBag, hint: 'Check before you buy' },
  { to: '/household', label: 'Household', icon: Users, hint: 'Share your library' },
  { to: '/download', label: 'Download app', icon: Download, hint: 'Phone & computer' },
  { to: '/settings', label: 'Settings', icon: Settings, hint: 'Account & appearance' },
  { to: '/settings#import-export', label: 'Import / export', icon: Upload, hint: 'CSV & Goodreads' },
  { to: '/settings#shortcuts', label: 'Keyboard shortcuts', icon: Keyboard, hint: 'Desktop tips' },
] as const

export function MoreNav({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium text-muted-foreground',
            className,
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          More
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="mb-2 w-64">
        <DropdownMenuLabel>More tools</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MORE_LINKS.map(({ to, label, icon: Icon, hint }) => (
          <DropdownMenuItem key={to} asChild>
            <Link to={to} className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex flex-col">
                <span>{label}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {hint}
                </span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
