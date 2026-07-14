import { useEffect, useRef, useState } from 'react'
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { CameraOff } from 'lucide-react'
import { Spinner } from '@/components/Spinner'

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
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>(
    'starting',
  )
  const [errorMessage, setErrorMessage] = useState('')

  onResultRef.current = onResult
  onErrorRef.current = onError

  useEffect(() => {
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
    ])
    const reader = new BrowserMultiFormatReader(hints)
    let controls: IScannerControls | null = null
    let cancelled = false

    const video = videoRef.current
    if (!video) return

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        video,
        (result) => {
          if (result && !firedRef.current) {
            firedRef.current = true
            onResultRef.current(result.getText())
            controls?.stop()
          }
        },
      )
      .then((scannerControls) => {
        controls = scannerControls
        if (cancelled) {
          scannerControls.stop()
        } else {
          setStatus('scanning')
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : 'Unable to access the camera'
        setStatus('error')
        setErrorMessage(message)
        onErrorRef.current?.(message)
      })

    return () => {
      cancelled = true
      controls?.stop()
    }
  }, [])

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
      />

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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-white/90">
          <CameraOff className="h-7 w-7" />
          <p className="text-sm">{errorMessage || 'Camera unavailable'}</p>
          <p className="text-xs text-white/70">
            Allow camera access, or add the book manually.
          </p>
        </div>
      ) : null}
    </div>
  )
}
