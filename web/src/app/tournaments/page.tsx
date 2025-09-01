// web/src/app/tournaments/page.tsx
import TournamentCard from '@/components/TournamentCard'

export const dynamic = 'force-dynamic'

type Tournament = {
  id: number
  title: string
  image_url?: string | null
  category?: string | null
  status?: 'published' | 'draft'
  start_at?: string | null
  end_at?: string | null
  // backend content.py tarafında eklediğimiz alanlar:
  ui?: { label: string; badgeColor: string; ribbonBg: string; ctaBg: string }
  prize_pool?: number | null
  participant_count?: number | null
}

async function fetchAll(): Promise<Tournament[]> {
  const BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/+$/, '')
  const CONTENT_PREFIX = (process.env.NEXT_PUBLIC_CONTENT_PREFIX || '').replace(/\/+$/, '')
  if (!BASE) return []
  const candidates = [
    `${BASE}${CONTENT_PREFIX}/content/tournaments?status=published`,
    `${BASE}${CONTENT_PREFIX}/content/tournaments`,
  ]
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store', headers: { 'Content-Type': 'application/json' } })
      if (!res.ok) continue
      const data = (await res.json()) as Tournament[]
      if (Array.isArray(data)) return data
    } catch {
      /* sessiz geç */
    }
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
        <div className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
          {items.map((t) => (
            <TournamentCard key={t.id} item={t} />
          ))}
        </div>
      )}
    </main>
  )
}
