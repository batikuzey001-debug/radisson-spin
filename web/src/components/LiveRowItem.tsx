// web/src/components/LiveRowItem.tsx
'use client';

type Team = { name: string; logo?: string | null; xg?: number | null }
type League = { name?: string | null; logo?: string | null }
type Odds  = { H?: number | null; D?: number | null; A?: number | null }
type Prob  = { H?: number | null; D?: number | null; A?: number | null }

export type LiveRowItemProps = {
  id: number
  league: League
  home: Team
  away: Team
  score: { home?: number | null; away?: number | null }
  time: number | string
  odds?: Odds
  prob?: Prob
  onClick?: (id: number) => void
}

const fmt = (v?: number | null, d = '—') => (typeof v === 'number' ? v.toFixed(2) : d)
const pct = (v?: number | null) => (typeof v === 'number' ? `${Math.round(v)}%` : '—')

function TeamLogo({ name, src }: { name: string; src?: string | null }) {
  const initials =
    (name || '')
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '—'
  return src ? (
    <img src={src} alt="" className="h-5 w-5 rounded-sm object-contain" />
  ) : (
    <div className="h-5 w-5 grid place-items-center rounded-sm bg-white/10 text-[10px] text-white/70">
      {initials}
    </div>
  )
}

export default function LiveRowItem({
  id, league, home, away, score, time, odds, prob, onClick,
}: LiveRowItemProps) {
  const hs = score.home ?? 0
  const as_ = score.away ?? 0

  return (
    <button
      onClick={() => onClick?.(id)}
      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-[#0b0f1a] hover:bg-[#0d1220] transition"
    >
      <div className="grid grid-cols-[20px_1fr_auto_1fr_auto] items-center gap-2">
        {/* Lig */}
        <div className="flex items-center justify-center">
          {league.logo ? (
            <img src={league.logo} alt="" className="h-4 w-4 object-contain opacity-90" />
          ) : (
            <span className="text-[10px] text-white/60">•</span>
          )}
        </div>

        {/* Home */}
        <div className="flex items-center gap-2 min-w-0">
          <TeamLogo name={home.name} src={home.logo} />
          <div className="truncate text-[13px] text-white/90">{home.name}</div>
        </div>

        {/* Skor + dakika */}
        <div className="px-2">
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded bg-[#0e1630] border border-[#163968] px-2 py-0.5 text-[13px] font-bold tabular-nums">
              {hs} <span className="mx-1 text-white/50">:</span> {as_}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-[#8bb7ff]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00d4ff] animate-pulse shadow-[0_0_6px_#00d4ff]" />
              {typeof time === 'number' ? `${time}'` : time}
            </span>
          </div>
        </div>

        {/* Away */}
        <div className="flex items-center gap-2 justify-end min-w-0">
          <div className="truncate text-[13px] text-white/90 text-right">{away.name}</div>
          <TeamLogo name={away.name} src={away.logo} />
        </div>

        {/* Sağ blok: oranlar / xG / kazanma %  (alt alta, dar) */}
        <div className="ml-2 text-right">
          <div className="text-[11px] text-white/70 leading-4">
            <div>H/D/A: <span className="text-[#00d4ff] font-semibold">{fmt(odds?.H)}/{fmt(odds?.D)}/{fmt(odds?.A)}</span></div>
            <div>xG: <span className="text-white font-semibold">{fmt(home.xg, '—')} / {fmt(away.xg, '—')}</span></div>
            <div>Kazanma: <span className="text-white font-semibold">{pct(prob?.H)} / {pct(prob?.D)} / {pct(prob?.A)}</span></div>
          </div>
        </div>
      </div>
    </button>
  )
}
