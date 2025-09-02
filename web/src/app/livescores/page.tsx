// web/src/app/livescores/page.tsx
import LiveScoreCard from '@/components/LiveScoreCard'

export const dynamic = 'force-dynamic'

type League = { name: string; logo?: string | null }
type Team = { name: string; logo?: string | null; xg?: number | null }
type Score = { home?: number | null; away?: number | null }
type Odds  = { H?: number | null; D?: number | null; A?: number | null; bookmaker?: string | null }
type Prob  = { H?: number | null; D?: number | null; A?: number | null }

type LiveItem = {
  league: League
  home: Team
  away: Team
  score: Score
  time: string
  odds?: Odds
  prob?: Prob
}

async function fetchLiveList(): Promise<LiveItem[]> {
  const BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/+$/, '')
  if (!BASE) return []
  try {
    const r = await fetch(`${BASE}/livescores/list`, { cache: 'no-store', headers: { 'Content-Type': 'application/json' } })
    if (!r.ok) return []
    const data = (await r.json()) as LiveItem[]
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export default async function LiveScoresPage() {
  const items = await fetchLiveList()

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">CANLI SKOR</h1>

      {items.length === 0 ? (
        <div className="text-white/70">Şu anda listelenecek canlı maç bulunamadı.</div>
      ) : (
        <div className="grid gap-5 grid-cols-1 lg:grid-cols-3">
          {items.map((it, idx) => (
            <LiveScoreCard
              key={idx}
              league={it.league}
              home={it.home}
              away={it.away}
              score={it.score}
              time={it.time}
              odds={it.odds}
              prob={it.prob}
            />
          ))}
        </div>
      )}
    </main>
  )
}
