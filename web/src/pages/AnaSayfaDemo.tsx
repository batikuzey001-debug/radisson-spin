// web/src/pages/AnaSayfaDemo.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";

/**
 * DEMO • Header + Kayan Canlı Maç Kartları (xG + Oranlar)
 * - Veri: /api/live/matches  (maç listesi)
 *         /api/live/stats?fixture={id}  (xG)
 *         /api/live/odds?fixture={id}&market=1  (1X2 oranları)
 * - xG üstte gösterilir; yoksa 0 yazılır.
 * - Oranlar kartın altında 1X2 chipleri olarak gösterilir.
 * - Bu dosya DEMO amaçlıdır; backend uçları hazır olunca gerçek veriyle dolar.
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

type MatchExtra = {
  xgH: number;
  xgA: number;
  odds?: { H?: number; D?: number; A?: number };
};

type Enriched = Match & MatchExtra;

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
  const [list, setList] = useState<Enriched[]>([]);
  const [err, setErr] = useState<string>("");

  // İlk yükleme + 12sn polling
  useEffect(() => {
    let timer: number | null = null;

    async function load() {
      try {
        // 1) canlı maçlar
        const res = await fetch(`${API}/api/live/matches`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const base: Match[] = (await res.json()) ?? [];

        // çok istek atmayalım: ilk 8 maçı zenginleştir
        const top = base.slice(0, 8);

        // 2) her maç için xG ve 1X2 oranlarını paralel çek
        const enriched = await Promise.all(
          top.map(async (m) => {
            // xG
            let xgH = 0,
              xgA = 0;
            try {
              const s = await fetch(`${API}/api/live/stats?fixture=${m.id}`);
              if (s.ok) {
                const js = await s.json();
                xgH = Number(js?.xgH ?? 0) || 0;
                xgA = Number(js?.xgA ?? 0) || 0;
              }
            } catch {
              /* ignore */
            }

            // 1X2 (Match Winner) odds
            let odds: MatchExtra["odds"] = undefined;
            try {
              const o = await fetch(`${API}/api/live/odds?fixture=${m.id}&market=1`);
              if (o.ok) {
                const oj = await o.json();
                // beklenen şekil: { H: "1.85", D: "3.40", A: "4.20" }
                odds = {
                  H: oj?.H ? Number(oj.H) : undefined,
                  D: oj?.D ? Number(oj.D) : undefined,
                  A: oj?.A ? Number(oj.A) : undefined,
                };
              }
            } catch {
              /* ignore */
            }

            const extra: MatchExtra = { xgH, xgA, odds };
            return { ...m, ...extra };
          })
        );

        setList(enriched);
        setErr("");
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

  // en az 6 kart görünümü için doldur
  const normalized = useMemo(() => {
    if (!list.length) return [];
    const out = [...list];
    while (out.length < 6) out.push(...list);
    return out.slice(0, Math.max(out.length, 6));
  }, [list]);

  // akış: sonsuz görünmesi için 2x tekrarla
  const flow = useMemo(() => (normalized.length ? normalized.concat(normalized) : []), [normalized]);

  if (err) {
    return SectionHead("CANLI MAÇLAR", `hata: ${err}`);
  }
  if (!list.length) {
    return SectionHead("CANLI MAÇLAR", "şu an canlı maç yok");
  }

  return (
    <section className="liveWrap">
      <div className="liveHead">
        <span className="led" />
        <span className="title">CANLI MAÇLAR</span>
        <span className="sub">anlık akış</span>
      </div>

      <div className="rail">
        <div className="track">
          {flow.map((m, i) => (
            <MatchCard key={`${m.id}-${i}`} m={m} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHead(title: string, sub: string) {
  return (
    <section className="liveWrap">
      <div className="liveHead">
        <span className="led" />
        <span className="title">{title}</span>
        <span className="sub">{sub}</span>
      </div>
    </section>
  );
}

function MatchCard({ m }: { m: Enriched }) {
  return (
    <a
      className="card"
      href="#"
      onClick={(e) => e.preventDefault()}
      title={`${m.league} • ${m.home.name} vs ${m.away.name}`}
    >
      {/* xG üst şerit */}
      <div className="xg">
        <span className="xgLabel">xG</span>
        <span className="xgVal">{formatXG(m.xgH)}</span>
        <span className="xgSep">:</span>
        <span className="xgVal">{formatXG(m.xgA)}</span>
      </div>

      {/* üst satır */}
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

      {/* takımlar + skor */}
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

      {/* Oran çipleri (1X2) */}
      <div className="odds">
        <OddChip label="1" value={m.odds?.H} />
        <OddChip label="X" value={m.odds?.D} />
        <OddChip label="2" value={m.odds?.A} />
      </div>
    </a>
  );
}

function OddChip({ label, value }: { label: string; value?: number }) {
  const has = typeof value === "number" && !Number.isNaN(value);
  return (
    <span className={`odd ${has ? "" : "muted"}`}>
      <span className="ol">{label}</span>
      <span className="ov">{has ? value.toFixed(2) : "-"}</span>
    </span>
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

/* -------------------- Helpers -------------------- */
function formatXG(n: number | undefined) {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return v.toFixed(2);
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
  animation:marq 40s linear infinite; /* daha yavaş */
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

/* xG üst şerit */
.xg{
  display:flex;align-items:center;gap:6px;
  font-weight:900;color:#ffe3e3;
  background:rgba(255,42,42,.12);border:1px solid rgba(255,42,42,.25);
  padding:4px 8px;border-radius:10px;
  width:max-content
}
.xgLabel{font-size:11px;letter-spacing:.4px;opacity:.9}
.xgVal{font-size:13px}
.xgSep{opacity:.7}

/* üst satır */
.top{display:flex;align-items:center;justify-content:space-between;font-size:12px}
.league{display:flex;align-items:center;gap:6px}
.lg{color:#cfe0ff}
.lgLogo{width:14px;height:14px;border-radius:3px;object-fit:contain;border:1px solid rgba(255,255,255,.15)}

.min{display:inline-flex;align-items:center;gap:4px;color:#9ccaf7;font-size:12px}
.min .dot{width:6px;height:6px;border-radius:999px;background:var(--red);box-shadow:0 0 10px rgba(255,42,42,.9);animation:blink 1s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}

/* takımlar + skor */
.teams{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center}
.side{display:flex;align-items:center;gap:6px;min-width:0}
.side.right{justify-content:flex-end}
.name{color:#dfe8ff;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.score{display:flex;align-items:center;gap:6px;font-weight:900;font-size:16px}
.score .h{color:#aef4ff}
.score .a{color:#ffdede}
.score .sep{opacity:.7}

/* odds row */
.odds{display:flex;gap:6px;margin-top:2px}
.odd{
  display:inline-flex;align-items:center;gap:6px;
  padding:4px 8px;border-radius:999px;
  background:rgba(0,229,255,.08); border:1px solid rgba(0,229,255,.25);
  color:#ccfaff; font-size:12px
}
.odd.muted{opacity:.55}
.ol{font-weight:900}
.ov{font-weight:700}

/* avatar / logo */
.ava{
  display:inline-grid;place-items:center;
  width:22px;height:22px;border-radius:999px;
  font-size:10px;font-weight:900;color:#001018;
  box-shadow:0 0 0 1px rgba(255,255,255,.15),0 6px 14px rgba(0,0,0,.25)
}
.ava.img{background:#0c1224;object-fit:cover}
@media(max-width:420px){.card{min-width:220px;max-width:220px}}
`;
