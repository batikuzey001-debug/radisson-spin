// web/src/components/LiveMatchCard.tsx
'use client';

type Team = { name: string; logo?: string | null };
type League = { name?: string | null; logo?: string | null };
type Odds = { H?: number | null; D?: number | null; A?: number | null; bookmaker?: string | null };
type Prob = { H?: number | null; D?: number | null; A?: number | null };

export type ApiItem = {
  fixture_id: number;
  league: League;
  home: Team;
  away: Team;
  score: { home?: number | null; away?: number | null };
  time: string | number;
  odds?: Odds;
  prob?: Prob;
};

const fmtOdds = (v?: number | null) => (typeof v === 'number' ? v.toFixed(2) : '—');
const fmtPct = (v?: number | null) => (typeof v === 'number' ? `${Math.round(v)}%` : '—');
const isKO = (t: string | number) => typeof t === 'string' && /^KO\b/i.test(t);

function TeamBadge({ name, logo, align = 'left' }: { name: string; logo?: string | null; align?: 'left'|'right' }) {
  return (
    <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : ''} min-w-0`}>
      {align === 'right' ? null : (
        logo ? <img src={logo} alt="" className="h-7 w-7 rounded-full object-contain" /> :
        <div className="h-7 w-7 rounded-full bg-white/10" />
      )}
      <div className={`truncate font-medium ${align === 'right' ? 'text-right' : ''}`}>{name}</div>
      {align === 'right' ? (
        logo ? <img src={logo} alt="" className="h-7 w-7 rounded-full object-contain" /> :
        <div className="h-7 w-7 rounded-full bg-white/10" />
      ) : null}
    </div>
  );
}

export default function LiveMatchCard({ item }: { item: ApiItem }) {
  const hs = item.score?.home ?? null;
  const as_ = item.score?.away ?? null;
  const leagueLogo = item.league?.logo;
  const leagueName = item.league?.name || '—';
  const t = item.time;
  const titleTime = typeof t === 'number' ? `${t}'` : t || '—';

  return (
    <article className="rounded-2xl border border-white/10 bg-[#0b0f1a] shadow-[0_8px_28px_rgba(0,0,0,.35)] overflow-hidden">
      {/* Üst başlık: Lig + Zaman */}
      <header className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-[#0a0f22]">
        {leagueLogo ? (
          <img src={leagueLogo} alt="" className="h-5 w-5 object-contain" />
        ) : (
          <span className="text-xs text-white/70">{leagueName}</span>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-white/70">
          {isKO(t) ? <span className="px-2 py-0.5 rounded bg-[#111a34] border border-white/10">Maç Saati: {titleTime.replace(/^KO\s*/i,'')}</span> :
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00d4ff] animate-pulse shadow-[0_0_6px_#00d4ff]" />
            {titleTime}
          </span>}
        </div>
      </header>

      {/* Takımlar + Skor */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamBadge name={item.home?.name || 'Home'} logo={item.home?.logo || undefined} />
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#10162b] border border-white/10 px-3 py-1.5">
              <span className="text-2xl font-extrabold tabular-nums">{hs ?? '–'}</span>
              <span className="text-white/50">:</span>
              <span className="text-2xl font-extrabold tabular-nums">{as_ ?? '–'}</span>
            </div>
          </div>
          <TeamBadge name={item.away?.name || 'Away'} logo={item.away?.logo || undefined} align="right" />
        </div>
      </div>

      {/* Oranlar + Tahminler */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-[#0f162c] border border-white/10 p-2 text-center">
            <div className="text-[10px] text-white/60">Home</div>
            <div className="text-lg font-bold text-[#00d4ff]">{fmtOdds(item.odds?.H)}</div>
            <div className="text-xs text-white/70">{fmtPct(item.prob?.H)}</div>
          </div>
          <div className="rounded-lg bg-[#0f162c] border border-white/10 p-2 text-center">
            <div className="text-[10px] text-white/60">Draw</div>
            <div className="text-lg font-bold text-[#00d4ff]">{fmtOdds(item.odds?.D)}</div>
            <div className="text-xs text-white/70">{fmtPct(item.prob?.D)}</div>
          </div>
          <div className="rounded-lg bg-[#0f162c] border border-white/10 p-2 text-center">
            <div className="text-[10px] text-white/60">Away</div>
            <div className="text-lg font-bold text-[#00d4ff]">{fmtOdds(item.odds?.A)}</div>
            <div className="text-xs text-white/70">{fmtPct(item.prob?.A)}</div>
          </div>
        </div>

        {/* Detaylar */}
        <details className="mt-3">
          <summary className="text-xs text-white/70 cursor-pointer select-none">Detay JSON</summary>
          <pre className="mt-2 max-h-56 overflow-auto rounded border border-white/10 bg-[#090e1c] p-2 text-[11px] text-white/80">
{JSON.stringify(item, null, 2)}
          </pre>
        </details>
      </div>
    </article>
  );
}
