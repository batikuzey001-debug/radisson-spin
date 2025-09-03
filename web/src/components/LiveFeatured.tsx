// web/src/components/LiveFeatured.tsx
import { useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL;

type Team = { name: string; logo?: string };
type Match = {
  id: string;
  league: string;
  leagueLogo?: string;
  leagueFlag?: string;
  home: Team;
  away: Team;
  minute: number;
  scoreH: number;
  scoreA: number;
  kickoff?: string; // ISO (upcoming)
};
type Odds = { H?: number; D?: number; A?: number };
type Enriched = Match & { xgH: number; xgA: number; odds?: Odds };

export default function LiveFeatured() {
  const [live, setLive] = useState<Enriched[]>([]);
  const [upcoming, setUpcoming] = useState<Enriched[]>([]);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let timer: number | null = null;
    async function load() {
      try {
        const res = await fetch(`${API}/api/live/featured?limit=12`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { live: L = [], upcoming: U = [] } = (await res.json()) ?? {};
        const topLive: Match[] = L.slice(0, 12);
        const topUp: Match[] = U.slice(0, 12);
        const [liveEnriched, upcomingEnriched] = await Promise.all([
          enrichMany(topLive),
          enrichMany(topUp),
        ]);
        setLive(liveEnriched);
        setUpcoming(upcomingEnriched);
        setErr("");
      } catch (e: any) {
        setErr(e?.message ?? "Bağlantı hatası");
      }
    }
    load();
    timer = window.setInterval(load, 30000);
    return () => timer && window.clearInterval(timer);
  }, []);

  return (
    <div className="lf-wrap">
      <style>{css}</style>

      {err && <SectionHead title="POPÜLER MAÇLAR" sub={`hata: ${err}`} />}

      {/* CANLI: menünün altında, satır başından başlayan responsive grid */}
      {live.length > 0 && (
        <GridSection title="CANLI POPÜLER MAÇLAR" subtitle="anlık akış" items={live} />
      )}

      {/* YAKINDA: canlı yoksa/azsa destekleyici */}
      {upcoming.length > 0 && (
        <GridSection title="YAKINDA POPÜLER MAÇLAR" subtitle="15 gün içinde" items={upcoming} />
      )}

      {!err && live.length === 0 && upcoming.length === 0 && (
        <SectionHead title="POPÜLER MAÇLAR" sub="şu an listelenecek maç yok" />
      )}
    </div>
  );
}

function SectionHead({ title, sub }: { title: string; sub: string }) {
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

/* -------- GRID SECTION (carousel yerine grid) -------- */
function GridSection({ title, subtitle, items }: { title: string; subtitle: string; items: Enriched[] }) {
  return (
    <section className="liveWrap">
      <div className="liveHead">
        <span className="led" />
        <span className="title">{title}</span>
        <span className="sub">{subtitle}</span>
      </div>
      <div className="grid">
        {items.map((m) => (
          <MatchCard key={m.id} m={m} />
        ))}
      </div>
    </section>
  );
}

/* -------------------- Kart -------------------- */
function MatchCard({ m }: { m: Enriched }) {
  const isLive = m.minute > 0;

  // Gol flash
  const prevRef = useRef<{ h: number; a: number }>({ h: m.scoreH, a: m.scoreA });
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const prev = prevRef.current;
    if (m.scoreH > prev.h || m.scoreA > prev.a) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1300);
      prevRef.current = { h: m.scoreH, a: m.scoreA };
      return () => clearTimeout(t);
    }
    prevRef.current = { h: m.scoreH, a: m.scoreA };
  }, [m.scoreH, m.scoreA]);

  const hasXG = (m.xgH ?? 0) > 0 || (m.xgA ?? 0) > 0;
  const hasOdds = !!(m.odds?.H || m.odds?.D || m.odds?.A);
  const bgImage = m.leagueFlag || m.leagueLogo || "";

  return (
    <a
      className={`card ${isLive ? "live" : "prematch"} ${flash ? "goal" : ""}`}
      href="#"
      onClick={(e) => e.preventDefault()}
      style={bgImage ? ({ ["--bgimg" as any]: `url('${bgImage}')` } as any) : undefined}
      title={`${m.league} • ${m.home.name} vs ${m.away.name}`}
    >
      {/* Üst: Lig logo + lig adı + dakika/geri sayım */}
      <div className="top">
        <div className="league">
          {m.leagueLogo ? <img className="lgLogo" src={m.leagueLogo} alt="" /> : null}
          <span className="lg">{m.league}</span>
        </div>
        <div className="minText">
          {isLive ? `${m.minute}'` : m.kickoff ? <Countdown iso={m.kickoff} /> : "MAÇ ÖNÜ"}
        </div>
      </div>

      {/* Cam panel */}
      <div className="glass">
        {/* Takım kolonları (logo üstte, isim altta) + Merkez skor */}
        <div className="teams">
          <TeamCol name={m.home.name} logo={m.home.logo} />
          <CenterScore flash={flash} h={m.scoreH} a={m.scoreA} />
          <TeamCol name={m.away.name} logo={m.away.logo} right />
        </div>

        {/* xG */}
        {hasXG && (
          <div className="xg">
            <span className="xgLabel">xG</span>
            <span className="xgVal">{formatXG(m.xgH)}</span>
            <span className="xgSep">:</span>
            <span className="xgVal">{formatXG(m.xgA)}</span>
          </div>
        )}

        {/* Oranlar */}
        {hasOdds && (
          <div className="odds">
            {m.odds?.H ? <OddChip label="1" value={m.odds.H} /> : null}
            {m.odds?.D ? <OddChip label="X" value={m.odds.D} /> : null}
            {m.odds?.A ? <OddChip label="2" value={m.odds.A} /> : null}
          </div>
        )}
      </div>
    </a>
  );
}

function TeamCol({ name, logo, right = false }: { name: string; logo?: string; right?: boolean }) {
  return (
    <div className={`teamcol ${right ? "right" : ""}`}>
      <TeamLogo name={name} logo={logo} size={44} />
      <div className="tname">{name}</div>
    </div>
  );
}

function CenterScore({ h, a, flash }: { h: number; a: number; flash?: boolean }) {
  return (
    <div className={`score ${flash ? "pulse" : ""}`}>
      <span className="h">{h}</span>
      <span className="sep">:</span>
      <span className="a">{a}</span>
    </div>
  );
}

function OddChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="odd">
      <span className="ol">{label}</span>
      <span className="ov">{value.toFixed(2)}</span>
    </span>
  );
}

function Countdown({ iso }: { iso: string }) {
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const target = new Date(iso).getTime();
  const diff = Math.max(0, target - now);
  const s = Math.floor(diff / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const label = s === 0 ? "BAŞLIYOR" : `T- ${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
  return <>{label}</>;
}

function TeamLogo({ name, logo, size = 44 }: { name: string; logo?: string; size?: number }) {
  const [imgOk, setImgOk] = useState<boolean>(!!logo);
  const initials = useMemo(() => {
    const parts = name.split(" ").filter(Boolean);
    const first = parts[0]?.[0] ?? "?";
    const second = parts.length > 1 ? parts[1][0] : "";
    return (first + second).toUpperCase();
  }, [name]);
  if (logo && imgOk) {
    return (
      <img
        className="ava img"
        src={logo}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setImgOk(false)}
        style={{ width: size, height: size }}
      />
    );
  }
  return <span className="ava" style={{ width: size, height: size }}>{initials}</span>;
}

/* -------------------- Enrichment -------------------- */
async function enrichMany(list: Match[]): Promise<Enriched[]> {
  const out: Enriched[] = [];
  const batchSize = 4;
  for (let i = 0; i < list.length; i += batchSize) {
    const batch = list.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(async (m) => {
      const xg = m.minute > 0 ? await fetchJSON<{ xgH: number; xgA: number }>(`${API}/api/live/stats?fixture=${m.id}`) : null;
      const odds = await fetchJSON<Odds>(`${API}/api/live/odds?fixture=${m.id}`);
      return { ...m, xgH: xg?.xgH ?? 0, xgA: xg?.xgA ?? 0, odds } as Enriched;
    }));
    out.push(...results);
  }
  return out;
}
async function fetchJSON<T = any>(url: string): Promise<T | null> {
  try { const r = await fetch(url); if (!r.ok) return null; return (await r.json()) as T; } catch { return null; }
}
function formatXG(n: number | undefined) { const v = typeof n === "number" && Number.isFinite(n) ? n : 0; return v.toFixed(2); }
function pad2(n: number) { return String(n).padStart(2, "0"); }

/* -------------------- CSS -------------------- */
const css = `
:root{
  --bg:#0b1224; --bg2:#0e1a33; --text:#eaf2ff; --muted:#b0c0d8;
  --line:#1d2747; --aqua:#00e5ff; --goal:#18ff74;
}
*{box-sizing:border-box} body{margin:0}
.lf-wrap{min-height:100%;}

.liveWrap{max-width:1200px;margin:16px auto 0;padding:0 16px}
.liveHead{display:flex;align-items:center;gap:10px;color:#dfe8ff;margin:6px 0 10px}
.liveHead .led{width:8px;height:8px;border-radius:999px;background:#00ffa6;box-shadow:0 0 12px rgba(0,255,166,.9)}
.liveHead .title{font-weight:900;letter-spacing:.6px;font-size:13px}
.liveHead .sub{color:#9fb1cc;font-size:12px}

/* GRID (satır başından) */
.grid{
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));
  gap:12px;
}

/* Kart (küçültüldü, overlap yok) */
.card{
  position:relative; display:flex; flex-direction:column; gap:10px;
  min-height: 220px;
  border-radius:16px; overflow:hidden; text-decoration:none; color:#eaf2ff;
  background:linear-gradient(180deg, rgba(6,10,22,.88), rgba(6,12,24,.86));
  border:1px solid rgba(255,255,255,.08);
  box-shadow:0 8px 16px rgba(0,0,0,.28);
  padding:12px;
}
.card::before{
  content:""; position:absolute; inset:0;
  background-image:var(--bgimg); background-size:cover; background-position:center;
  filter:opacity(.45) saturate(1.1);
}
.card::after{
  content:""; position:absolute; inset:0;
  background:
    radial-gradient(55% 50% at 50% 0%, rgba(5,10,20,.6), transparent 60%),
    linear-gradient(180deg, rgba(5,10,20,.6) 10%, rgba(6,12,24,.88) 100%);
  backdrop-filter: blur(4px);
}
.card > *{position:relative; z-index:1}
.card.goal{box-shadow:0 0 18px rgba(24,255,116,.22), 0 8px 16px rgba(0,0,0,.3)}

/* Üst satır: lig + dakika */
.top{display:flex;align-items:center;justify-content:space-between}
.league{display:flex;align-items:center;gap:8px; min-width:0}
.lg{color:#e6f1ff;font-weight:800;font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.lgLogo{width:20px;height:20px;object-fit:contain}
.minText{font-weight:900; font-size:16px; color:#ffd5d5; text-shadow:0 1px 8px rgba(0,0,0,.6)}

/* Cam panel */
.glass{
  display:flex; flex-direction:column; gap:10px;
  background:linear-gradient(180deg, rgba(10,16,28,.45), rgba(10,16,28,.35));
  border:1px solid rgba(255,255,255,.08);
  border-radius:12px; padding:10px;
}

/* Takım kolonları ve skor (dikey takım bloğu) */
.teams{
  display:grid; grid-template-columns:1fr auto 1fr; gap:10px; align-items:center;
}
.teamcol{display:flex; flex-direction:column; align-items:center; gap:6px; min-width:0}
.tname{
  color:#eef4ff; font-size:14px; font-weight:800; text-align:center;
  white-space:normal; word-break:normal; overflow-wrap:break-word; line-height:1.22;
  max-height:3.7em; /* en fazla 3 satır */
}

/* Skor çerçevesiz, canlı */
.score{
  display:flex; align-items:center; gap:10px;
  font-weight:1000; font-size:28px; letter-spacing:.3px;
  color:#fff; text-shadow:0 0 10px rgba(255,255,255,.35), 0 0 18px rgba(160,220,255,.28);
}
.score.pulse{
  animation:goalflash .18s ease-in-out 0s 8 alternate;
}
@keyframes goalflash{
  from{ text-shadow:0 0 16px rgba(24,255,116,.8), 0 0 26px rgba(24,255,116,.45); color:#eafff5 }
  to  { text-shadow:0 0 10px rgba(160,220,255,.3), 0 0 18px rgba(160,220,255,.25); color:#fff }
}
.score .sep{opacity:.95}
.score .h{color:#b9f0ff; text-shadow:0 0 14px rgba(120,220,255,.5)}
.score .a{color:#ffd9d9; text-shadow:0 0 14px rgba(255,120,120,.5)}

/* xG ve Oranlar sadece veri varsa çiziliyor; stiller küçük */
.xg{
  display:flex; align-items:center; gap:6px; width:max-content;
  font-weight:900; font-size:12px; color:#ffe3e3;
  background:rgba(255,42,42,.08); border:1px solid rgba(255,42,42,.18);
  padding:6px 8px; border-radius:10px;
}
.xgVal{font-size:13px}
.xgSep{opacity:.7}

.odds{display:flex; gap:8px; flex-wrap:wrap}
.odd{
  display:inline-flex; align-items:center; gap:6px;
  padding:6px 10px; border-radius:999px; font-size:12px;
  background:rgba(0,229,255,.12); border:1px solid rgba(0,229,255,.28); color:#ccfaff
}
.ol{font-weight:900} .ov{font-weight:800}

/* Logolar */
.ava{
  display:inline-grid; place-items:center; border-radius:999px;
  font-size:16px; font-weight:900; color:#001018;
  background:linear-gradient(180deg, rgba(255,255,255,.15), rgba(255,255,255,.05));
  box-shadow:0 8px 14px rgba(0,0,0,.22);
}
.ava.img{object-fit:cover; border:none; box-shadow:none; background:transparent}

/* Mobil */
@media(max-width:480px){
  .grid{grid-template-columns:repeat(auto-fill, minmax(220px, 1fr))}
  .card{min-height: 210px; padding:10px}
  .minText{font-size:14px}
  .score{font-size:24px}
  .tname{font-size:13px}
}
`;
