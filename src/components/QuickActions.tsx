import { Link } from 'react-router-dom'
import {
  BarChart3,
  Download,
  MapPin,
  ScanBarcode,
  ShoppingBag,
  Upload,
} from 'lucide-react'

const ACTIONS = [
  {
    to: '/shop',
    label: 'Shop mode',
    hint: 'Already own it?',
    icon: ShoppingBag,
  },
  {
    to: '/shelves',
    label: 'Shelves',
    hint: 'Where books live',
    icon: MapPin,
  },
  {
    to: '/stats',
    label: 'Stats',
    hint: 'Reading progress',
    icon: BarChart3,
  },
  {
    to: '/add?scan=barcode',
    label: 'Scan',
    hint: 'Add by ISBN',
    icon: ScanBarcode,
  },
  {
    to: '/settings#import-export',
    label: 'Import',
    hint: 'CSV / Goodreads',
    icon: Upload,
  },
  {
    to: '/settings#install',
    label: 'Download',
    hint: 'Phone & desktop',
    icon: Download,
  },
] as const

export function QuickActions() {
  return (
    <section className="space-y-2" aria-label="Quick actions">
      <h2 className="text-sm font-semibold text-foreground">Explore Shelfie</h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ACTIONS.map(({ to, label, hint, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-start gap-1 rounded-xl border border-border bg-card/60 px-3 py-2.5 transition hover:border-primary/40 hover:bg-accent/40"
          >
            <Icon className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold leading-tight">{label}</span>
            <span className="text-[11px] leading-tight text-muted-foreground">
              {hint}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
