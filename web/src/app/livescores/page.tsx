// web/src/app/livescores/page.tsx
'use client'

import { useEffect, useState } from 'react'

type Props = {}
type Sample = { sample?: any[] }

const BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/+$/, '')

export default function LiveScoresPage(_: Props) {
  const [items, setItems] = useState<string[]>([])
  const [sample, setSample] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [auto, setAuto] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [ts, setTs] = useState<number>(0)

  async function loadAll() {
    if (!BASE) {
      setErr('NEXT_PUBLIC_API_BASE boş. Railway → WEB → Variables ekleyin.')
      return
    }
    setErr(null)
    setLoading(true)
    try {
      // ticker
      const r1 = await fetch(`${BASE}/livescores`, { cache: 'no-store' })
      const data1 = r1.ok ? ((await r1.json()) as string[]) : []
      setItems(Array.isArray(data1) ? data1 : [])

      // sample
      const r2 = await fetch(`${BASE}/livescores/sample`, { cache: 'no-store' })
      const data2 = r2.ok ? ((await r2.json()) as Sample) : { sample: [] }
      setSample((data2.sample && data2.sample[0]) || null)
      setTs(Date.now())
    } catch (e: any) {
      setErr(e?.message || 'Yükleme hatası')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!auto) return
    const id = setInterval(loadAll, 8000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto])

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">CANLI SKOR</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            disabled={loading}
            className="px-3 py-1.5 rounded-md bg-gradient-to-r from-neon to-neon2 text-black font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? 'Yükleniyor…' : 'Yenile'}
          </button>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
            />
            Otomatik yenile (8sn)
          </label>
        </div>
      </header>

      {err && (
        <div className="mb-4 rounded-md border border-[#5a1f22] bg-[#2a1215] px-3 py-2 text-sm">
          {err}
        </div>
      )}

      {/* Ticker alanı */}
      <section className="rounded-xl border border-white/10 bg-[#0a0a0f] mb-8 overflow-hidden">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#0a0a0f] via-transparent to-[#0a0a0f] [mask-image:linear-gradient(to_right,black,transparent,black)]" />
          <div className="whitespace-nowrap py-3 px-4 text-[#00ff88] text-sm flex items-center gap-8 animate-marquee hover:[animation-play-state:paused]">
            {(items.length ? items : ['(Veri yok)']).map((t, i) => (
              <span key={i}>• {t}</span>
            ))}
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-2 text-xs text-white/50">
          Son güncelleme: {ts ? new Date(ts).toLocaleTimeString('tr-TR') : '—'}
        </div>
      </section>

      {/* Ham JSON örneği */}
      <section className="rounded-xl border border-white/10 bg-[#0f1117] p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Ham JSON (örnek kayıt)</h2>
          <span className="text-xs text-white/50">
            Kaynak: <code>{BASE}/livescores/sample</code>
          </span>
        </div>
        <pre className="text-xs overflow-auto rounded-md border border-white/10 bg-[#0a0a0f] p-3">
{JSON.stringify(sample ?? { info: 'Örnek kayıt bulunamadı' }, null, 2)}
        </pre>
        <p className="mt-2 text-xs text-white/60">
          Not: Buradaki alanlara göre normalize/format kurallarını netleştirip tablo/karte çeviririz.
        </p>
      </section>
    </main>
  )
}
