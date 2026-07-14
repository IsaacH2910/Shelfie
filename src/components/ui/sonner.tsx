import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useTheme } from '@/components/theme-provider'

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme()
  return (
    <Sonner
      theme={resolvedTheme}
      position="top-center"
      richColors
      toastOptions={{
        classNames: {
          toast:
            'group rounded-xl border border-border bg-card text-card-foreground shadow-lg',
        },
      }}
      {...props}
    />
  )
}
