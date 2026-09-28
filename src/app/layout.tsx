import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'react-hot-toast'
import { getCSSVariables, ACTIVE_THEME } from '@/lib/theme-config'
import { BRAND } from '@/lib/brand'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: { default: `${BRAND.name} – Restaurant management`, template: `%s · ${BRAND.name}` },
  description: 'QR table ordering, live kitchen orders, inventory, recipes and analytics for restaurants.',
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeVars = getCSSVariables(ACTIVE_THEME)
  const css = `:root{${Object.entries(themeVars)
    .map(([k, v]) => `${k}:${v};`)
    .join('')}}`

  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <style dangerouslySetInnerHTML={{ __html: css }} />
        </head>
        <body className={inter.className}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
