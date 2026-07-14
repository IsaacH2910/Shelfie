import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/context/AuthProvider'
import { Toaster } from '@/components/ui/sonner'
import { queryClient, persister, setupQueryCacheListeners, shouldPersistQuery, onPersistRestore } from '@/lib/queryClient'
import App from '@/App'
import '@/index.css'

const WEEK = 1000 * 60 * 60 * 24 * 7

setupQueryCacheListeners(queryClient)

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
            <App />
          </BrowserRouter>
          <Toaster />
        </AuthProvider>
      </PersistQueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
