import { useState } from 'react'
import { BookText } from 'lucide-react'
import { cn } from '@/lib/utils'

function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/** Deterministic pleasant gradient based on the title. */
function gradientFor(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) % 360
  }
  const h1 = hash
  const h2 = (hash + 40) % 360
  return `linear-gradient(145deg, hsl(${h1} 55% 62%), hsl(${h2} 60% 45%))`
}

export function CoverImage({
  url,
  title,
  className,
}: {
  url?: string | null
  title: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const showImage = url && !failed

  return (
    <div
      className={cn(
        'relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted shadow-sm ring-1 ring-black/5',
        className,
      )}
    >
      {showImage ? (
        <img
          src={url}
          alt={title}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-white"
          style={{ background: gradientFor(title) }}
        >
          <BookText className="h-6 w-6 opacity-80" />
          <span className="text-lg font-bold tracking-wide drop-shadow-sm">
            {initials(title)}
          </span>
        </div>
      )}
    </div>
  )
}
