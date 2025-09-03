// web/src/pages/AnaSayfaDemo.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";

/**
 * DEMO • Popüler Maçlar (Canlı & Yakında) – xG + Oranlar + Geri Sayım
 * Revizyon:
 *  - Arka plan: ÜLKE BAYRAĞI (varsa) → yoksa lig logosu
 *  - Dakika: pulsing yok, yalnızca BÜYÜK ve belirgin metin
 *  - Takım isimleri kelime kelime alt satıra kayar (harf bölünmez)
 *  - Lig ve takım logoları daha büyük, çerçevesiz (PNG gibi)
 *  - xG / Oranlar veri yoksa hiç gösterilmez
 */

const API = import.meta.env.VITE_API_BASE_URL;

type Team = { name: string; logo?: string };
type Match = {
  id: string;
  league: string;
  leagueLogo?: string;   // fallback
  leagueFlag?: string;   // ülke bayrağı (varsa bunu kullan)
  home: Team;
  away: Team;
  minute: number;        // 0 => başlamamış
  scoreH: number;
  scoreA: number;
  kickoff?: string;      // ISO (upcoming)
};

type Odds = { H?: number; D?: number; A?: number };
type Enriched = Match & { xgH: number; xgA: number; odds?: Odds };

export default function AnaSayfaDemo() {
  return (
    <div className="demo">
      <Header />
      <FeaturedStrips />
      <style>{css}</style>
    </div>
  );
}

/* -------------------- Bölümler -------------------- */
function FeaturedStrips() {
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
        const topLive: Match[] = L.slice(0, 8);
        const topUp: Match[] = U.slice(0, 8);

        const liveEnriched = await enrichMany(topLive);
        const upcomingEnriched = await enrichMany(topUp);

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

  if (err) return SectionHead("POPÜLER MAÇLAR", `hata: ${err}`);

  const hasLive = live.length > 0;
  const hasUpcoming = upcoming.length > 0;

  return (
    <>
      {hasLive && (
        <CarouselSection title="CANLI POPÜLER MAÇLAR" subtitle="anlık akış" items={live} trackSpeed="45s" />
      )}
      {hasUpcoming && (
        <CarouselSection title="YAKINDA POPÜLER MAÇLAR" subtitle="15 gün içinde" items={upcoming} trackSpeed="55s" />
      )}
      {!hasLive && !hasUpcoming && SectionHead("POPÜLER MAÇLAR", "şu an listelenecek maç yok")}
    </>
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

function CarouselSection({
  title,
  subtitle,
  items,
  trackSpeed,
}: {
  title: string;
  subtitle: string;
  items: Enriched[];
  trackSpeed: string;
}) {
  const normalized = useMemo(() => {
    if (!items.length) return [];
    const out = [...items];
    while (out.length < 6) out.push(...items);
    return out.slice(0, Math.max(out.length, 6));
  }, [items]);

  const flow = useMemo(() => (normalized.length ? normalized.concat(normalized) : []), [normalized]);

  return (
    <section className="liveWrap">
      <div className="liveHead">
        <span className="led" />
        <span className="title">{title}</span>
        <span className="sub">{subtitle}</span>
      </div>

      <div className="rail" style={{ ["--dur" as any]: trackSpeed }}>
        <div className="track">
          {flow.map((m, i) => (
            <MatchCard key={`${m.id}-${i}`} m={m} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------- Kart -------------------- */
function MatchCard({ m }: { m: Enriched }) {
  const isLive = m.minute > 0;

  // Gol flash (lokal)
  const prevRef = useRef<{ h: number; a: number }>({ h: m.scoreH, a: m.scoreA });
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const prev = prevRef.current;
    if (m.scoreH > prev.h || m.scoreA > prev.a) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 2000);
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
      {/* üst satır */}
      <div className="top">
        <div className="league">
          {/* ön yüzde küçük logo/flag gösterim (çerçevesiz) */}
          {bgImage ? <img className="lgLogo big" src={bgImage} alt="" /> : null}
          <span className="lg">{m.league}</span>
        </div>
        <div className="min">
          {isLive ? (
            <span className="minText">{m.minute}'</span> // sade ve büyük
          ) : m.kickoff ? (
            <span className="minText pre"><Countdown iso={m.kickoff} /></span>
          ) : (
            <span className="minText pre">MAÇ ÖNÜ</span>
          )}
        </div>
      </div>

      {/* takımlar + skor */}
      <div className="teams">
        <div className="side">
          <TeamLogo name={m.home.name} logo={m.home.logo} size={42} />
          <span className="name">{m.home.name}</span>
        </div>

        <div className="score">
          <span className="h">{m.scoreH}</span>
          <span className="sep">-</span>
          <span className="a">{m.scoreA}</span>
        </div>

        <div className="side right">
          <TeamLogo name={m.away.name} logo={m.away.logo} size={42} />
          <span className="name">{m.away.name}</span>
        </div>
      </div>

      {/* xG – sadece veri varsa */}
      {hasXG && (
        <div className="xg">
          <span className="xgLabel">xG</span>
          <span className="xgVal">{formatXG(m.xgH)}</span>
          <span className="xgSep">:</span>
          <span className="xgVal">{formatXG(m.xgA)}</span>
        </div>
      )}

      {/* Oran çipleri – sadece veri varsa */}
      {hasOdds && (
        <div className="odds">
          {m.odds?.H ? <OddChip label="1" value={m.odds.H} /> : null}
          {m.odds?.D ? <OddChip label="X" value={m.odds.D} /> : null}
          {m.odds?.A ? <OddChip label="2" value={m.odds.A} /> : null}
        </div>
      )}
    </a>
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

/* Geri sayım chip (T- HH:MM:SS) */
function Countdown({ iso }: { iso: string }) {
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = new Date(iso).getTime();
  const diff = Math.max(0, target - now);
  const s = Math.floor(diff / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const label = s === 0 ? "BAŞLIYOR" : `T- ${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
  return <>{label}</>;
}

/* Logo varsa göster, kırık/boşsa avatar fallback (boyut ayarlı) */
function TeamLogo({ name, logo, size = 36 }: { name: string; logo?: string; size?: number }) {
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
  return (
    <span
      className="ava"
      style={{
        width: size,
        height: size,
        background:
          "linear-gradient(160deg, rgba(255,255,255,.15), rgba(255,255,255,.05))",
      }}
    >
      {initials}
    </span>
  );
}

/* -------------------- Enrichment -------------------- */
async function enrichMany(list: Match[]): Promise<Enriched[]> {
  const out: Enriched[] = [];
  const batchSize = 4;

  for (let i = 0; i < list.length; i += batchSize) {
    const batch = list.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (m) => {
        const xg =
          m.minute > 0
            ? await fetchJSON<{ xgH: number; xgA: number }>(`${API}/api/live/stats?fixture=${m.id}`)
            : null;
        const odds = await fetchJSON<Odds>(`${API}/api/live/odds?fixture=${m.id}&market=1&minute=${m.minute}`);
        return { ...m, xgH: xg?.xgH ?? 0, xgA: xg?.xgA ?? 0, odds } as Enriched;
      })
    );
    out.push(...results);
  }
  return out;
}

async function fetchJSON<T = any>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

/* -------------------- Helpers -------------------- */
function formatXG(n: number | undefined) {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return v.toFixed(2);
}
function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/* -------------------- CSS -------------------- */
const css = `
:root{
  --bg:#0b1224; --bg2:#0e1a33; --text:#eaf2ff; --muted:#b0c0d8;
  --chip:#141b33; --line:#1d2747; --aqua:#00e5ff; --red:#ff2a2a; --goal:#18ff74;
}
*{box-sizing:border-box}
.demo{min-height:100vh;background:linear-gradient(180deg,var(--bg),var(--bg2))}

.liveWrap{max-width:1200px;margin:12px auto 0;padding:0 16px}
.liveHead{display:flex;align-items:center;gap:10px;color:#dfe8ff;margin:6px 0 8px}
.liveHead .led{width:8px;height:8px;border-radius:999px;background:#00ffa6;box-shadow:0 0 12px rgba(0,255,166,.9)}
.liveHead .title{font-weight:900;letter-spacing:.6px;font-size:13px}
.liveHead .sub{color:#9fb1cc;font-size:12px}

.rail{position:relative;overflow:hidden;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}
.track{display:inline-flex;gap:12px;padding:10px 6px;animation:marq var(--dur, 45s) linear infinite}
.rail:hover .track{animation-play-state:paused}
@keyframes marq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

.card{
  position:relative;
  display:flex;flex-direction:column;gap:12px;
  min-width:340px;max-width:340px;padding:16px;
  text-decoration:none;color:#eaf2ff;
  background:linear-gradient(180deg, rgba(11,17,34,.9), rgba(10,18,35,.85));
  border:1px solid rgba(255,255,255,.10);border-radius:18px;
  box-shadow:0 10px 18px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.05);
  overflow:hidden;
}
.card::before{
  content:""; position:absolute; inset:-10% -10% auto auto; width:120%; height:120%;
  background-image:var(--bgimg); background-repeat:no-repeat; background-position:center; background-size:cover;
  filter:blur(6px) opacity(.35);
  pointer-events:none;
}
.card:hover{filter:brightness(1.05)}

.top{display:flex;align-items:center;justify-content:space-between}
.league{display:flex;align-items:center;gap:12px}
.lg{color:#cfe0ff;font-weight:800;font-size:14px}
.lgLogo{width:28px;height:28px;object-fit:contain}

.min .minText{
  font-weight:900; font-size:18px; color:#ffd1d1;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.16);
  padding:4px 10px; border-radius:10px;
}

.teams{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center}
.side{display:flex;align-items:center;gap:12px;min-width:0}
.side.right{justify-content:flex-end}
.name{
  color:#e8f0ff;font-size:15px;font-weight:800;
  white-space:normal; word-break:normal; overflow-wrap:break-word; line-height:1.25;
}

.score{
  display:flex;align-items:center;gap:12px;
  font-weight:900;font-size:28px; padding:8px 18px;border-radius:999px;
  background:rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.18);
}
.card.goal .score{
  animation:goalflash .25s ease-in-out 0s 8 alternate;
  border-color: rgba(24,255,116,.6); box-shadow:0 0 16px rgba(24,255,116,.35);
}
@keyframes goalflash{from{background:rgba(24,255,116,.22)} to{background:rgba(24,255,116,.06)}}
.score .sep{opacity:.7}
.score .h{color:#aef4ff}
.score .a{color:#ffdede}

.xg{
  display:flex;align-items:center;gap:6px;font-weight:900;color:#ffe3e3;
  background:rgba(255,42,42,.12);border:1px solid rgba(255,42,42,.25);
  padding:6px 12px;border-radius:12px;width:max-content
}
.xgLabel{font-size:12px;letter-spacing:.4px;opacity:.9}
.xgVal{font-size:15px}
.xgSep{opacity:.7}

.odds{display:flex;gap:10px;margin-top:2px}
.odd{
  display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;
  background:rgba(0,229,255,.10); border:1px solid rgba(0,229,255,.28); color:#ccfaff; font-size:13px
}
.ol{font-weight:900}
.ov{font-weight:800}

.ava{
  display:inline-grid;place-items:center;border-radius:999px;
  font-size:16px;font-weight:900;color:#001018;
  background:transparent;
}
.ava.img{object-fit:cover;border:none;box-shadow:none}

@media(max-width:420px){
  .card{min-width:300px;max-width:300px}
}
`;
