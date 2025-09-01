import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ana Sayfa',
  description: 'Turnuvalar ve Çark uygulaması',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-dark text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
