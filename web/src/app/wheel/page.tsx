// web/src/app/wheel/page.tsx
'use client'

import { useEffect, useState } from 'react'

type Prize = { id: number; label: string }
type RedeemResponse = { status: string; prize?: string }

const BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/+$/, '')
const SPIN = (process.env.NEXT_PUBLIC_SPIN_PREFIX || '/api').replace(/\/+$/, '')

/* Neden: Farklı backend yolları olasılığına karşı birkaç yolu deneyip ilk başarılı sonucu döner. */
async function fetchPrizesSmart(): Promise<{ data: Prize[]; usedUrl?: string; err?: string }> {
  if (!BASE) return { data: [], err: 'NEXT_PUBLIC_API_BASE tanımlı değil.' }

  const candidates = [
    `${BASE}${SPIN}/spin/prizes`, // beklenen (main.py: app.include_router(spin_router, prefix="/api"))
    `${BASE}${SPIN}/prizes`,
    `${BASE}/api/spin/prizes`,
  ]

  for (const url of candidates) {
    try {
      const r = await fetch(url, { cache: 'no-store' })
      if (!r.ok) continue
      const json = (await r.json()) as Prize[]
      if (Array.isArray(json)) return { data: json, usedUrl: url }
    } catch {
      /* sessiz geç */
    }
  }
  return { data: [], err: 'Prizes endpoint bulunamadı veya CORS engeli.' }
}

export default function WheelPage() {
  const [username, setUsername] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [prize, setPrize] = useState<string | null>(null)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [error, setError] = useState<string | null>(null)
  const [prizesUrl, setPrizesUrl] = useState<string | undefined>(undefined)

  // Ödülleri preload (UI bilgilendirici)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data, usedUrl, err } = await fetchPrizesSmart()
      if (!mounted) return
      if (data.length) {
        setPrizes(data)
        setPrizesUrl(usedUrl)
      } else if (err) {
        setError((e) => e || err) // mevcut hata yoksa göster
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setPrize(null)
    setError(null)

    const u = username.trim()
    const c = code.trim()
    if (!u || !c) {
      setError('Kullanıcı adı ve kod zorunludur.')
      return
    }
    if (!BASE) {
      setError('API adresi tanımlı değil (NEXT_PUBLIC_API_BASE).')
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`${BASE}${SPIN}/spin/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Backend yalnızca 'code' kullanıyor olabilir; username gönderimi geriye dönük uyumludur.
        body: JSON.stringify({ code: c, username: u }),
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || 'İşlem başarısız.')
      }
      const data = (await res.json()) as RedeemResponse
      if (data.prize) setPrize(data.prize)
      setMsg(data.status || 'Tamamlandı.')
    } catch (err: any) {
      setError(err?.message || 'Bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <section className="relative rounded-2xl border border-[#1b1d26] bg-[#111114] p-6">
        <div className="absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(ellipse_at_top,_rgba(255,0,51,0.18),_transparent_55%)]" />
        <h1 className="text-2xl font-extrabold mb-2">
          <span className="text-neon">Çark</span> • Kodu Kullan
        </h1>
        <p className="text-white/70 text-sm mb-4">
          Kullanıcı adını ve kodunu gir, çarkı çevir ve ödülünü hemen öğren.
        </p>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              className="rounded-md border border-white/10 bg-[#0b0d13] px-3 py-2 outline-none focus:border-neon"
              placeholder="Kullanıcı adı"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
            <input
              className="rounded-md border border-white/10 bg-[#0b0d13] px-3 py-2 outline-none focus:border-neon"
              placeholder="Kod (örn: ABC123)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !code.trim() || !username.trim() || !BASE}
            className="px-4 py-2 rounded-md bg-gradient-to-r from-neon to-neon2 text-black font-semibold hover:opacity-90 disabled:opacity-50 transition"
            title={!BASE ? 'API adresi tanımlı değil' : 'Gönder'}
          >
            {loading ? 'İşleniyor…' : 'Gönder'}
          </button>
        </form>

        {(msg || prize || error) && (
          <div className="mt-4 space-y-2">
            {msg && <div className="rounded-md border border-white/10 bg-[#151824] px-3 py-2 text-sm">{msg}</div>}
            {prize && (
              <div className="rounded-md border border-[#38131c] bg-[#1a0f14] px-3 py-2 text-sm">
                🎉 <span className="font-bold text-neon">Ödül:</span> {prize}
              </div>
            )}
            {error && (
              <div className="rounded-md border border-[#5a1f22] bg-[#2a1215] px-3 py-2 text-sm">{error}</div>
            )}
          </div>
        )}
      </section>

      {/* Ödüller önizleme */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Olası Ödüller</h2>
          {prizesUrl && (
            <span className="text-[10px] text-white/40">kaynak: {prizesUrl.replace(BASE, '')}</span>
          )}
        </div>

        {prizes.length === 0 ? (
          <div className="text-white/60 text-sm">
            Ödül listesi şu an görüntülenemiyor.
            <span className="block mt-1 text-white/40">
              Lütfen backend CORS ayarına web domaininizi ekleyin ve <code>{SPIN}/spin/prizes</code> yolunu doğrulayın.
            </span>
          </div>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {prizes.map((p) => (
              <li key={p.id} className="rounded-full border border-white/10 bg-[#14161d] px-3 py-1 text-sm">
                {p.label}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!BASE && (
        <p className="mt-8 text-xs text-white/50">
          Uyarı: <code>NEXT_PUBLIC_API_BASE</code> ayarlı değil. Railway → Variables üzerinden API adresini ekleyin.
        </p>
      )}
    </main>
  )
}
