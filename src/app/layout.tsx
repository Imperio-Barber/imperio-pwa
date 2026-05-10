import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Imperio Barber Panel',
  description: 'Lekki panel PWA do ewidencji utargów w salonie.',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#080808',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  )
}
