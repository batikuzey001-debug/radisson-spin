// web/src/app/page.tsx
import Link from 'next/link'

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(255,0,51,0.25),_transparent_50%)]" />
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
            <span className="text-neon">Neon</span> <span>kırmızı</span> & <span>gece siyahı</span> sahnede
          </h1>
          <p className="mt-3 md:mt-4 text-white/70 max-w-2xl mx-auto">
            Turnuvalara katıl, kodunu gir, çarkı çevir. Hızlı, akıcı, mobil uyumlu.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/tournaments" className="px-5 py-2.5 rounded-md border border-white/15 hover:border-neon transition">
              Turnuvaları Gör
            </Link>
            <Link href="/wheel" className="px-5 py-2.5 rounded-md bg-gradient-to-r from-neon to-neon2 text-black font-semibold hover:opacity-90 transition">
              Çarkı Çevir
            </Link>
          </div>
        </div>
      </section>

      {/* ÖNİZLEME (şimdilik placeholder, sonra API bağlarız) */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Öne Çıkan Turnuvalar</h2>
          <Link href="/tournaments" className="text-sm text-white/70 hover:text-neon">Tümünü gör →</Link>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="rounded-xl border border-[#1b1d26] bg-[#111114]">
              <div className="h-36 rounded-t-xl bg-[#151824]" />
              <div className="p-3">
                <div className="text-sm font-semibold">Turnuva #{i + 1}</div>
                <div className="text-xs text-white/60">Kategori • Yayında</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
