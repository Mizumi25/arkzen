import '@/styles/globals.css'
import { ToastProvider } from '@/arkzen/core/components/Toast'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider position="top-right">
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
