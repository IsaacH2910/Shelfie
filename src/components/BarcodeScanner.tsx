import { useEffect, useRef, useState } from 'react'
import { HTMLCanvasElementLuminanceSource } from '@zxing/browser'
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
} from '@zxing/library'
import { Camera, CameraOff, Flashlight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/Spinner'
import {
  friendlyCameraError,
  openCameraStream,
  setTorch,
  stopStream,
  supportsTorch,
} from '@/lib/camera'

const ZXING_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
]

/** Match the on-screen guide: wide center band. */
const CROP = { x: 0.1, y: 0.32, w: 0.8, h: 0.28 } as const
const ROTATIONS = [0, -8, 8, -16, 16, -24, 24] as const

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
}

type BarcodeDetectorCtor = new (options?: {
  formats?: string[]
}) => BarcodeDetectorLike

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  const ctor = (
    window as Window & { BarcodeDetector?: BarcodeDetectorCtor }
  ).BarcodeDetector
  return typeof ctor === 'function' ? ctor : null
}

function waitForVideoDimensions(
  video: HTMLVideoElement,
  timeoutMs = 8000,
): Promise<void> {
  if (video.videoWidth > 0 && video.videoHeight > 0) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const started = Date.now()
    let raf = 0
    const onMeta = () => tick()
    const cleanup = () => {
      cancelAnimationFrame(raf)
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('loadeddata', onMeta)
    }
    const tick = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup()
        resolve()
        return
      }
      if (Date.now() - started > timeoutMs) {
        cleanup()
        reject(new Error('Camera preview failed to start. Try again.'))
        return
      }
      raf = requestAnimationFrame(tick)
    }
    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('loadeddata', onMeta)
    tick()
  })
}

function createZxingReader() {
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS)
  hints.set(DecodeHintType.TRY_HARDER, true)
  const reader = new MultiFormatReader()
  reader.setHints(hints)
  return reader
}

function decodeCanvas(
  reader: MultiFormatReader,
  canvas: HTMLCanvasElement,
): string | null {
  try {
    if (canvas.width < 8 || canvas.height < 8) return null
    const luminance = new HTMLCanvasElementLuminanceSource(canvas)
    const bitmap = new BinaryBitmap(new HybridBinarizer(luminance))
    return reader.decodeWithState(bitmap).getText()
  } catch {
    return null
  } finally {
    try {
      reader.reset()
    } catch {
      // ignore
    }
  }
}

/** Visible region of the video under CSS object-cover in a 3:4 frame. */
function objectCoverSourceRect(video: HTMLVideoElement) {
  const vw = video.videoWidth
  const vh = video.videoHeight
  const containerAspect = 3 / 4
  const videoAspect = vw / vh
  if (videoAspect > containerAspect) {
    const sw = vh * containerAspect
    return { sx: (vw - sw) / 2, sy: 0, sw, sh: vh }
  }
  const sh = vw / containerAspect
  return { sx: 0, sy: (vh - sh) / 2, sw: vw, sh }
}

function drawCroppedFrame(
  video: HTMLVideoElement,
  target: HTMLCanvasElement,
  rotationDeg: number,
) {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (vw < 8 || vh < 8) return false

  const cover = objectCoverSourceRect(video)
  const sx = Math.floor(cover.sx + cover.sw * CROP.x)
  const sy = Math.floor(cover.sy + cover.sh * CROP.y)
  const sw = Math.floor(cover.sw * CROP.w)
  const sh = Math.floor(cover.sh * CROP.h)

  // Upscale so thin barcode bars have enough pixels for ZXing.
  const scale = Math.max(1.5, Math.min(3, 1400 / sw))
  const dw = Math.floor(sw * scale)
  const dh = Math.floor(sh * scale)

  const ctx = target.getContext('2d', { willReadFrequently: true })
  if (!ctx) return false

  if (rotationDeg === 0) {
    target.width = dw
    target.height = dh
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh)
    return true
  }

  const rad = (rotationDeg * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  target.width = Math.floor(dw * cos + dh * sin)
  target.height = Math.floor(dw * sin + dh * cos)
  ctx.imageSmoothingEnabled = true
  ctx.translate(target.width / 2, target.height / 2)
  ctx.rotate(rad)
  ctx.drawImage(video, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  return true
}

export function BarcodeScanner({
  onResult,
  onError,
  /** Stream opened from the parent tap (Scan barcode) so iOS only needs one gesture. */
  initialStream = null,
}: {
  onResult: (text: string) => void
  onError?: (message: string) => void
  initialStream?: MediaStream | null
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  const firedRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const busyRef = useRef(false)
  const rotationIndexRef = useRef(0)
  const readerRef = useRef<MultiFormatReader | null>(null)
  const detectorRef = useRef<BarcodeDetectorLike | null>(null)
  const startLoopRef = useRef<() => void>(() => undefined)
  const ownsStreamRef = useRef(false)
  const [status, setStatus] = useState<
    'idle' | 'starting' | 'scanning' | 'error'
  >(initialStream ? 'starting' : 'idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [torchOn, setTorchOn] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)

  onResultRef.current = onResult
  onErrorRef.current = onError

  const stopLoop = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    busyRef.current = false
  }

  const releaseStream = (force = false) => {
    if (force || ownsStreamRef.current) {
      stopStream(streamRef.current)
    }
    streamRef.current = null
    ownsStreamRef.current = false
  }

  const emitResult = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || firedRef.current) return
    firedRef.current = true
    stopLoop()
    onResultRef.current(trimmed)
    releaseStream(true)
  }

  const attachStream = async (stream: MediaStream, own: boolean) => {
    const video = videoRef.current
    if (!video) {
      if (own) stopStream(stream)
      return
    }

    stopLoop()
    releaseStream(false)
    streamRef.current = stream
    ownsStreamRef.current = own
    firedRef.current = false
    rotationIndexRef.current = 0
    setTorchOn(false)
    setTorchAvailable(supportsTorch(stream))
    setStatus('starting')
    setErrorMessage('')

    try {
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      video.muted = true
      await video.play().catch(() => undefined)
      await waitForVideoDimensions(video)

      const Detector = getBarcodeDetector()
      detectorRef.current = Detector
        ? new Detector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
          })
        : null
      readerRef.current = createZxingReader()

      setStatus('scanning')
      startLoopRef.current()
    } catch (err: unknown) {
      releaseStream(own)
      const message = friendlyCameraError(err)
      setStatus('error')
      setErrorMessage(message)
      onErrorRef.current?.(message)
    }
  }

  useEffect(() => {
    return () => {
      stopLoop()
      releaseStream(false)
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    if (!initialStream) return
    let cancelled = false
    void (async () => {
      await attachStream(initialStream, false)
      if (cancelled) {
        stopLoop()
        if (videoRef.current) videoRef.current.srcObject = null
      }
    })()
    return () => {
      cancelled = true
      stopLoop()
      if (videoRef.current) videoRef.current.srcObject = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStream])

  const scanFrame = async () => {
    const video = videoRef.current
    if (!video || firedRef.current || busyRef.current) return
    if (video.readyState < 2) return

    busyRef.current = true
    try {
      if (!canvasRef.current) canvasRef.current = document.createElement('canvas')
      const canvas = canvasRef.current
      const rotation = ROTATIONS[rotationIndexRef.current % ROTATIONS.length]
      rotationIndexRef.current += 1

      if (!drawCroppedFrame(video, canvas, rotation)) return

      const detector = detectorRef.current
      if (detector) {
        try {
          const codes = await detector.detect(canvas)
          const value = codes[0]?.rawValue
          if (value) {
            emitResult(value)
            return
          }
        } catch {
          // Fall through to ZXing.
        }
      }

      if (!readerRef.current) readerRef.current = createZxingReader()
      const text = decodeCanvas(readerRef.current, canvas)
      if (text) emitResult(text)
    } finally {
      busyRef.current = false
    }
  }

  const startLoop = () => {
    const tick = () => {
      if (firedRef.current) return
      void scanFrame().finally(() => {
        if (!firedRef.current) {
          timerRef.current = window.setTimeout(tick, 40)
        }
      })
    }
    tick()
  }
  startLoopRef.current = startLoop

  // Fallback if the parent could not open the camera in the same tap.
  const startCamera = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      const message = 'This browser cannot access the camera.'
      setStatus('error')
      setErrorMessage(message)
      onErrorRef.current?.(message)
      return
    }

    setStatus('starting')
    setErrorMessage('')
    void (async () => {
      try {
        const stream = await openCameraStream()
        await attachStream(stream, true)
      } catch (err: unknown) {
        releaseStream(true)
        const message = friendlyCameraError(err)
        setStatus('error')
        setErrorMessage(message)
        onErrorRef.current?.(message)
      }
    })()
  }

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
        autoPlay
      />

      {status === 'idle' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
          <Camera className="h-8 w-8 text-white/90" />
          <p className="text-sm text-white/80">
            Tap to open the camera, then fill the box with the ISBN barcode.
          </p>
          <Button type="button" onClick={startCamera}>
            Enable camera
          </Button>
        </div>
      ) : null}

      {status === 'scanning' ? (
        <>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[28%] w-4/5 rounded-xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            <p className="absolute bottom-6 left-0 right-0 px-4 text-center text-sm font-medium text-white/90">
              Keep the ISBN bars level inside the box — avoid the small price
              code
            </p>
          </div>
          {torchAvailable ? (
            <button
              type="button"
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm ring-1 ring-white/30"
              aria-label={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
              onClick={() => {
                const next = !torchOn
                void setTorch(streamRef.current, next).then((ok) => {
                  if (ok) setTorchOn(next)
                })
              }}
            >
              <Flashlight
                className={`h-5 w-5 ${torchOn ? 'text-amber-300' : ''}`}
              />
            </button>
          ) : null}
        </>
      ) : null}

      {status === 'starting' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/90">
          <Spinner className="h-6 w-6" />
          <p className="text-sm">Starting camera…</p>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white/90">
          <CameraOff className="h-7 w-7" />
          <p className="text-sm">{errorMessage || 'Camera unavailable'}</p>
          <Button type="button" variant="secondary" onClick={startCamera}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  )
}
