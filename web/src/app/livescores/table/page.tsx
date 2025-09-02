// web/src/app/livescores/table/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Team = { name: string; logo?: string | null }
type League = { name?: string | null; logo?: string | null; country?: { name?: string | null; flag?: string | null } }
type Odds  = { H?: number | null; D?: number | null; A?: number | null; bookmaker?: string | null }
type Prob  = { H?: number | null; D?: number | null; A?: number | null }
type Item  = {
  fixture_id: number
  date?: string | null               // "YYYY-MM-DD" (UTC)
  kickoff_utc?: string | null        // "YYYY-MM-DDTHH:mm:SSZ"
  league: League
  home: Team
  away: Team
  score: { home?: number | null; away?: number | null }
  time: string | number              // number => live minute, string "KO HH:MM" or status
  odds?: Odds
  prob?: Prob
}

type BulletinResp = { range: { from: string; to: string }, count: number, items: Item[] }

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/+$/, '')
const REFRESH = Number(process.env.NEXT_PUBLIC_LIVE_REFRESH_MS || 10000)

function todayUTC() {
  const d = new Date()
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}
function addDaysUTC(d: Date, n: number) {
  const x = new Date(d); x.setUTCDate(x.getUTCDate()+n); return x
}
function ymd(d: Date) {
  return d.toISOString().slice(0,10)
}
function toTR(dtIso?: string | null) {
  if (!dtIso) return '—'
  try {
    return new Date(dtIso).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
  } catch { return '—' }
}
const fmt2 = (v?: number | null) => (typeof v === 'number' ? v.toFixed(2) : '—')
const pct  = (v?: number | null) => (typeof v === 'number' ? `${Math.round(v)}%` : '—')

export default function LiveScoresTable() {
  const [live, setLive] = useState<Item[]>([])
  const [bulletin, setBulletin] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [auto, setAuto] = useState(true)
  const [ts, setTs] = useState<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function load() {
    if (!API_BASE) { setErr('NEXT_PUBLIC_API_BASE eksik.'); return }
    setErr(null); setLoading(true)
    try {
      // 1) live/list (inplay varsa dakikalı; yoksa bugünün bazı maçları)
      const r1 = await fetch(`${API_BASE}/livescores/list`, { cache: 'no-store' })
      const j1 = r1.ok ? await r1.json() as Item[] : []
      setLive(Array.isArray(j1) ? j1 : [])

      // 2) bulletin (bugün → +2 gün)
      const from = ymd(todayUTC())
      const to   = ymd(addDaysUTC(todayUTC(), 2))
      const r2 = await fetch(`${API_BASE}/livescores/bulletin?from=${from}&to=${to}`, { cache: 'no-store' })
      const j2 = r2.ok ? await r2.json() as BulletinResp : { items: [] as Item[] }
      setBulletin(Array.isArray(j2.items) ? j2.items : [])

      setTs(Date.now())
    } catch (e:any) {
      setErr(e?.message || 'Yükleme hatası')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    function start() {
      if (!auto || document.hidden) return
      stop()
      timerRef.current = setInterval(load, Math.max(3000, REFRESH))
    }
    function stop() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
    start()
    const vis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', vis)
    return () => { stop(); document.removeEventListener('visibilitychange', vis) }
  }, [auto])

  // Birleştir: canlılar en üstte, sonra en yakın KO (kickoff_utc) artan
  const rows = useMemo(() => {
    const map = new Map<number, Item>()
    for (const x of bulletin) map.set(x.fixture_id, x)
    // canlı bilgisi varsa overwrite (dakika/time ve skor öncelikli)
    for (const x of live) map.set(x.fixture_id, { ...(map.get(x.fixture_id) || x), ...x })

    const arr = Array.from(map.values())
    const isLive = (it: Item) => typeof it.time === 'number' // dakika ise canlı
    arr.sort((a,b) => {
      const al = isLive(a) ? 1 : 0, bl = isLive(b) ? 1 : 0
      if (al !== bl) return bl - al // canlı önce
      const ak = a.kickoff_utc ? Date.parse(a.kickoff_utc) : Infinity
      const bk = b.kickoff_utc ? Date.parse(b.kickoff_utc) : Infinity
      return ak - bk
    })
    return arr
  }, [live, bulletin])

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Canlı + Yaklaşan Maçlar (API)</h1>
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={load}
            className="px-3 py-1.5 rounded-md bg-gradient-to-r from-neon to-neon2 text-black font-semibold hover:opacity-90 transition disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Yükleniyor…' : 'Yenile'}
          </button>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={auto} onChange={(e)=>setAuto(e.target.checked)} />
            Otomatik ({Math.max(3000, REFRESH)/1000}s)
          </label>
          <span className="text-xs text-white/60">{ts ? new Date(ts).toLocaleTimeString('tr-TR') : '—'}</span>
        </div>
      </header>

      {err && <div className="mb-4 rounded-md border border-[#5a1f22] bg-[#2a1215] px-3 py-2 text-sm">{err}</div>}

      <div className="overflow-auto rounded-xl border border-white/10 bg-[#0a0f1a]">
        <table className="min-w-[820px] w-full border-collapse">
          <thead>
            <tr className="text-left text-xs text-white/60 border-b border-white/10">
              <th className="px-3 py-2">Durum / Tarih</th>
              <th className="px-3 py-2">Lig</th>
              <th className="px-3 py-2">Ev Sahibi</th>
              <th className="px-3 py-2">Skor</th>
              <th className="px-3 py-2">Deplasman</th>
              <th className="px-3 py-2">Saat (TR)</th>
              <th className="px-3 py-2">Oran H/D/A</th>
              <th className="px-3 py-2">İhtimal H/D/A</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it) => {
              const live = typeof it.time === 'number'
              const trTime = toTR(it.kickoff_utc || '')
              const dateLabel = it.date
                ? new Date((it.date)+'T00:00:00Z').toLocaleDateString('tr-TR', { day:'2-digit', month:'short', year:'numeric' })
                : '—'
              return (
                <tr key={it.fixture_id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-3 py-2 text-xs">
                    {live ? (
                      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 bg-[#0e1630] border border-[#163968] text-[#8bb7ff]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#00d4ff] animate-pulse shadow-[0_0_6px_#00d4ff]" />
                        {it.time}'
                      </span>
                    ) : (
                      <span className="text-white/70">{dateLabel}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {it.league?.logo ? <img src={it.league.logo} alt="" className="h-4 w-4 object-contain" /> : null}
                      <span className="text-sm">{it.league?.name || '—'}</span>
                      {it.league?.country?.flag ? <img src={it.league.country.flag} alt="" className="h-3 w-3 object-contain opacity-80" /> : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {it.home?.logo ? <img src={it.home.logo} className="h-5 w-5 rounded-sm object-contain" alt="" /> : <span className="h-5 w-5 rounded-sm bg-white/10 inline-block" />}
                      <span className="truncate text-sm">{it.home?.name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex items-center gap-2 rounded-md bg-[#0e1630] border border-[#163968] px-2 py-0.5 text-sm font-bold tabular-nums">
                      {it.score?.home ?? '–'} <span className="text-white/50">:</span> {it.score?.away ?? '–'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 justify-end min-w-0">
                      <span className="truncate text-sm text-right">{it.away?.name || '—'}</span>
                      {it.away?.logo ? <img src={it.away.logo} className="h-5 w-5 rounded-sm object-contain" alt="" /> : <span className="h-5 w-5 rounded-sm bg-white/10 inline-block" />}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm">{trTime}</td>
                  <td className="px-3 py-2 text-sm">
                    {fmt2(it.odds?.H)} / {fmt2(it.odds?.D)} / {fmt2(it.odds?.A)}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {pct(it.prob?.H)} / {pct(it.prob?.D)} / {pct(it.prob?.A)}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && !loading && (
              <tr><td className="px-3 py-6 text-center text-white/60" colSpan={8}>Veri yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
