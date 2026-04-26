import '@/styles/globals.css'
import { ToastProvider } from '@/arkzen/core/components/Toast'
import { getRegistry } from '@/arkzen/core/registry'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Arkzen Engine',
  description: 'Full-stack scaffolding engine',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Favicon injection — will be overridden per-tatemono */}
      </head>
      <body>
        <ToastProvider position="top-right">
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
