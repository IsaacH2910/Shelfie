import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return !!target.closest('[contenteditable="true"]')
}

export function KeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (isTypingTarget(e.target)) return

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

  return null
}
