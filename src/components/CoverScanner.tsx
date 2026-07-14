import { useEffect, useRef, useState } from 'react'
import Tesseract from 'tesseract.js'
import { Camera, ImagePlus } from 'lucide-react'
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

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [startingCamera, setStartingCamera] = useState(false)
  const [ocrLanguage, setOcrLanguage] = useState(() =>
    resolveTesseractLanguage(defaultLanguage),
  )

  useEffect(() => {
    return () => {
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!cameraOn) return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    video.srcObject = stream
    video.setAttribute('playsinline', 'true')
    void video.play().catch(() => undefined)
  }, [cameraOn])

  const runOcr = async (file: Blob, previewUrl: string) => {
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

  const handleFile = async (file: File) => {
    const previewUrl = URL.createObjectURL(file)
    await runOcr(file, previewUrl)
  }

  const startCamera = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onError?.('This browser cannot access the camera.')
      return
    }
    setStartingCamera(true)
    void (async () => {
      try {
        stopStream(streamRef.current)
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          })
        }
        streamRef.current = stream
        setCameraOn(true)
        setPreview(null)
      } catch (err) {
        onError?.(
          err instanceof Error ? err.message : 'Unable to access the camera',
        )
      } finally {
        setStartingCamera(false)
      }
    })()
  }

  const stopCamera = () => {
    stopStream(streamRef.current)
    streamRef.current = null
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
    stopCamera()
    const previewUrl = URL.createObjectURL(blob)
    await runOcr(blob, previewUrl)
  }

  const recognizing = progress !== null

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
              <SelectItem key={lang.tesseract} value={lang.tesseract}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Pick Traditional Chinese for 繁體 covers, Simplified for 简体.
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
          Reading cover… {progress}%
        </div>
      ) : preview && !cameraOn ? (
        <div className="flex gap-2">
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
