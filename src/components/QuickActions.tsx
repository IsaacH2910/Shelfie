import { Link } from 'react-router-dom'
import {
  BarChart3,
  Download,
  FolderOpen,
  Layers,
  MapPin,
  ScanBarcode,
  ShoppingBag,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react'

const ACTIONS = [
  {
    to: '/add?scan=barcode',
    label: 'Scan ISBN',
    hint: 'Camera barcode',
    icon: ScanBarcode,
  },
  {
    to: '/add?scan=batch',
    label: 'Batch scan',
    hint: 'Many barcodes',
    icon: Layers,
  },
  {
    to: '/add?scan=ocr',
    label: 'Snap cover',
    hint: 'OCR from photo',
    icon: Sparkles,
  },
  {
    to: '/shop',
    label: 'Shop mode',
    hint: 'Check ownership',
    icon: ShoppingBag,
  },
  {
    to: '/shelves',
    label: 'Shelves',
    hint: 'Map & capacity',
    icon: MapPin,
  },
  {
    to: '/stats',
    label: 'Stats',
    hint: 'Goals & streak',
    icon: BarChart3,
  },
  {
    to: '/organize#collections',
    label: 'Collections',
    hint: 'Lists & labels',
    icon: FolderOpen,
  },
  {
    to: '/settings#import-export',
    label: 'Import',
    hint: 'CSV / Goodreads',
    icon: Upload,
  },
  {
    to: '/household',
    label: 'Household',
    hint: 'Share books',
    icon: Users,
  },
  {
    to: '/download',
    label: 'Download',
    hint: 'Install the app',
    icon: Download,
  },
] as const

export function QuickActions() {
  return (
    <section className="space-y-2" aria-label="Quick actions">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Do something</h2>
        <Link
          to="/settings"
          className="text-xs font-medium text-primary hover:underline"
        >
          All settings
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ACTIONS.map(({ to, label, hint, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-start gap-2.5 rounded-xl border border-border bg-card/60 px-3 py-2.5 transition hover:border-primary/40 hover:bg-accent/40"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold leading-tight">
                {label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
                {hint}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
