// web/src/app/page.tsx
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Tournament = {
  id: number
  title: string
  image_url?: string | null
  category?: string | null
  status?: 'published' | 'draft'
  start_at?: string | null
  end_at?: string | null
}

/* Neden burada?: Sadece bu sayfayı değiştirmek istedin; harici api.ts şartı olmadan çalışır. */
async function fetchTournaments(limit = 6): Promise<Tournament[]> {
  const BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/+$/, '')
  const CONTENT_PREFIX = (process.env.NEXT_PUBLIC_CONTENT_PREFIX || '').replace(/\/+$/, '')
  const url = `${BASE}${CONTENT_PREFIX}/content/tournaments${limit ? `?limit=${limit}` : ''}`
  if (!BASE) return [] // env yoksa sessizce boş liste
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { 'Content-Type': 'application/json' } })
    if (!res.ok) return []
    return (await res.json()) as Tournament[]
  } catch {
    return []
  }
}

export default async function HomePage() {
  const preview = await fetchTournaments(6)

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

      {/* ÖNİZLEME (API bağlı) */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Öne Çıkan Turnuvalar</h2>
          <Link href="/tournaments" className="text-sm text-white/70 hover:text-neon">Tümünü gör →</Link>
        </div>

        {preview.length === 0 ? (
          <div className="text-white/60 text-sm">Şu an önizleme bulunamadı.</div>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {preview.map((t) => (
              <li key={t.id} className="rounded-xl border border-[#1b1d26] bg-[#111114]">
                <div className="h-36 rounded-t-xl bg-[#151824] overflow-hidden">
                  {t.image_url && <img src={t.image_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="p-3">
                  <div className="text-sm font-semibold">{t.title}</div>
                  <div className="text-xs text-white/60">{(t.category || 'genel').toUpperCase()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
