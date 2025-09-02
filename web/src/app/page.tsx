// web/src/app/page.tsx
import Link from 'next/link'
import TournamentCard from '@/components/TournamentCard'
import LiveTicker from '@/components/LiveTicker'
import Countdown from '@/components/Countdown'
import NeonCounter from '@/components/NeonCounter'

export const dynamic = 'force-dynamic'

type UITheme = { label: string; badgeColor: string; ribbonBg: string; ctaBg: string }
type Tournament = {
  id: number
  title: string
  subtitle?: string | null
  short_desc?: string | null
  status?: 'published' | 'draft'
  category?: string | null
  image_url?: string | null
  banner_url?: string | null
  cta_url?: string | null
  start_at?: string | null
  end_at?: string | null
  ui?: UITheme
  prize_pool?: number | null
  participant_count?: number | null
  rank_visible?: boolean | null
}

async function fetchTournaments(limit = 8): Promise<Tournament[]> {
  const BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/+$/, '')
  const PREFIX = (process.env.NEXT_PUBLIC_CONTENT_PREFIX || '').replace(/\/+$/, '')
  if (!BASE) return []
  const urls = [
    `${BASE}${PREFIX}/content/tournaments?status=published&limit=${limit}`,
    `${BASE}${PREFIX}/content/tournaments?limit=${limit}`,
  ]
  for (const u of urls) {
    try {
      const r = await fetch(u, { cache: 'no-store', headers: { 'Content-Type': 'application/json' } })
      if (r.ok) return (await r.json()) as Tournament[]
    } catch {}
  }
  return []
}

export default async function HomePage() {
  const tournaments = await fetchTournaments(8)
  const BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/+$/, '')
  const megaJackpot =
    tournaments.reduce((acc, t) => acc + (typeof t.prize_pool === 'number' ? t.prize_pool : 0), 0) || 2_500_000

  return (
    <>
      {/* CONTAINER (max 1440px), 12-col grid, 20px gap */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* HERO */}
        <section className="mt-8 md:mt-10 relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e]">
          <div className="neon-particles" />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-6 md:p-8">
            {/* Sol Panel */}
            <div className="md:col-span-7 flex flex-col justify-center">
              <h1 className="text-[36px] md:text-[52px] font-extrabold leading-tight">
                <span className="text-[#00d4ff] drop-shadow-[0_0_12px_rgba(0,212,255,0.6)]">⚡ TURNUVALARDA</span>
                <br />
                ZAFERİN GÜCÜNÜ HİSSET
              </h1>

              <div className="mt-5 flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#00ff88]/40 bg-[#0f1117]/60 px-3 py-1.5 text-sm">
                  <span className="live-dot" /> <b>CANLI</b> • 2,847 aktif oyuncu
                </span>
                <Link
                  href="/tournaments"
                  className="px-4 py-2 rounded-md font-semibold text-black bg-gradient-to-r from-[#00d4ff] to-[#00ff88] shadow-[0_0_20px_rgba(0,212,255,.35)] hover:opacity-90 transition"
                >
                  KATIL
                </Link>
              </div>
            </div>

            {/* Sağ Panel: Mega Jackpot */}
            <div className="md:col-span-5 flex items-center justify-center">
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1117]/70 p-5 text-center shadow-[0_0_30px_rgba(0,212,255,.25)]">
                <div className="text-sm text-white/60 mb-1">💎 Mega Jackpot</div>
                <NeonCounter value={megaJackpot} />
                <div className="text-xs text-white/50 mt-2">Toplam ödül havuzu (yayındaki turnuvalar)</div>
              </div>
            </div>
          </div>

          {/* Alt Strip */}
          <div className="border-t border-white/10 bg-[#0a0a0f]/60 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <span className="live-dot" /> CANLI AKIŞ AÇIK
            </div>
            <Link href="/wheel" className="text-sm underline text-[#00d4ff] hover:text-[#00ff88]">
              Çarkı Çevir →
            </Link>
          </div>
        </section>

        {/* SECTION SPACING */}
        <div className="h-8 md:h-[60px]" />

        {/* 2) Canlı Skor Bandı */}
        <section className="rounded-xl border border-white/10 bg-[#0a0a0f]">
          <LiveTicker endpoint={`${BASE}/livescores`} />
        </section>

        <div className="h-8 md:h-[60px]" />

        {/* 3) Triple Action Zone */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* 3a ÇARK */}
          <div className="md:col-span-4 rounded-2xl border border-white/10 bg-[#0f1117] p-5 relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-gradient-to-br from-[#ff0080] to-[#00d4ff] opacity-20 blur-2xl" />
            <div className="text-sm font-bold text-[#ff0033] mb-2">ŞANSLI ÇARK</div>
            <div className="aspect-square mx-auto my-3 relative grid place-items-center">
              <div className="w-48 h-48 rounded-full border border-white/10 bg-[#151824] shadow-[0_0_30px_rgba(255,0,128,.25)] rotate-slow" />
              <div className="absolute w-28 h-28 rounded-full border border-white/10 bg-[#0f1117]" />
              <Link
                href="/wheel"
                className="absolute px-4 py-2 rounded-md font-bold text-black bg-gradient-to-r from-[#ff0080] to-[#ff4da0] shadow-[0_0_20px_rgba(255,0,128,.45)] hover:opacity-90 transition"
              >
                ÇEVİR
              </Link>
            </div>
            <div className="text-xs text-white/60 text-center">Kalan hak: <b>X</b></div>
          </div>

          {/* 3b FLASH TURNOVA */}
          <div className="md:col-span-4 rounded-2xl border border-white/10 bg-[#0f1117] p-5">
            <div className="text-sm font-bold text-[#ff0033] mb-2">⚡ FLASH TURNUVA</div>
            <div className="text-[36px] font-extrabold text-[#FBBF24] drop-shadow-[0_0_12px_rgba(251,191,36,.35)]">
              ₺50.000
            </div>
            <div className="mt-2 text-3xl font-mono">
              <Countdown endAt={new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()} />
            </div>
            <Link
              href="/tournaments"
              className="mt-4 inline-block px-4 py-2 rounded-md font-semibold text-black bg-gradient-to-r from-[#ff0033] to-[#ff4d6d] shadow-[0_0_20px_rgba(255,0,51,.4)] hover:opacity-90 transition"
            >
              HEMEN KATIL
            </Link>
          </div>

          {/* 3c HOT MATCH */}
          <div className="md:col-span-4 rounded-2xl border border-white/10 bg-[#0f1117] p-5">
            <div className="inline-flex items-center gap-2 text-xs font-bold px-2 py-1 rounded-full border border-white/20">
              🔥 EN POPÜLER
            </div>
            <div className="mt-3 text-lg font-semibold">CS:GO Championship</div>
            <div className="text-sm text-white/70">247 katılımcı • ₺25.000 ödül</div>
            <div className="mt-4">
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff]" />
              </div>
              <div className="mt-1 text-xs text-white/60">Katılım oranı: %75</div>
            </div>
          </div>
        </section>

        <div className="h-8 md:h-[60px]" />

        {/* 4) Canlı Skor Detay (details/summary ile genişleyebilir) */}
        <section className="rounded-2xl border border-white/10 bg-[#0f1117] p-5">
          <details>
            <summary className="cursor-pointer select-none text-sm text-white/80 hover:text-white">
              Canlı Skor Detayı (genişlet)
            </summary>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-[#0a0a0f] p-4">
                  <div className="text-xs text-white/60">League {i + 1}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <div>Team A</div>
                    <div className="text-white/70">2 - 1</div>
                    <div>Team B</div>
                  </div>
                  <div className="mt-2 text-xs text-white/50">85’ • Live</div>
                </div>
              ))}
            </div>
          </details>
        </section>

        <div className="h-8 md:h-[60px]" />

        {/* 5) Trending Tournaments + 6) Sidebar */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main grid (9/12) */}
          <div className="lg:col-span-9">
            <h2 className="text-lg font-semibold mb-3">Trending Gaming Tournaments</h2>
            {tournaments.length === 0 ? (
              <div className="text-white/60 text-sm">Şu an listelenecek turnuva yok.</div>
            ) : (
              <div className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
                {tournaments.map((t) => (
                  <TournamentCard key={t.id} item={t} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar (3/12) */}
          <aside className="lg:col-span-3 lg:sticky lg:top-6 h-fit">
            <div className="rounded-2xl border border-white/10 bg-[#0f1117] p-5">
              <h3 className="text-sm font-bold mb-3">Günlük Görevler</h3>
              <div className="flex items-center gap-3">
                {['%45', '%70', '%90'].map((t, i) => (
                  <div key={i} className="w-16 h-16 rounded-full grid place-items-center border border-white/10 bg-[#0a0a0f] shadow-[0_0_20px_rgba(0,255,136,.2)]">
                    <span className="text-xs">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-[#0f1117] p-5">
              <h3 className="text-sm font-bold mb-3">Top Winners</h3>
              <div className="marquee hover:paused text-sm text-white/80">
                <span className="mr-6">👑 @eray • ₺12.500</span>
                <span className="mr-6">👑 @selin • ₺9.200</span>
                <span className="mr-6">👑 @yasin • ₺7.100</span>
                <span className="mr-6">👑 @arda • ₺5.800</span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-[#0f1117] p-5">
              <h3 className="text-sm font-bold">Anlık İstatistik</h3>
              <div className="text-xs text-white/60 mt-1">Bu saatte 3 turnuva başladı</div>
            </div>
          </aside>
        </section>

        <div className="h-10 md:h-[60px]" />
      </div>
    </>
  )
}
