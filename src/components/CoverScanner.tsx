import { useEffect, useRef, useState } from 'react'
import Tesseract from 'tesseract.js'
import { Camera, ImagePlus, RotateCw } from 'lucide-react'
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
import { ImageCropper } from '@/components/ImageCropper'
import {
  friendlyCameraError,
  openCameraStream,
  stopStream,
} from '@/lib/camera'
import { splitOcrCandidates } from '@/lib/ocrRegions'
import {
  AUTO_OCR_TESSERACT,
  OCR_LANGUAGES,
  resolveTesseractLanguage,
} from '@/lib/tesseractLanguages'

export type OcrResult = {
  text: string
  blob: Blob
  previewUrl: string
}

async function rotateBlob(blob: Blob, degrees: 90 | 180 | 270): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  const swap = degrees === 90 || degrees === 270
  canvas.width = swap ? bitmap.height : bitmap.width
  canvas.height = swap ? bitmap.width : bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return blob
  }
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((degrees * Math.PI) / 180)
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
  bitmap.close()
  const out = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
  )
  return out ?? blob
}

/** Upscale + light contrast so thin cover text is easier for Tesseract. */
async function preprocessForOcr(blob: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob)
    const longest = Math.max(bitmap.width, bitmap.height)
    const scale = longest < 1200 ? Math.min(2.2, 1400 / longest) : 1
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(bitmap.width * scale))
    canvas.height = Math.max(1, Math.floor(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return blob
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = image.data
    for (let i = 0; i < data.length; i += 4) {
      const gray =
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      const boosted = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128))
      data[i] = boosted
      data[i + 1] = boosted
      data[i + 2] = boosted
    }
    ctx.putImageData(image, 0, 0)

    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
    )
    return out ?? blob
  } catch {
    return blob
  }
}

export function CoverScanner({
  onRecognized,
  onError,
  defaultLanguage,
  initialStream = null,
}: {
  onRecognized: (result: OcrResult) => void
  onError?: (message: string) => void
  defaultLanguage?: string
  /** Stream opened from the parent tap (Snap the cover). */
  initialStream?: MediaStream | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const ownsStreamRef = useRef(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [progressLabel, setProgressLabel] = useState('Reading cover…')
  const [preview, setPreview] = useState<string | null>(null)
  const [lastBlob, setLastBlob] = useState<Blob | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [textChoices, setTextChoices] = useState<string[] | null>(null)
  const [pendingResult, setPendingResult] = useState<OcrResult | null>(null)
  const [cameraOn, setCameraOn] = useState(Boolean(initialStream))
  const [startingCamera, setStartingCamera] = useState(false)
  const [ocrLanguage, setOcrLanguage] = useState(() =>
    defaultLanguage
      ? resolveTesseractLanguage(defaultLanguage)
      : AUTO_OCR_TESSERACT,
  )

  useEffect(() => {
    return () => {
      if (ownsStreamRef.current) stopStream(streamRef.current)
      streamRef.current = null
      ownsStreamRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!initialStream) return
    if (ownsStreamRef.current) stopStream(streamRef.current)
    streamRef.current = initialStream
    ownsStreamRef.current = false
    setCameraOn(true)
    setPreview(null)
  }, [initialStream])

  useEffect(() => {
    if (!cameraOn) return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    video.srcObject = stream
    video.setAttribute('playsinline', 'true')
    video.muted = true
    void video.play().catch(() => undefined)
    return () => {
      video.srcObject = null
    }
  }, [cameraOn])

  const runOcr = async (file: Blob, previewUrl: string) => {
    setLastBlob(file)
    setPreview(previewUrl)
    setProgress(0)
    setProgressLabel('Preparing image…')
    try {
      const prepared = await preprocessForOcr(file)
      setProgressLabel('Downloading language data…')
      const { data } = await Tesseract.recognize(prepared, ocrLanguage, {
        logger: (m: { status: string; progress: number }) => {
          const pct = Math.round((m.progress || 0) * 100)
          if (
            m.status === 'loading language traineddata' ||
            m.status === 'loading tesseract core' ||
            m.status === 'initializing api' ||
            m.status === 'initializing tesseract'
          ) {
            setProgressLabel('Downloading language data…')
            setProgress(pct)
          } else if (m.status === 'recognizing text') {
            setProgressLabel('Reading cover…')
            setProgress(pct)
          }
        },
      })
      const text = (data.text ?? '').trim()
      if (!text) {
        onError?.(
          'Could not read any text from that cover. Try a brighter, sharper photo, or pick the cover language.',
        )
        return
      }
      const result = { text, blob: file, previewUrl }
      const choices = splitOcrCandidates(text)
      if (choices.length > 1) {
        setPendingResult(result)
        setTextChoices(choices)
        return
      }
      onRecognized(result)
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : 'Could not read the cover',
      )
    } finally {
      setProgress(null)
    }
  }

  const handleFile = async (file: File) => {
    const previewUrl = URL.createObjectURL(file)
    setCropSrc(previewUrl)
    setLastBlob(file)
    setPreview(previewUrl)
  }

  const startCamera = () => {
    setStartingCamera(true)
    void (async () => {
      try {
        if (ownsStreamRef.current) stopStream(streamRef.current)
        const stream = await openCameraStream()
        streamRef.current = stream
        ownsStreamRef.current = true
        setCameraOn(true)
        setPreview(null)
      } catch (err) {
        onError?.(friendlyCameraError(err))
      } finally {
        setStartingCamera(false)
      }
    })()
  }

  const stopCamera = () => {
    if (ownsStreamRef.current) stopStream(streamRef.current)
    streamRef.current = null
    ownsStreamRef.current = false
    setCameraOn(false)
  }

  const capturePhoto = async () => {
    const video = videoRef.current
    if (!video || video.videoWidth < 8) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
    )
    if (!blob) return
    // Capture keeps the blob; release the live camera.
    if (ownsStreamRef.current) stopStream(streamRef.current)
    streamRef.current = null
    ownsStreamRef.current = false
    setCameraOn(false)
    const previewUrl = URL.createObjectURL(blob)
    setCropSrc(previewUrl)
    setLastBlob(blob)
    setPreview(previewUrl)
  }

  const recognizing = progress !== null

  if (cropSrc) {
    return (
      <ImageCropper
        src={cropSrc}
        onCancel={() => {
          setCropSrc(null)
          setPreview(null)
          setLastBlob(null)
        }}
        onCrop={(blob, previewUrl) => {
          setCropSrc(null)
          void runOcr(blob, previewUrl)
        }}
      />
    )
  }

  if (textChoices && pendingResult) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">Which text is the right book?</p>
        <p className="text-xs text-muted-foreground">
          Multiple title-like blocks were found — pick one (useful for shelves
          with several books in frame).
        </p>
        <ul className="space-y-2">
          {textChoices.map((choice) => (
            <li key={choice.slice(0, 40)}>
              <button
                type="button"
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm transition hover:border-primary/40 hover:bg-accent/40"
                onClick={() => {
                  onRecognized({ ...pendingResult, text: choice })
                  setTextChoices(null)
                  setPendingResult(null)
                }}
              >
                <span className="whitespace-pre-wrap">{choice}</span>
              </button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            onRecognized(pendingResult)
            setTextChoices(null)
            setPendingResult(null)
          }}
        >
          Use all text
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="ocr-language">Cover text language</Label>
        <Select
          value={ocrLanguage}
          onValueChange={setOcrLanguage}
          disabled={recognizing || cameraOn}
        >
          <SelectTrigger id="ocr-language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OCR_LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.tesseract}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Auto covers English + Chinese + Japanese. Pick the cover language for
          faster, more accurate reading.
        </p>
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

      {cameraOn ? (
        <div className="space-y-3">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
              autoPlay
            />
            <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-sm font-medium text-white/90">
              Fill the frame with the front cover, then capture
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              className="flex-1"
              onClick={() => void capturePhoto()}
              disabled={recognizing}
            >
              <Camera className="h-4 w-4" />
              Capture & read
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={stopCamera}
              disabled={recognizing}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : preview ? (
        <img
          src={preview}
          alt="Captured cover"
          className="mx-auto max-h-72 rounded-xl object-contain shadow-sm"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={startCamera}
            disabled={startingCamera || recognizing}
            className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/40 text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
          >
            {startingCamera ? (
              <Spinner className="h-7 w-7" />
            ) : (
              <Camera className="h-8 w-8" />
            )}
            <span className="px-2 text-center text-sm font-medium">
              {startingCamera ? 'Opening camera…' : 'Take a photo'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={recognizing}
            className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/40 text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
          >
            <ImagePlus className="h-8 w-8" />
            <span className="px-2 text-center text-sm font-medium">
              Choose from photos
            </span>
          </button>
        </div>
      )}

      {recognizing ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" />
          {progressLabel} {progress}%
        </div>
      ) : preview && !cameraOn ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!lastBlob || recognizing}
            onClick={() => {
              if (!lastBlob) return
              void (async () => {
                const rotated = await rotateBlob(lastBlob, 90)
                const url = URL.createObjectURL(rotated)
                await runOcr(rotated, url)
              })()
            }}
          >
            <RotateCw className="h-4 w-4" />
            Rotate
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={startCamera}
          >
            Retake with camera
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => inputRef.current?.click()}
          >
            Choose another
          </Button>
        </div>
      ) : null}
    </div>
  )
}
