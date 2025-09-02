// web/src/app/livescores/board/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import LiveMatchCard, { type ApiItem } from '@/components/LiveMatchCard'

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/+$/, '')
const REFRESH_MS = Number(process.env.NEXT_PUBLIC_LIVE_REFRESH_MS || 10000)

export default function LiveBoardPage() {
  const [items, setItems] = useState<ApiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [auto, setAuto] = useState(true)
  const [ts, setTs] = useState<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function load() {
    if (!API_BASE) {
      setError('NEXT_PUBLIC_API_BASE eksik.')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const r = await fetch(`${API_BASE}/livescores/list`, { cache: 'no-store' })
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
      const data = (await r.json()) as ApiItem[]
      setItems(Array.isArray(data) ? data : [])
      setError(null)
      setTs(Date.now())
    } catch (e: any) {
      setError(e?.message || 'Yükleme hatası')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    function start() {
      if (!auto || document.hidden) return
      stop()
      timerRef.current = setInterval(load, Math.max(3000, REFRESH_MS))
    }
    function stop() {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    start()
    const vis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', vis)
    return () => { stop(); document.removeEventListener('visibilitychange', vis) }
  }, [auto])

  // Lig bazında gruplandır ve kartları sırala (inplay üstte, KO altta)
  const groups = useMemo(() => {
    const map = new Map<string, ApiItem[]>()
    for (const it of items) {
      const k = it.league?.name || 'Other'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(it)
    }
    // inplay (dakika) önce, KO sonrasında
    const sortFn = (a: ApiItem, b: ApiItem) => {
      const aIn = typeof a.time === 'number' ? 1 : 0
      const bIn = typeof b.time === 'number' ? 1 : 0
      if (aIn !== bIn) return bIn - aIn
      return (a.fixture_id || 0) - (b.fixture_id || 0)
    }
    return Array.from(map.entries()).map(([k, v]) => [k, v.sort(sortFn)] as [string, ApiItem[]])
  }, [items])

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Canlı Maç Panosu (API)</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="px-3 py-1.5 rounded-md bg-gradient-to-r from-neon to-neon2 text-black font-semibold hover:opacity-90 transition disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Yükleniyor…' : 'Yenile'}
          </button>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={auto} onChange={(e)=>setAuto(e.target.checked)} />
            Otomatik ({Math.max(3000, REFRESH_MS)/1000}s)
          </label>
          <span className="text-xs text-white/60">{ts ? new Date(ts).toLocaleTimeString('tr-TR') : '—'}</span>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-[#5a1f22] bg-[#2a1215] px-3 py-2 text-sm">{error}</div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="text-white/70">Şu an gösterilecek maç bulunamadı.</div>
      )}

      <div className="space-y-8">
        {groups.map(([leagueName, list]) => (
          <section key={leagueName}>
            <div className="mb-3 flex items-center gap-2">
              {list[0]?.league?.logo ? (
                <img src={list[0].league.logo!} alt="" className="h-5 w-5 object-contain" />
              ) : null}
              <h2 className="text-lg font-semibold">{leagueName}</h2>
              <span className="text-xs text-white/50">({list.length})</span>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((it) => (
                <LiveMatchCard key={it.fixture_id} item={it} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
