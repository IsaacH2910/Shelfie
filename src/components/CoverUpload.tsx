import { useRef } from 'react'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CoverImage } from '@/components/CoverImage'

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

  return (
    <div className="space-y-2">
      <CoverImage url={url} title={title || '?'} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file, URL.createObjectURL(file))
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
    </div>
  )
}
