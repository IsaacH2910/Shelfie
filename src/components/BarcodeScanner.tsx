import { useEffect, useRef, useState } from 'react'
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { Camera, CameraOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/Spinner'

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
}

const ZXING_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
]

const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const

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

function friendlyCameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  const message = err instanceof Error ? err.message : ''

  if (name === 'NotAllowedError' || /not allowed/i.test(message)) {
    return 'Camera permission was blocked. On iPhone: Settings → Safari → Camera → Allow, then tap Try again. Or aA → Website Settings → Camera → Allow.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera was found on this device.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is in use by another app. Close it and try again.'
  }
  if (!window.isSecureContext) {
    return 'Camera needs HTTPS. Open the Vercel link (https://…), not a local http:// address.'
  }
  return message || 'Unable to access the camera'
}

function createReader() {
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS)
  hints.set(DecodeHintType.TRY_HARDER, true)
  return new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 100,
    delayBetweenScanSuccess: 500,
    tryPlayVideoTimeout: 10000,
  })
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

/** iOS Safari can report 0×0 until metadata settles — ZXing then builds a dead canvas. */
function waitForVideoDimensions(
  video: HTMLVideoElement,
  timeoutMs = 8000,
): Promise<void> {
  if (video.videoWidth > 0 && video.videoHeight > 0) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const started = Date.now()

    const done = () => {
      cleanup()
      resolve()
    }
    const fail = () => {
      cleanup()
      reject(new Error('Camera preview failed to start. Try again.'))
    }
    const tick = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        done()
        return
      }
      if (Date.now() - started > timeoutMs) {
        fail()
        return
      }
      raf = requestAnimationFrame(tick)
    }

    let raf = 0
    const onMeta = () => tick()
    const cleanup = () => {
      cancelAnimationFrame(raf)
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('loadeddata', onMeta)
    }

    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('loadeddata', onMeta)
    tick()
  })
}

async function openCameraStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: VIDEO_CONSTRAINTS,
    })
  } catch {
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    })
  }
}

export function BarcodeScanner({
  onResult,
  onError,
}: {
  onResult: (text: string) => void
  onError?: (message: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  const firedRef = useRef(false)
  const controlsRef = useRef<IScannerControls | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const nativeTimerRef = useRef<number | null>(null)
  const [status, setStatus] = useState<
    'idle' | 'starting' | 'scanning' | 'error'
  >('idle')
  const [errorMessage, setErrorMessage] = useState('')

  onResultRef.current = onResult
  onErrorRef.current = onError

  const emitResult = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || firedRef.current) return
    firedRef.current = true
    onResultRef.current(trimmed)
    controlsRef.current?.stop()
    controlsRef.current = null
    if (nativeTimerRef.current != null) {
      window.clearInterval(nativeTimerRef.current)
      nativeTimerRef.current = null
    }
    stopStream(streamRef.current)
    streamRef.current = null
  }

  useEffect(() => {
    return () => {
      controlsRef.current?.stop()
      controlsRef.current = null
      if (nativeTimerRef.current != null) {
        window.clearInterval(nativeTimerRef.current)
        nativeTimerRef.current = null
      }
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  // getUserMedia must start from a tap on iOS Safari — not from useEffect.
  const startCamera = () => {
    const video = videoRef.current
    if (!video) return
    if (!navigator.mediaDevices?.getUserMedia) {
      const message = 'This browser cannot access the camera.'
      setStatus('error')
      setErrorMessage(message)
      onErrorRef.current?.(message)
      return
    }

    controlsRef.current?.stop()
    controlsRef.current = null
    if (nativeTimerRef.current != null) {
      window.clearInterval(nativeTimerRef.current)
      nativeTimerRef.current = null
    }
    stopStream(streamRef.current)
    streamRef.current = null
    firedRef.current = false
    setStatus('starting')
    setErrorMessage('')

    void (async () => {
      try {
        const stream = await openCameraStream()

        if (!videoRef.current) {
          stopStream(stream)
          return
        }

        streamRef.current = stream
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.muted = true
        await video.play().catch(() => undefined)
        await waitForVideoDimensions(video)

        const Detector = getBarcodeDetector()
        if (Detector) {
          const detector = new Detector({ formats: [...NATIVE_FORMATS] })
          setStatus('scanning')
          nativeTimerRef.current = window.setInterval(() => {
            if (firedRef.current || !videoRef.current) return
            void detector
              .detect(videoRef.current)
              .then((codes) => {
                const value = codes[0]?.rawValue
                if (value) emitResult(value)
              })
              .catch(() => undefined)
          }, 250)
          return
        }

        // Let ZXing own the stream attachment so its capture canvas gets real dimensions.
        const reader = createReader()
        const scannerControls = await reader.decodeFromStream(
          stream,
          video,
          (result) => {
            if (result) emitResult(result.getText())
          },
        )
        controlsRef.current = scannerControls
        setStatus('scanning')
      } catch (err: unknown) {
        stopStream(streamRef.current)
        streamRef.current = null
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
            iPhone needs a tap before the camera can open.
          </p>
          <Button type="button" onClick={startCamera}>
            Enable camera
          </Button>
        </div>
      ) : null}

      {status === 'scanning' ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-28 w-4/5 rounded-xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          <p className="absolute bottom-6 left-0 right-0 text-center text-sm font-medium text-white/90">
            Hold steady over the ISBN barcode
          </p>
        </div>
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
