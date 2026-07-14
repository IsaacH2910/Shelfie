import { useEffect, useRef, useState } from 'react'
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { Camera, CameraOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/Spinner'

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
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
  ])
  return new BrowserMultiFormatReader(hints)
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
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
  const [status, setStatus] = useState<
    'idle' | 'starting' | 'scanning' | 'error'
  >('idle')
  const [errorMessage, setErrorMessage] = useState('')

  onResultRef.current = onResult
  onErrorRef.current = onError

  useEffect(() => {
    return () => {
      controlsRef.current?.stop()
      controlsRef.current = null
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
    stopStream(streamRef.current)
    streamRef.current = null
    firedRef.current = false
    setStatus('starting')
    setErrorMessage('')

    void (async () => {
      try {
        // Prefer rear camera; fall back to any camera if that fails.
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: 'environment' } },
          })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          })
        }

        if (!videoRef.current) {
          stopStream(stream)
          return
        }

        streamRef.current = stream
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        await video.play().catch(() => undefined)

        const reader = createReader()
        const scannerControls = await reader.decodeFromStream(
          stream,
          video,
          (result) => {
            if (result && !firedRef.current) {
              firedRef.current = true
              onResultRef.current(result.getText())
              controlsRef.current?.stop()
              stopStream(streamRef.current)
              streamRef.current = null
            }
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
            Point at the barcode on the back cover
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
