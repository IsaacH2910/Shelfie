export type ClientPlatform =
  | 'ios'
  | 'android'
  | 'mac'
  | 'windows'
  | 'linux'
  | 'other'

export function detectPlatform(): ClientPlatform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  if (/macintosh|mac os x/i.test(ua)) return 'mac'
  if (/windows/i.test(ua)) return 'windows'
  if (/linux/i.test(ua)) return 'linux'
  return 'other'
}

/** True when running inside the Tauri desktop shell. */
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false
  return (
    '__TAURI_INTERNALS__' in window ||
    '__TAURI__' in window
  )
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  if (isTauri()) return true
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}
