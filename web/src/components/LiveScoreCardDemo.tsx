// web/src/components/LiveScoreCardDemo.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type Team = { name: string; logo?: string | null; xg?: number | null };
type League = { name?: string | null; logo?: string | null }; // demo: logo yoksa ad yazılsın
type Score = { home?: number | null; away?: number | null };
type Odds  = { H?: number | null; D?: number | null; A?: number | null; bookmaker?: string | null; bookmakerLogo?: string | null };
type Prob  = { H?: number | null; D?: number | null; A?: number | null };

export type LiveScoreCardDemoProps = {
  league: League;
  home: Team;
  away: Team;
  score: Score;
  time: string | number;          // başlangıç dakikası (demo: her dakika artar)
  odds?: Odds;                    // 1X2
  prob?: Prob;                    // yüzdeler (H/D/A)
};

// helpers
const fmtOdds = (v?: number | null) => (typeof v === 'number' ? v.toFixed(2) : '—');
const fmtPct  = (v?: number | null) => (typeof v === 'number' ? `${Math.round(v)}%` : '—');
const clamp   = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

function NeonBar({ value }: { value?: number | null }) {
  const pct = typeof value === 'number' ? clamp(value, 0, 100) : 0;
  return (
    <div className="h-1.5 rounded-full bg-[#0b1220] overflow-hidden border border-[#133a63]">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#00d4ff,#60a5fa)' }} />
    </div>
  );
}

function LiveMinute({ initial }: { initial: string | number }) {
  const start = useMemo(() => {
    const n = typeof initial === 'number' ? initial : parseInt(String(initial).replace(/[^0-9]/g, '') || '0', 10);
    return Number.isFinite(n) ? n : 0;
  }, [initial]);
  const [m, setM] = useState(start);
  useEffect(() => {
    const id = setInterval(() => setM((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#00d4ff] shadow-[0_0_6px_#00d4ff] animate-pulse" />
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
    <article className="rounded-xl overflow-hidden bg-[#0a1326] border border-[#123a63] shadow-[0_8px_28px_rgba(0,0,0,.35)]">
      {/* Üst: Lig logo YOKSA ad yazılsın + dinamik dakika */}
      <header className="flex items-center gap-3 px-3 py-2 border-b border-[#123a63] bg-[#081126]">
        {league.logo ? (
          <img src={league.logo} alt="" className="h-5 w-5 rounded-sm object-contain" />
        ) : (
          <span className="text-[12px] font-semibold text-white/80 truncate">{league.name || 'League'}</span>
        )}
        <div className="ml-auto"><LiveMinute initial={time} /></div>
      </header>

      {/* Orta: daha küçük kart – logolar büyütülmüş, isimler küçük altta */}
      <div className="px-3 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Home */}
          <div className="flex flex-col items-center">
            {home.logo
              ? <img src={home.logo} alt="" className="h-14 w-14 rounded-full object-contain border border-[#123a63] bg-[#0c1733]" />
              : <span className="h-14 w-14 rounded-full bg-white/10 inline-block" />}
            <div className="mt-1 text-[10px] text-white/70 truncate max-w-[96px]">{home.name || 'Home'}</div>
          </div>

          {/* Skor – daha uyumlu chip */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center rounded-lg bg-[#0c1733] border border-[#123a63] px-3 py-1.5">
              <span className="text-xl font-extrabold text-white tabular-nums">{hScore}</span>
              <span className="mx-2 text-white/50">:</span>
              <span className="text-xl font-extrabold text-white tabular-nums">{aScore}</span>
            </div>
          </div>

          {/* Away */}
          <div className="flex flex-col items-center">
            {away.logo
              ? <img src={away.logo} alt="" className="h-14 w-14 rounded-full object-contain border border-[#123a63] bg-[#0c1733]" />
              : <span className="h-14 w-14 rounded-full bg-white/10 inline-block" />}
            <div className="mt-1 text-[10px] text-white/70 truncate max-w-[96px]">{away.name || 'Away'}</div>
          </div>
        </div>
      </div>

      {/* Alt: Odds (küçük buton stilinde), xG, Probability */}
      <div className="px-3 pt-2 pb-3 border-t border-[#123a63] bg-[#0b152d]">
        {/* Odds (1X2) – sağda RadissonBet logosu */}
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-[#8bb7ff]">Odds (1X2)</div>
          {odds?.bookmakerLogo ? (
            <img src={odds.bookmakerLogo} alt="bookmaker" className="h-4 object-contain opacity-90" />
          ) : (
            <span className="text-[11px] text-white/60">{odds?.bookmaker || ''}</span>
          )}
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-[13px]">
          {[
            { k: 'H', label: 'Home', v: odds?.H },
            { k: 'D', label: 'Draw', v: odds?.D },
            { k: 'A', label: 'Away', v: odds?.A },
          ].map((o) => (
            <div key={o.k} className="rounded-md border border-[#123a63] bg-[#0c1733] px-2 py-1 text-center">
              <div className="text-[10px] text-[#8bb7ff]">{o.label}</div>
              <div className="font-bold text-[#00d4ff]">{fmtOdds(o.v)}</div>
            </div>
          ))}
        </div>

        {/* xG – odds altında */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-[#0c1733] border border-[#123a63] p-2">
            <div className="text-[10px] uppercase tracking-wide text-[#8bb7ff]">xG (Ev)</div>
            <div className="text-lg font-extrabold text-[#00d4ff] drop-shadow-[0_0_8px_rgba(0,212,255,.5)]">
              {typeof home.xg === 'number' ? home.xg.toFixed(2) : '—'}
            </div>
          </div>
          <div className="rounded-lg bg-[#0c1733] border border-[#123a63] p-2 text-right">
            <div className="text-[10px] uppercase tracking-wide text-[#8bb7ff]">xG (Dep)</div>
            <div className="text-lg font-extrabold text-[#00d4ff] drop-shadow-[0_0_8px_rgba(0,212,255,.5)]">
              {typeof away.xg === 'number' ? away.xg.toFixed(2) : '—'}
            </div>
          </div>
        </div>

        {/* Probability – ince bar + yüzde */}
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
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
      </div>
    </article>
  );
}
