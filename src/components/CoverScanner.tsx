import { useRef, useState } from 'react'
import Tesseract from 'tesseract.js'
import { ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/Spinner'
import {
  OCR_LANGUAGES,
  resolveTesseractLanguage,
} from '@/lib/tesseractLanguages'

export type OcrResult = {
  text: string
  blob: Blob
  previewUrl: string
}

export function CoverScanner({
  onRecognized,
  onError,
  defaultLanguage,
}: {
  onRecognized: (result: OcrResult) => void
  onError?: (message: string) => void
  defaultLanguage?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [ocrLanguage, setOcrLanguage] = useState(() =>
    resolveTesseractLanguage(defaultLanguage),
  )

  const handleFile = async (file: File) => {
    const previewUrl = URL.createObjectURL(file)
    setPreview(previewUrl)
    setProgress(0)
    try {
      const { data } = await Tesseract.recognize(file, ocrLanguage, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })
      onRecognized({ text: data.text ?? '', blob: file, previewUrl })
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : 'Could not read the cover',
      )
    } finally {
      setProgress(null)
    }
  }

  const recognizing = progress !== null

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="ocr-language">Cover text language</Label>
        <Select value={ocrLanguage} onValueChange={setOcrLanguage}>
          <SelectTrigger id="ocr-language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OCR_LANGUAGES.map((lang) => (
              <SelectItem key={lang.tesseract} value={lang.tesseract}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />

      {preview ? (
        <img
          src={preview}
          alt="Captured cover"
          className="mx-auto max-h-72 rounded-xl object-contain shadow-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-[3/4] w-full max-w-xs mx-auto flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/40 text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
        >
          <ImagePlus className="h-8 w-8" />
          <span className="text-sm font-medium">Take a photo of the cover</span>
        </button>
      )}

      {recognizing ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" />
          Reading cover… {progress}%
        </div>
      ) : preview ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => inputRef.current?.click()}
        >
          Retake photo
        </Button>
      ) : null}
    </div>
  )
}
