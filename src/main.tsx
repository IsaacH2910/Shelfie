import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/context/AuthProvider'
import { Toaster } from '@/components/ui/sonner'
import { queryClient, persister, setupQueryCacheListeners, shouldPersistQuery, onPersistRestore } from '@/lib/queryClient'
import { installGlobalCrashHandlers } from '@/lib/crashLog'
import App from '@/App'
import '@/index.css'

const WEEK = 1000 * 60 * 60 * 24 * 7

setupQueryCacheListeners(queryClient)

function CrashHandlers() {
  useEffect(() => installGlobalCrashHandlers(), [])
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: WEEK,
          dehydrateOptions: {
            shouldDehydrateQuery: shouldPersistQuery,
          },
        }}
        onSuccess={() => onPersistRestore(queryClient)}
      >
        <AuthProvider>
          <BrowserRouter>
            <CrashHandlers />
            <App />
          </BrowserRouter>
          <Toaster />
        </AuthProvider>
      </PersistQueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
