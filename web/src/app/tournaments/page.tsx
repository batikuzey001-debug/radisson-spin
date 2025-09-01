// web/src/app/tournaments/page.tsx
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

async function fetchAll(): Promise<Tournament[]> {
  const BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/+$/, '')
  const CONTENT_PREFIX = (process.env.NEXT_PUBLIC_CONTENT_PREFIX || '').replace(/\/+$/, '')
  if (!BASE) return []
  // 1) published + limit dene, 2) fallback filtresiz dene
  const candidates = [
    `${BASE}${CONTENT_PREFIX}/content/tournaments?status=published`,
    `${BASE}${CONTENT_PREFIX}/content/tournaments`,
  ]
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store', headers: { 'Content-Type': 'application/json' } })
      if (!res.ok) continue
      const data = (await res.json()) as Tournament[]
      if (Array.isArray(data) && data.length >= 0) return data
    } catch { /* geç */ }
  }
  return []
}

export default async function Tournaments() {
  const items = await fetchAll()

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-4">Turnuvalar</h1>

      {items.length === 0 ? (
        <div className="text-white/70">Şu an listelenecek turnuva yok.</div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {items.map((t) => (
            <li key={t.id} className="rounded-xl border border-[#1b1d26] bg-[#111114]">
              <div className="h-40 rounded-t-xl bg-[#151824] overflow-hidden">
                {t.image_url && <img src={t.image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold">{t.title}</div>
                <div className="text-xs text-white/60">
                  {(t.category || 'genel').toUpperCase()} • {t.status === 'published' ? 'Yayında' : 'Taslak'}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
