import { Link } from 'react-router-dom'
import {
  Download,
  MapPin,
  MoreHorizontal,
  ShoppingBag,
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
  { to: '/shop', label: 'Shop mode', icon: ShoppingBag, hint: 'Check before you buy' },
  { to: '/shelves', label: 'Shelves', icon: MapPin, hint: 'Map & capacity' },
  { to: '/household', label: 'Household', icon: Users, hint: 'Shared library' },
  { to: '/settings#install', label: 'Download app', icon: Download, hint: 'Phone & computer' },
] as const

/** Mobile “More” menu so Shop / Shelves / Install are easy to find. */
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
      <DropdownMenuContent align="end" className="w-56 mb-2">
        <DropdownMenuLabel>Explore</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MORE_LINKS.map(({ to, label, icon: Icon, hint }) => (
          <DropdownMenuItem key={to} asChild>
            <Link to={to} className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4" />
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
