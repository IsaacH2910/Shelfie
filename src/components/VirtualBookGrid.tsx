import { useMemo, useRef, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useWindowSize } from '@/hooks/useWindowSize'

function columnsForWidth(width: number): number {
  if (width >= 1024) return 6
  if (width >= 768) return 5
  if (width >= 640) return 4
  return 3
}

/** Virtualized responsive book grid for large libraries. */
export function VirtualBookGrid<T>({
  items,
  estimateRowHeight = 280,
  gap = 16,
  renderItem,
  getKey,
}: {
  items: T[]
  estimateRowHeight?: number
  gap?: number
  renderItem: (item: T, index: number) => ReactNode
  getKey: (item: T, index: number) => string
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const { width } = useWindowSize()
  const columns = columnsForWidth(width || 390)

  const rows = useMemo(() => {
    const out: T[][] = []
    for (let i = 0; i < items.length; i += columns) {
      out.push(items.slice(i, i + columns))
    }
    return out
  }, [items, columns])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight + gap,
    overscan: 4,
  })

  // For modest libraries, skip virtualization overhead
  if (items.length < 60) {
    return (
      <div
        className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
        role="list"
        aria-label="Books"
      >
        {items.map((item, index) => (
          <div key={getKey(item, index)} role="listitem">
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className="max-h-[70vh] overflow-auto pr-1"
      role="list"
      aria-label="Books"
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index] ?? []
          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 top-0 grid w-full grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
              style={{
                height: `${virtualRow.size - gap}px`,
                transform: `translateY(${virtualRow.start}px)`,
                marginBottom: gap,
              }}
            >
              {row.map((item, col) => {
                const index = virtualRow.index * columns + col
                return (
                  <div key={getKey(item, index)} role="listitem">
                    {renderItem(item, index)}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
