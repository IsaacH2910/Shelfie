/** Shared camera helpers for barcode + cover scanners. */

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop())
}

export async function openCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser cannot access the camera.')
  }
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

export function getVideoTrack(
  stream: MediaStream | null | undefined,
): MediaStreamTrack | null {
  return stream?.getVideoTracks()?.[0] ?? null
}

/** True when the active video track exposes a torch/flashlight. */
export function supportsTorch(stream: MediaStream | null | undefined): boolean {
  const track = getVideoTrack(stream)
  if (!track) return false
  const caps = track.getCapabilities?.() as
    | (MediaTrackCapabilities & { torch?: boolean })
    | undefined
  return Boolean(caps?.torch)
}

export async function setTorch(
  stream: MediaStream | null | undefined,
  on: boolean,
): Promise<boolean> {
  const track = getVideoTrack(stream)
  if (!track || !supportsTorch(stream)) return false
  try {
    await track.applyConstraints({
      // @ts-expect-error torch is a non-standard but widely supported constraint
      advanced: [{ torch: on }],
    })
    return true
  } catch {
    try {
      await track.applyConstraints({
        torch: on,
      } as MediaTrackConstraints)
      return true
    } catch {
      return false
    }
  }
}

export function friendlyCameraError(err: unknown): string {
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
