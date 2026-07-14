import { getLanguage } from '@/lib/languages'
import { cn } from '@/lib/utils'

export function LanguageBadge({
  code,
  className,
  showLabel = true,
}: {
  code?: string | null
  className?: string
  showLabel?: boolean
}) {
  const language = getLanguage(code)
  if (!language) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground',
        className,
      )}
    >
      <span aria-hidden>{language.flag}</span>
      {showLabel ? <span>{language.name}</span> : null}
    </span>
  )
}
