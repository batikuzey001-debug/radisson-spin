// web/src/app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Spin • Ana Sayfa',
  description: 'Turnuvalar ve Çark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-dark text-white min-h-screen">
        <header className="sticky top-0 z-50 border-b border-[#1b1d26] bg-[#0a0b0fcc]/90 backdrop-blur">
          <nav className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-extrabold tracking-wide">
              <span className="text-neon">SPIN</span><span className="text-white/80">ZONE</span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/tournaments" className="hover:text-neon transition-colors">Turnuvalar</Link>
              <Link href="/wheel" className="px-3 py-1.5 rounded-md bg-gradient-to-r from-neon to-neon2 text-black font-semibold hover:opacity-90 transition">
                Çarkı Çevir
              </Link>
            </div>
          </nav>
        </header>

        <main>{children}</main>

        <footer className="mt-16 border-t border-[#1b1d26]">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-white/60">
            © {new Date().getFullYear()} SpinZone — Tüm hakları saklıdır.
          </div>
        </footer>
      </body>
    </html>
  )
}
