import { isTauri } from '@/lib/platform'

export type DesktopUpdateInfo = {
  version: string
  notes: string | null
  downloadAndInstall: () => Promise<void>
}

const SKIP_KEY = 'shelfie.desktop.skipUpdate'

export function getSkippedUpdateVersion(): string | null {
  try {
    return localStorage.getItem(SKIP_KEY)
  } catch {
    return null
  }
}

export function skipUpdateVersion(version: string) {
  try {
    localStorage.setItem(SKIP_KEY, version)
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearSkippedUpdateVersion() {
  try {
    localStorage.removeItem(SKIP_KEY)
  } catch {
    /* ignore */
  }
}

/** Check GitHub Releases via Tauri updater. Returns null if up to date or not desktop. */
export async function checkForDesktopUpdate(): Promise<DesktopUpdateInfo | null> {
  if (!isTauri()) return null
  const { check } = await import('@tauri-apps/plugin-updater')
  const update = await check()
  if (!update) return null
  return {
    version: update.version,
    notes: update.body ?? null,
    downloadAndInstall: () => update.downloadAndInstall(),
  }
}

export async function installDesktopUpdateAndRelaunch(
  update: DesktopUpdateInfo,
): Promise<void> {
  const { relaunch } = await import('@tauri-apps/plugin-process')
  await update.downloadAndInstall()
  clearSkippedUpdateVersion()
  await relaunch()
}
