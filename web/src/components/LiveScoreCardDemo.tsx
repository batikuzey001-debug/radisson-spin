// web/src/components/LiveScoreCardDemo.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type Team = { name: string; logo?: string | null; xg?: number | null };
type League = { logo?: string | null }; // lig adı YOK
type Score = { home?: number | null; away?: number | null };
type Odds  = { H?: number | null; D?: number | null; A?: number | null; bookmaker?: string | null };
type Prob  = { H?: number | null; D?: number | null; A?: number | null };

export type LiveScoreCardDemoProps = {
  league: League;
  home: Team;
  away: Team;
  score: Score;
  /** Başlangıç dakikası (örn: 67 veya "67'") – DEMO için her dakikada artar */
  time: string | number;
  odds?: Odds;
  prob?: Prob;
};

const fmtOdds = (v?: number | null) => (typeof v === 'number' ? v.toFixed(2) : '—');
const fmtPct  = (v?: number | null) => (typeof v === 'number' ? `${Math.round(v)}%` : '—');
const clamp   = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

function NeonBar({ value }: { value?: number | null }) {
  const pct = typeof value === 'number' ? clamp(value, 0, 100) : 0;
  return (
    <div className="h-2 rounded-full bg-[#0b1220] overflow-hidden border border-[#133a63]">
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#00d4ff,#60a5fa)' }}
      />
    </div>
  );
}

function LiveMinute({ initial }: { initial: string | number }) {
  const start = useMemo(() => {
    const n = typeof initial === 'number'
      ? initial
      : parseInt(String(initial).replace(/[^0-9]/g, '') || '0', 10);
    return isFinite(n) ? n : 0;
  }, [initial]);

  const [m, setM] = useState(start);
  useEffect(() => {
    const id = setInterval(() => setM((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="inline-block h-2 w-2 rounded-full bg-[#00d4ff] shadow-[0_0_8px_#00d4ff] animate-pulse" />
      <span className="text-[#8bb7ff]">{m}'</span>
    </div>
  );
}

export default function LiveScoreCardDemo({
  league, home, away, score, time, odds, prob,
}: LiveScoreCardDemoProps) {
  const hScore = score.home ?? 0;
  const aScore = score.away ?? 0;

  return (
    <article className="rounded-2xl overflow-hidden bg-[#0a1326] border border-[#123a63] shadow-[0_10px_40px_rgba(0,0,0,.35)]">
      {/* Üst Bar: Sadece Lig LOGOSU + Dinamik dakika */}
      <header className="flex items-center gap-3 px-4 py-2 border-b border-[#123a63] bg-[#081126]">
        {league.logo
          ? <img src={league.logo} alt="" className="h-6 w-6 rounded-sm object-contain" />
          : <span className="h-6 w-6 rounded-sm bg-white/10 inline-block" />}
        <div className="ml-auto"><LiveMinute initial={time} /></div>
      </header>

      {/* Orta: Logolar büyük, isimler küçük altta */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Home */}
          <div className="flex flex-col items-center">
            {home.logo
              ? <img src={home.logo} alt="" className="h-14 w-14 rounded-full object-contain border border-[#123a63] bg-[#0c1733]" />
              : <span className="h-14 w-14 rounded-full bg-white/10 inline-block" />}
            <div className="mt-1 text-[11px] text-white/70 truncate max-w-[120px]">{home.name || 'Home'}</div>
          </div>

          {/* Skor */}
          <div className="text-center">
            <div className="text-3xl font-extrabold text-white">
              <span>{hScore}</span>
              <span className="mx-3 text-white/50">-</span>
              <span>{aScore}</span>
            </div>
          </div>

          {/* Away */}
          <div className="flex flex-col items-center">
            {away.logo
              ? <img src={away.logo} alt="" className="h-14 w-14 rounded-full object-contain border border-[#123a63] bg-[#0c1733]" />
              : <span className="h-14 w-14 rounded-full bg-white/10 inline-block" />}
            <div className="mt-1 text-[11px] text-white/70 truncate max-w-[120px]">{away.name || 'Away'}</div>
          </div>
        </div>
      </div>

      {/* Alt: Odds + xG + Probability (vurgulu mavi) */}
      <div className="px-4 pt-3 pb-4 border-t border-[#123a63] bg-[#0b152d]">
        {/* Odds (1X2) */}
        <div className="flex items-center justify-between text-xs text-[#8bb7ff]">
          <div className="font-semibold text-white">Odds (1X2)</div>
          <div>{odds?.bookmaker || '—'}</div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg border border-[#123a63] bg-[#0c1733] px-2 py-1 text-center">
            <div className="text-[10px] text-[#8bb7ff]">Home</div>
            <div className="font-bold text-[#00d4ff]">{fmtOdds(odds?.H)}</div>
          </div>
          <div className="rounded-lg border border-[#123a63] bg-[#0c1733] px-2 py-1 text-center">
            <div className="text-[10px] text-[#8bb7ff]">Draw</div>
            <div className="font-bold text-[#00d4ff]">{fmtOdds(odds?.D)}</div>
          </div>
          <div className="rounded-lg border border-[#123a63] bg-[#0c1733] px-2 py-1 text-center">
            <div className="text-[10px] text-[#8bb7ff]">Away</div>
            <div className="font-bold text-[#00d4ff]">{fmtOdds(odds?.A)}</div>
          </div>
        </div>

        {/* xG satırı (odds altında) */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#0c1733] border border-[#123a63] p-2">
            <div className="text-[10px] uppercase tracking-wide text-[#8bb7ff]">xG (Ev)</div>
            <div className="text-xl font-extrabold text-[#00d4ff] drop-shadow-[0_0_10px_rgba(0,212,255,.5)]">
              {typeof home.xg === 'number' ? home.xg.toFixed(2) : '—'}
            </div>
          </div>
          <div className="rounded-xl bg-[#0c1733] border border-[#123a63] p-2 text-right">
            <div className="text-[10px] uppercase tracking-wide text-[#8bb7ff]">xG (Dep)</div>
            <div className="text-xl font-extrabold text-[#00d4ff] drop-shadow-[0_0_10px_rgba(0,212,255,.5)]">
              {typeof away.xg === 'number' ? away.xg.toFixed(2) : '—'}
            </div>
          </div>
        </div>

        {/* Probability H/D/A barları */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="mb-1 text-[10px] text-[#8bb7ff]">Home %</div>
            <NeonBar value={prob?.H} />
            <div className="mt-1 text-center text-white font-semibold">{fmtPct(prob?.H)}</div>
          </div>
          <div>
            <div className="mb-1 text-[10px] text-[#8bb7ff]">Draw %</div>
            <NeonBar value={prob?.D} />
            <div className="mt-1 text-center text-white font-semibold">{fmtPct(prob?.D)}</div>
          </div>
          <div>
            <div className="mb-1 text-[10px] text-[#8bb7ff]">Away %</div>
            <NeonBar value={prob?.A} />
            <div className="mt-1 text-center text-white font-semibold">{fmtPct(prob?.A)}</div>
          </div>
        </div>

        {/* Alt neon çizgi */}
        <div className="mt-4 h-[2px] w-full rounded-full bg-gradient-to-r from-[#00d4ff] via-[#60a5fa] to-[#00d4ff]" />
      </div>
    </article>
  );
}
