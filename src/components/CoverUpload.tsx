import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CoverImage } from '@/components/CoverImage'
import { cn } from '@/lib/utils'

export function CoverUpload({
  url,
  title,
  onFile,
  disabled,
}: {
  url: string | null
  title: string
  onFile: (file: File, previewUrl: string) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const acceptFile = (file: File | undefined | null) => {
    if (!file || disabled) return
    if (!file.type.startsWith('image/')) return
    onFile(file, URL.createObjectURL(file))
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'relative rounded-lg transition',
          dragging && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        )}
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!disabled) setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragging(false)
          const file = e.dataTransfer.files?.[0]
          acceptFile(file)
        }}
      >
        <CoverImage url={url} title={title || '?'} />
        {dragging ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-primary/15 text-xs font-medium text-primary">
            Drop cover image
          </div>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          acceptFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Camera className="h-4 w-4" />
        {url ? 'Change cover photo' : 'Add cover photo'}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        Or drag and drop an image onto the cover
      </p>
    </div>
  )
}
