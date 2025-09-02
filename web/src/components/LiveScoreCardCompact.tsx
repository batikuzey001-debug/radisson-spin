// web/src/components/LiveScoreCardCompact.tsx
'use client';

type Team = { name: string; logo?: string | null; xg?: number | null }
type League = { name?: string | null; logo?: string | null }
type Odds = { H?: number | null; D?: number | null; A?: number | null; bookmakerLogo?: string | null }
type Prob = { H?: number | null; D?: number | null; A?: number | null }

export type CompactProps = {
  id: number
  league: League
  home: Team
  away: Team
  score: { home?: number | null; away?: number | null }
  time: number
  odds?: Odds
  prob?: Prob
  onClick?: (id: number) => void
}

const fmtOdds = (v?: number | null) => (typeof v === 'number' ? v.toFixed(2) : '—')
const fmtPct = (v?: number | null) => (typeof v === 'number' ? `${Math.round(v)}%` : '—')

function TeamLogo({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  const initials = (name || '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '—'
  const s = `${size}px`
  if (!src) {
    return (
      <div
        className="grid place-items-center rounded-full bg-white/10 border border-white/20 text-[10px] text-white/80"
        style={{ width: s, height: s }}
      >
        {initials}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className="rounded-full object-contain border border-white/10 bg-[#0c1733]"
      style={{ width: s, height: s }}
      onError={(e) => {
        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
      }}
    />
  )
}

export default function LiveScoreCardCompact({
  id,
  league,
  home,
  away,
  score,
  time,
  odds,
  prob,
  onClick,
}: CompactProps) {
  const h = score.home ?? 0
  const a = score.away ?? 0

  return (
    <button
      onClick={() => onClick?.(id)}
      className="w-full text-left rounded-lg border border-[#123a63] bg-[#0a1326] hover:bg-[#0c1733] transition shadow-[0_4px_18px_rgba(0,0,0,.25)]"
    >
      {/* Üst satır: lig logo varsa logo, yoksa lig adı + dakika rozet */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10">
        {league.logo ? (
          <img src={league.logo} alt="" className="h-4 w-4 rounded-sm object-contain" />
        ) : (
          <span className="text-[11px] text-white/70 truncate">{league.name || 'League'}</span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[#8bb7ff]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00d4ff] animate-pulse shadow-[0_0_6px_#00d4ff]" />
          {time}'
        </span>
      </div>

      {/* Orta satır: logolar küçük, isimler küçük; skor chip */}
      <div className="px-3 py-2">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <TeamLogo name={home.name} src={home.logo} size={36} />
            <div className="truncate text-[11px] text-white/80">{home.name}</div>
          </div>
          <div className="inline-flex items-center justify-center rounded-md bg-[#0c1733] border border-[#123a63] px-2 py-1">
            <span className="text-sm font-bold text-white tabular-nums">{h}</span>
            <span className="mx-1 text-white/50">:</span>
            <span className="text-sm font-bold text-white tabular-nums">{a}</span>
          </div>
          <div className="flex items-center gap-2 justify-end min-w-0">
            <div className="truncate text-[11px] text-white/80 text-right">{away.name}</div>
            <TeamLogo name={away.name} src={away.logo} size={36} />
          </div>
        </div>

        {/* Odds pill'leri daha küçük */}
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-[12px]">
          <div className="text-center rounded border border-[#123a63] bg-[#0c1733] px-1.5 py-0.5">
            <div className="text-[10px] text-[#8bb7ff]">H</div>
            <div className="font-semibold text-[#00d4ff]">{fmtOdds(odds?.H)}</div>
          </div>
          <div className="text-center rounded border border-[#123a63] bg-[#0c1733] px-1.5 py-0.5">
            <div className="text-[10px] text-[#8bb7ff]">D</div>
            <div className="font-semibold text-[#00d4ff]">{fmtOdds(odds?.D)}</div>
          </div>
          <div className="text-center rounded border border-[#123a63] bg-[#0c1733] px-1.5 py-0.5">
            <div className="text-[10px] text-[#8bb7ff]">A</div>
            <div className="font-semibold text-[#00d4ff]">{fmtOdds(odds?.A)}</div>
          </div>
        </div>

        {/* xG tek satır */}
        <div className="mt-1 flex items-center justify-between text-[11px] text-white/70">
          <div>xG (Ev): <span className="text-white font-semibold">{typeof home.xg === 'number' ? home.xg.toFixed(2) : '—'}</span></div>
          <div className="text-right">xG (Dep): <span className="text-white font-semibold">{typeof away.xg === 'number' ? away.xg.toFixed(2) : '—'}</span></div>
        </div>

        {/* Prob tek satır yüzdeler */}
        <div className="mt-1 grid grid-cols-3 gap-1.5 text-[11px] text-center text-white/80">
          <div>H % <span className="text-white font-semibold">{fmtPct(prob?.H)}</span></div>
          <div>B % <span className="text-white font-semibold">{fmtPct(prob?.D)}</span></div>
          <div>A % <span className="text-white font-semibold">{fmtPct(prob?.A)}</span></div>
        </div>
      </div>

      {/* Bookmaker logo alt şerit */}
      <div className="px-3 py-1.5 border-t border-white/10 bg-[#0a0f22] flex items-center justify-end">
        {odds?.bookmakerLogo && <img src={odds.bookmakerLogo} alt="radissonbet" className="h-3.5 opacity-90" />}
      </div>
    </button>
  )
}
