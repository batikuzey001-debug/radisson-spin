// web/src/app/livescores/live/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import LiveRowItem from '@/components/LiveRowItem'
import { useRouter } from 'next/navigation'

type Team = { name: string; logo?: string | null }
type League = { name?: string | null; logo?: string | null }
type Odds  = { H?: number | null; D?: number | null; A?: number | null; bookmaker?: string | null }
type Prob  = { H?: number | null; D?: number | null; A?: number | null }
type ApiItem = {
  fixture_id: number
  league: League
  home: Team
  away: Team
  score: { home?: number | null; away?: number | null }
  time: string | number
  odds?: Odds
  prob?: Prob
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/+$/, '')

export default function LiveScoresLivePage() {
  const router = useRouter()
  const [items, setItems] = useState<ApiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refTs, setRefTs] = useState<number>(0)

  async function load() {
    if (!API_BASE) {
      setError('NEXT_PUBLIC_API_BASE eksik (Railway → WEB → Variables).')
      setLoading(false)
      return
    }
    setError(null)
    try {
      setLoading(true)
      const r = await fetch(`${API_BASE}/livescores/list`, { cache: 'no-store' })
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
      const data = (await r.json()) as ApiItem[]
      setItems(Array.isArray(data) ? data : [])
      setRefTs(Date.now())
    } catch (e: any) {
      setError(e?.message || 'Yükleme hatası')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 10_000) // 10 sn
    return () => clearInterval(id)
  }, [])

  // Lig bazında grupla
  const groups = useMemo(() => {
    const map = new Map<string, ApiItem[]>()
    for (const it of items) {
      const k = it.league?.name || 'Other'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(it)
    }
    return Array.from(map.entries())
  }, [items])

  function handleClick(id: number) {
    // Mobil/desktop ayrımına girmeden sade yönlendirme:
    router.push(`/livescores/${id}`)
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Canlı Maçlar (API)</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="px-3 py-1.5 rounded-md bg-gradient-to-r from-neon to-neon2 text-black font-semibold hover:opacity-90 transition disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Yükleniyor…' : 'Yenile'}
          </button>
          <span className="text-xs text-white/60">
            {refTs ? new Date(refTs).toLocaleTimeString('tr-TR') : '—'}
          </span>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-[#5a1f22] bg-[#2a1215] px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="text-white/70">Şu anda listelenecek maç bulunamadı.</div>
      )}

      <div className="space-y-6">
        {groups.map(([leagueName, list]) => (
          <section key={leagueName} className="rounded-xl border border-white/10 bg-[#0a0f1a]">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
              {/* Lig logosu varsa küçük ikon, yoksa ad */}
              {list[0]?.league?.logo ? (
                <>
                  <img src={list[0].league.logo!} className="h-4 w-4 object-contain" alt="" />
                  <span className="text-sm font-semibold text-white/90">{leagueName}</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-white/90">{leagueName}</span>
              )}
            </div>

            <div className="p-2 space-y-2">
              {list.map((it) => (
                <LiveRowItem
                  key={it.fixture_id}
                  id={it.fixture_id}
                  league={it.league}
                  home={it.home}
                  away={it.away}
                  score={it.score}
                  time={it.time}
                  odds={{ H: it.odds?.H, D: it.odds?.D, A: it.odds?.A }}
                  prob={it.prob}
                  onClick={handleClick}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
