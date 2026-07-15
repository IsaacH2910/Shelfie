import { Link } from 'react-router-dom'
import {
  FileUp,
  Layers,
  PenLine,
  Plus,
  ScanBarcode,
  Sparkles,
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
    hint: 'Many in a row',
    icon: Layers,
  },
  {
    to: '/add?scan=ocr',
    label: 'Snap cover',
    hint: 'OCR from photo',
    icon: Sparkles,
  },
  {
    to: '/add',
    label: 'Add manually',
    hint: 'Type details',
    icon: PenLine,
  },
  {
    to: '/settings#import-export',
    label: 'Import library',
    hint: 'CSV / Goodreads',
    icon: FileUp,
  },
] as const

export function AddFab({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Add book"
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition hover:bg-primary/90 active:scale-95',
            className,
          )}
        >
          <Plus className="h-6 w-6" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="mb-2 w-56">
        <DropdownMenuLabel>Add to library</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ACTIONS.map(({ to, label, hint, icon: Icon }) => (
          <DropdownMenuItem key={to + label} asChild>
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
