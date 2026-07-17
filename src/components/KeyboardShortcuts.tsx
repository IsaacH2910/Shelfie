import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Keyboard } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return !!target.closest('[contenteditable="true"]')
}

const SHORTCUTS = [
  { keys: '⌘ K', action: 'Search (Spotlight)' },
  { keys: '⌘ N', action: 'Add book' },
  { keys: '⌘ ⇧ S', action: 'Shop mode' },
  { keys: 'J / K', action: 'Move in Library' },
  { keys: 'Enter', action: 'Open focused book' },
  { keys: '?', action: 'Show this cheatsheet' },
] as const

export function KeyboardShortcuts() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return

      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setOpen(true)
        return
      }

      if (!(e.metaKey || e.ctrlKey)) return

      const key = e.key.toLowerCase()

      if (key === 'k' && !e.shiftKey) {
        e.preventDefault()
        navigate('/search')
        return
      }

      if (key === 'n' && !e.shiftKey) {
        e.preventDefault()
        navigate('/add')
        return
      }

      if (key === 's' && e.shiftKey) {
        e.preventDefault()
        navigate('/shop')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Available when you’re not typing in a field.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          {SHORTCUTS.map((row) => (
            <li
              key={row.keys}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-muted-foreground">{row.action}</span>
              <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                {row.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
