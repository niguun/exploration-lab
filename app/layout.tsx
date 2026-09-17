import type { Metadata } from 'next'
import 'katex/dist/katex.min.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Exploration Lab',
  description: 'Interactive STEM learning through observation and evidence',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen relative">{children}</body>
    </html>
  )
}
