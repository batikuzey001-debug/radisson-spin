// web/src/pages/AnaSayfaDemo.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";

/**
 * DEMO • Header + Kayan Canlı Maç Kartları (API bağlı)
 * İyileştirmeler:
 * - Akış daha YAVAŞ ve AKICI (genişliğe göre süre hesaplanır)
 * - Hover'da durur
 * - Logo yoksa/broken ise otomatik avatar fallback
 */

const API = import.meta.env.VITE_API_BASE_URL;

type Team = { name: string; logo?: string };
type Match = {
  id: string;
  league: string;
  leagueLogo?: string;
  home: Team;
  away: Team;
  minute: number;
  scoreH: number;
  scoreA: number;
};

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
  const [list, setList] = useState<Match[]>([]);
  const [err, setErr] = useState<string>("");
  const railRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // İlk yükleme + 12sn polling
  useEffect(() => {
    let timer: number | null = null;

    async function load() {
      try {
        const res = await fetch(`${API}/api/live/matches`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Match[] = await res.json();
        setErr("");
        setList(data ?? []);
      } catch (e: any) {
        setErr(e?.message ?? "Bağlantı hatası");
      }
    }

    load();
    timer = window.setInterval(load, 12000);

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, []);

  // En az 6 kart görünümü için doldur
  const normalized = useMemo(() => {
    if (!list.length) return [];
    const out = [...list];
    while (out.length < 6) out.push(...list);
    return out.slice(0, Math.max(out.length, 6));
  }, [list]);

  // Sonsuz görünmesi için 2 kez tekrarla
  const flow = useMemo(() => (normalized.length ? normalized.concat(normalized) : []), [normalized]);

  // Hız: içerik genişliğine göre süre ayarla (yavaş akış)
  useEffect(() => {
    const rail = railRef.current;
    const track = trackRef.current;
    if (!rail || !track) return;

    // Akması gereken mesafe (tek set kadar)
    const distance = track.scrollWidth / 2; // çünkü flow = normalized*2
    const pxPerSec = 60; // daha yavaş (px/sn)
    const durationSec = Math.max(20, Math.round(distance / pxPerSec));

    rail.style.setProperty("--dur", `${durationSec}s`);
  }, [flow]);

  return (
    <section className="liveWrap">
      <div className="liveHead">
        <span className="led" />
        <span className="title">CANLI MAÇLAR</span>
        <span className="sub">
          {err ? `hata: ${err}` : list.length ? "anlık akış" : "şu an canlı maç yok"}
        </span>
      </div>

      <div className="rail" ref={railRef}>
        <div className="track" ref={trackRef}>
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
    <a
      className="card"
      href="#"
      onClick={(e) => e.preventDefault()}
      title={`${m.league} • ${m.home.name} vs ${m.away.name}`}
    >
      <div className="top">
        <div className="league">
          {m.leagueLogo ? <img className="lgLogo" src={m.leagueLogo} alt="" /> : null}
          <span className="lg">{m.league}</span>
        </div>
        <div className="min">
          <span className="dot" />
          {m.minute}'
        </div>
      </div>

      <div className="teams">
        <div className="side">
          <TeamLogo name={m.home.name} logo={m.home.logo} />
          <span className="name">{m.home.name}</span>
        </div>

        <div className="score">
          <span className="h">{m.scoreH}</span>
          <span className="sep">-</span>
          <span className="a">{m.scoreA}</span>
        </div>

        <div className="side right">
          <TeamLogo name={m.away.name} logo={m.away.logo} />
          <span className="name">{m.away.name}</span>
        </div>
      </div>
    </a>
  );
}

/* Logo varsa göster, kırık/boşsa avatar fallback */
function TeamLogo({ name, logo }: { name: string; logo?: string }) {
  const [imgOk, setImgOk] = useState<boolean>(!!logo);
  const initials = useMemo(() => {
    const parts = name.split(" ").filter(Boolean);
    const first = parts[0]?.[0] ?? "?";
    const second = parts.length > 1 ? parts[1][0] : "";
    return (first + second).toUpperCase();
  }, [name]);

  const hue = useMemo(() => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 7) % 360;
    return h;
  }, [name]);

  if (logo && imgOk) {
    return (
      <img
        className="ava img"
        src={logo}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setImgOk(false)}
      />
    );
  }
  return (
    <span
      className="ava"
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

.liveWrap{max-width:1200px;margin:12px auto 0;padding:0 16px}
.liveHead{display:flex;align-items:center;gap:10px;color:#dfe8ff;margin:6px 0 8px}
.liveHead .led{width:8px;height:8px;border-radius:999px;background:#00ffa6;box-shadow:0 0 12px rgba(0,255,166,.9)}
.liveHead .title{font-weight:900;letter-spacing:.6px;font-size:13px}
.liveHead .sub{color:#9fb1cc;font-size:12px}

.rail{position:relative;overflow:hidden;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}
.track{
  display:inline-flex;gap:12px;padding:10px 6px;
  animation:marq var(--dur, 40s) linear infinite;
}
.rail:hover .track{animation-play-state:paused}
@keyframes marq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

.card{
  display:flex;flex-direction:column;gap:8px;
  min-width:260px;max-width:260px;padding:10px;
  text-decoration:none;color:#eaf2ff;
  background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.08);border-radius:14px;
  box-shadow:0 6px 16px rgba(0,0,0,.25),inset 0 0 0 1px rgba(255,255,255,.04)
}
.card:hover{filter:brightness(1.05)}

.top{display:flex;align-items:center;justify-content:space-between;font-size:12px}
.league{display:flex;align-items:center;gap:6px}
.lg{color:#cfe0ff}
.lgLogo{width:14px;height:14px;border-radius:3px;object-fit:contain;border:1px solid rgba(255,255,255,.15)}

.min{display:inline-flex;align-items:center;gap:4px;color:#9ccaf7;font-size:12px}
.min .dot{width:6px;height:6px;border-radius:999px;background:var(--red);box-shadow:0 0 10px rgba(255,42,42,.9);animation:blink 1s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}

.teams{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center}
.side{display:flex;align-items:center;gap:6px;min-width:0}
.side.right{justify-content:flex-end}
.name{color:#dfe8ff;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.score{display:flex;align-items:center;gap:6px;font-weight:900;font-size:16px}
.score .h{color:#aef4ff}
.score .a{color:#ffdede}
.score .sep{opacity:.7}

.ava{
  display:inline-grid;place-items:center;
  width:22px;height:22px;border-radius:999px;
  font-size:10px;font-weight:900;color:#001018;
  box-shadow:0 0 0 1px rgba(255,255,255,.15),0 6px 14px rgba(0,0,0,.25)
}
.ava.img{background:#0c1224;object-fit:cover}
@media(max-width:420px){.card{min-width:220px;max-width:220px}}
`;
