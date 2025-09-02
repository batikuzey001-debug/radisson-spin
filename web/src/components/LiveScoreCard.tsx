// web/src/components/LiveScoreCard.tsx
'use client';

type Team = { name: string; logo?: string | null; xg?: number | null };
type League = { name: string; logo?: string | null };
type Score = { home?: number | null; away?: number | null };
type Odds = { H?: number | null; D?: number | null; A?: number | null; bookmaker?: string | null };
type Prob = { H?: number | null; D?: number | null; A?: number | null };

export type LiveScoreCardProps = {
  league: League;
  home: Team;
  away: Team;
  score: Score;
  time: string;
  odds?: Odds;
  prob?: Prob;
};

function fmtOdds(v?: number | null) {
  return typeof v === 'number' ? v.toFixed(2) : '—';
}
function fmtPct(v?: number | null) {
  return typeof v === 'number' ? `${Math.round(v)}%` : '—';
}

export default function LiveScoreCard({
  league, home, away, score, time, odds, prob,
}: LiveScoreCardProps) {
  const hScore = score.home ?? 0;
  const aScore = score.away ?? 0;

  return (
    <article className="rounded-2xl border border-[#242633] bg-[#0f1117] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,.35)]">
      <header className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-[#0a0a0f]">
        {league.logo ? <img src={league.logo} alt="" className="h-5 w-5 rounded-sm object-contain" /> : <span className="h-5 w-5 rounded-sm bg-white/10 inline-block" />}
        <div className="text-sm font-semibold">{league.name || '—'}</div>
        <div className="ml-auto text-xs text-white/60">{time || '—'}</div>
      </header>

      <div className="px-4 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {home.logo ? <img src={home.logo} alt="" className="h-7 w-7 rounded-full object-contain" /> : <span className="h-7 w-7 rounded-full bg-white/10 inline-block" />}
            <div className="truncate text-sm font-semibold">{home.name || 'Home'}</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-extrabold">
              <span className="text-white">{hScore}</span>
              <span className="text-white/50 mx-2">-</span>
              <span className="text-white">{aScore}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end min-w-0">
            <div className="truncate text-sm font-semibold text-right">{away.name || 'Away'}</div>
            {away.logo ? <img src={away.logo} alt="" className="h-7 w-7 rounded-full object-contain" /> : <span className="h-7 w-7 rounded-full bg-white/10 inline-block" />}
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-white/10 bg-[#0b0d13]">
        <div className="flex items-center justify-between text-xs text-white/70">
          <div className="font-semibold text-white">Odds (1X2)</div>
          <div className="text-white/60">{odds?.bookmaker || '—'}</div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-md border border-white/10 bg-[#14161d] px-2 py-1 text-center">
            <div className="text-[10px] text-white/60">Home</div>
            <div className="font-bold">{fmtOdds(odds?.H)}</div>
          </div>
          <div className="rounded-md border border-white/10 bg-[#14161d] px-2 py-1 text-center">
            <div className="text-[10px] text-white/60">Draw</div>
            <div className="font-bold">{fmtOdds(odds?.D)}</div>
          </div>
          <div className="rounded-md border border-white/10 bg-[#14161d] px-2 py-1 text-center">
            <div className="text-[10px] text-white/60">Away</div>
            <div className="font-bold">{fmtOdds(odds?.A)}</div>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="text-white/70">xG (Ev): <span className="font-semibold text-white">{home.xg ?? '—'}</span></div>
          <div className="text-right text-white/70">xG (Dep): <span className="font-semibold text-white">{away.xg ?? '—'}</span></div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md border border-white/10 bg-[#10121a] px-2 py-1 text-center">
            <div className="text-[10px] text-white/60">Home %</div>
            <div className="font-semibold">{fmtPct(prob?.H)}</div>
          </div>
          <div className="rounded-md border border-white/10 bg-[#10121a] px-2 py-1 text-center">
            <div className="text-[10px] text-white/60">Draw %</div>
            <div className="font-semibold">{fmtPct(prob?.D)}</div>
          </div>
          <div className="rounded-md border border-white/10 bg-[#10121a] px-2 py-1 text-center">
            <div className="text-[10px] text-white/60">Away %</div>
            <div className="font-semibold">{fmtPct(prob?.A)}</div>
          </div>
        </div>

        <div className="mt-3 h-[2px] w-full rounded-full bg-gradient-to-r from-[#00d4ff] via-[#ff0080] to-[#00ff88]" />
      </div>
    </article>
  )
}
