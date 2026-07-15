import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Button } from '@/components/ui/button'

type Rect = { x: number; y: number; w: number; h: number }

/** Simple drag-to-crop overlay for cover photos before OCR. */
export function ImageCropper({
  src,
  onCrop,
  onCancel,
}: {
  src: string
  onCrop: (blob: Blob, previewUrl: string) => void
  onCancel: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const canvas = canvasRef.current
      if (!canvas) return
      const maxW = Math.min(480, img.width)
      const scale = maxW / img.width
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      setRect({
        x: Math.round(canvas.width * 0.1),
        y: Math.round(canvas.height * 0.1),
        w: Math.round(canvas.width * 0.8),
        h: Math.round(canvas.height * 0.8),
      })
    }
    img.src = src
  }, [src])

  useEffect(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !img || !ctx || !rect) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.clearRect(rect.x, rect.y, rect.w, rect.h)
    ctx.drawImage(
      img,
      (rect.x / canvas.width) * img.width,
      (rect.y / canvas.height) * img.height,
      (rect.w / canvas.width) * img.width,
      (rect.h / canvas.height) * img.height,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
    )
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
  }, [rect, src])

  const pointer = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const bounds = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((e.clientY - bounds.top) / bounds.height) * canvas.height,
    }
  }

  const applyCrop = async () => {
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!img || !canvas || !rect) return
    const scaleX = img.width / canvas.width
    const scaleY = img.height / canvas.height
    const out = document.createElement('canvas')
    out.width = Math.max(1, Math.round(rect.w * scaleX))
    out.height = Math.max(1, Math.round(rect.h * scaleY))
    const ctx = out.getContext('2d')
    if (!ctx) return
    ctx.drawImage(
      img,
      rect.x * scaleX,
      rect.y * scaleY,
      rect.w * scaleX,
      rect.h * scaleY,
      0,
      0,
      out.width,
      out.height,
    )
    const blob = await new Promise<Blob | null>((resolve) =>
      out.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
    )
    if (!blob) return
    onCrop(blob, URL.createObjectURL(blob))
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Drag on the image to choose one book cover, then crop.
      </p>
      <canvas
        ref={canvasRef}
        className="mx-auto max-h-80 w-full max-w-md touch-none rounded-xl border border-border"
        onPointerDown={(e) => {
          const p = pointer(e)
          dragStart.current = p
          setRect({ x: p.x, y: p.y, w: 1, h: 1 })
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!dragStart.current) return
          const p = pointer(e)
          const x = Math.min(dragStart.current.x, p.x)
          const y = Math.min(dragStart.current.y, p.y)
          setRect({
            x,
            y,
            w: Math.abs(p.x - dragStart.current.x),
            h: Math.abs(p.y - dragStart.current.y),
          })
        }}
        onPointerUp={() => {
          dragStart.current = null
        }}
      />
      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={() => void applyCrop()}>
          Crop & read
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
