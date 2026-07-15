import { useEffect, useState } from 'react'
import { detectPlatform, isStandaloneDisplay } from '@/lib/platform'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  )
  const [installed, setInstalled] = useState(() => isStandaloneDisplay())
  const platform = detectPlatform()

  useEffect(() => {
    setInstalled(isStandaloneDisplay())

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  return {
    canInstall: deferred !== null && !installed,
    installed,
    platform,
    isIos: platform === 'ios',
    isDesktop:
      platform === 'mac' || platform === 'windows' || platform === 'linux',
    isAndroid: platform === 'android',
    promptInstall: async () => {
      if (!deferred) return false
      await deferred.prompt()
      const choice = await deferred.userChoice
      setDeferred(null)
      if (choice.outcome === 'accepted') setInstalled(true)
      return choice.outcome === 'accepted'
    },
  }
}
