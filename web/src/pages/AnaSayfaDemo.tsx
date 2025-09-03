// web/src/pages/AnaSayfaDemo.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";

/**
 * DEMO • Header + Kayan Canlı Maç Kartları
 * - Sadece DEMO: veriler mock
 * - Header aynı kalır (global)
 * - Header altında yatay kayan maç KARTLARI (takım “logo” avatarı + skor + dakika)
 */

type Match = {
  id: string;
  league: string;
  leagueLogo?: string; // opsiyon
  home: { name: string; logo?: string };
  away: { name: string; logo?: string };
  minute: number;
  scoreH: number;
  scoreA: number;
};

const MOCK_MATCHES: Match[] = [
  {
    id: "m1",
    league: "Süper Lig",
    home: { name: "Galatasaray" },
    away: { name: "Fenerbahçe" },
    minute: 62,
    scoreH: 2,
    scoreA: 0,
  },
  {
    id: "m2",
    league: "Premier League",
    home: { name: "Man. City" },
    away: { name: "Arsenal" },
    minute: 74,
    scoreH: 1,
    scoreA: 1,
  },
  {
    id: "m3",
    league: "La Liga",
    home: { name: "Barcelona" },
    away: { name: "Real Madrid" },
    minute: 18,
    scoreH: 0,
    scoreA: 1,
  },
  {
    id: "m4",
    league: "UCL",
    home: { name: "Bayern" },
    away: { name: "PSG" },
    minute: 55,
    scoreH: 2,
    scoreA: 2,
  },
  {
    id: "m5",
    league: "Serie A",
    home: { name: "Inter" },
    away: { name: "Milan" },
    minute: 33,
    scoreH: 1,
    scoreA: 0,
  },
];

export default function AnaSayfaDemo() {
  return (
    <div className="demo">
      <Header />
      <LiveMatchCarousel />
      <style>{css}</style>
    </div>
  );
}

/* -------------------- Kayan Maç Kartları -------------------- */
function LiveMatchCarousel() {
  const [list, setList] = useState<Match[]>(MOCK_MATCHES);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // DEMO canlı hissi: 6 sn'de bir sırayı döndür (en sonda başa)
  useEffect(() => {
    const t = setInterval(() => {
      setList((prev) => {
        const [f, ...rest] = prev;
        return [...rest, f];
      });
    }, 6000);
    return () => clearInterval(t);
  }, []);

  // Sonsuz akış için list + list
  const flow = useMemo(() => list.concat(list), [list]);

  return (
    <section className="liveWrap">
      <div className="liveHead">
        <span className="led" />
        <span className="title">CANLI MAÇLAR</span>
        <span className="sub">demo akış</span>
      </div>

      <div className="rail" ref={trackRef}>
        <div className="track">
          {flow.map((m, i) => (
            <MatchCard key={`${m.id}-${i}`} m={m} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MatchCard({ m }: { m: Match }) {
  return (
    <a className="card" href="#" onClick={(e) => e.preventDefault()} title={`${m.league} • ${m.home.name} vs ${m.away.name}`}>
      <div className="league">
        <LogoAvatar label={m.league} small />
        <span className="lg">{m.league}</span>
      </div>

      <div className="teams">
        <div className="side">
          <LogoAvatar label={m.home.name} />
          <span className="name">{m.home.name}</span>
        </div>

        <div className="score">
          <span className="h">{m.scoreH}</span>
          <span className="sep">-</span>
          <span className="a">{m.scoreA}</span>
        </div>

        <div className="side right">
          <LogoAvatar label={m.away.name} />
          <span className="name">{m.away.name}</span>
        </div>
      </div>

      <div className="meta">
        <span className="min">
          <span className="dot" />
          {m.minute}'
        </span>
        <span className="cta">Detay</span>
      </div>
    </a>
  );
}

/* Basit logo avatar: renkli daire içinde baş harfler (logo yoksa) */
function LogoAvatar({ label, small = false }: { label: string; small?: boolean }) {
  const initials = useMemo(() => {
    const parts = label.split(" ").filter(Boolean);
    const first = parts[0]?.[0] ?? "?";
    const second = parts.length > 1 ? parts[1][0] : "";
    return (first + second).toUpperCase();
  }, [label]);

  const hue = useMemo(() => {
    // aynı label hep benzer renk versin
    let h = 0;
    for (let i = 0; i < label.length; i++) h = (h + label.charCodeAt(i) * 7) % 360;
    return h;
  }, [label]);

  return (
    <span
      className={`ava ${small ? "sm" : ""}`}
      style={{
        background: `linear-gradient(160deg, hsl(${hue} 80% 55%), hsl(${(hue + 40) % 360} 80% 45%))`,
      }}
    >
      {initials}
    </span>
  );
}

/* -------------------- CSS -------------------- */
const css = `
:root{
  --bg:#0b1224; --bg2:#0e1a33; --text:#eaf2ff; --muted:#b0c0d8;
  --chip:#141b33; --line:#1d2747; --aqua:#00e5ff; --red:#ff2a2a;
}
*{box-sizing:border-box}
.demo{min-height:100vh;background:linear-gradient(180deg,var(--bg),var(--bg2))}

/* Bölüm başlığı */
.liveWrap{max-width:1200px;margin:12px auto 0;padding:0 16px}
.liveHead{display:flex;align-items:center;gap:10px;color:#dfe8ff;margin:6px 0 8px}
.liveHead .led{width:8px;height:8px;border-radius:999px;background:#00ffa6;box-shadow:0 0 12px rgba(0,255,166,.9)}
.liveHead .title{font-weight:900;letter-spacing:.6px;font-size:13px}
.liveHead .sub{color:#9fb1cc;font-size:12px}

/* Kayan hat */
.rail{position:relative;overflow:hidden;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}
.track{
  display:inline-flex; gap:12px; padding:10px 6px;
  animation:marq 28s linear infinite;
}
.rail:hover .track{animation-play-state:paused}
@keyframes marq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

/* Kart */
.card{
  display:flex; flex-direction:column; gap:8px;
  min-width:320px; max-width:320px; padding:10px 12px;
  text-decoration:none; color:#eaf2ff;
  background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.08); border-radius:16px;
  box-shadow:0 10px 22px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.04);
}
.card:hover{filter:brightness(1.05)}

/* Lig satırı */
.league{display:flex;align-items:center;gap:8px}
.lg{color:#cfe0ff;font-size:12px}

/* Takımlar ve skor */
.teams{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center}
.side{display:flex;align-items:center;gap:8px;min-width:0}
.side.right{justify-content:flex-end}
.name{color:#dfe8ff;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.score{display:flex;align-items:center;gap:8px;font-weight:900;font-size:18px}
.score .h{color:#aef4ff}
.score .a{color:#ffdede}
.score .sep{opacity:.7}

/* Alt meta */
.meta{display:flex;align-items:center;justify-content:space-between}
.min{display:inline-flex;align-items:center;gap:6px;color:#9ccaf7;font-size:12px}
.min .dot{width:6px;height:6px;border-radius:999px;background:var(--red);box-shadow:0 0 10px rgba(255,42,42,.9);animation:blink 1s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
.cta{font-size:12px;color:#b9fffb;background:rgba(0,229,255,.08);padding:4px 8px;border-radius:8px;border:1px solid rgba(0,229,255,.25)}

/* Avatar (logo yerine) */
.ava{
  display:inline-grid; place-items:center;
  width:26px; height:26px; border-radius:999px;
  font-size:12px; font-weight:900; color:#001018;
  box-shadow:0 0 0 1px rgba(255,255,255,.15), 0 8px 18px rgba(0,0,0,.25);
}
.ava.sm{width:18px;height:18px;font-size:9px}
@media(max-width:420px){ .card{min-width:280px;max-width:280px} }
`;
