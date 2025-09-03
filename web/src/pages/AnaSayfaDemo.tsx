// web/src/pages/AnaSayfaDemo.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";

/**
 * DEMO • Header + Popüler Maçlar (Canlı & Yakında) – xG + Oranlar + Geri Sayım
 * Kaynaklar:
 *  - /api/live/featured?limit=12  -> { live: Match[], upcoming: Match[] } (kickoff ISO içerir)
 *  - /api/live/stats?fixture=ID   -> { xgH, xgA }
 *  - /api/live/odds?fixture=ID&market=1[&minute=N] -> { H, D, A } (akıllı: canlı/prematch + fallback)
 *
 * Kart düzeni:
 *  [Üst satır] Lig + sağ üstte dakika (canlı) / GERİ SAYIM (maç önü)
 *  [Orta]      Ev Takım  SKOR  Dep Takım
 *  [Alt-1]     xG: 1.23 : 0.78   (yoksa 0.00)
 *  [Alt-2]     1X2 oran çipleri (— yoksa)
 */

const API = import.meta.env.VITE_API_BASE_URL;

type Team = { name: string; logo?: string };
type Match = {
  id: string;
  league: string;
  leagueLogo?: string;
  home: Team;
  away: Team;
  minute: number;           // 0 => başlamamış
  scoreH: number;
  scoreA: number;
  kickoff?: string;         // ISO (upcoming için)
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
    timer = window.setInterval(load, 30000); // 30 sn
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
        <CarouselSection
          title="YAKINDA POPÜLER MAÇLAR"
          subtitle="15 gün içinde"
          items={upcoming}
          trackSpeed="50s"
        />
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

  return (
    <a
      className={`card ${isLive ? "live" : "prematch"}`}
      href="#"
      onClick={(e) => e.preventDefault()}
      title={`${m.league} • ${m.home.name} vs ${m.away.name}`}
    >
      {/* üst satır */}
      <div className="top">
        <div className="league">
          {m.leagueLogo ? <img className="lgLogo" src={m.leagueLogo} alt="" /> : null}
          <span className="lg">{m.league}</span>
        </div>
        <div className="min">
          {isLive ? (
            <>
              <span className="dot" />
              {m.minute}'
            </>
          ) : m.kickoff ? (
            <Countdown iso={m.kickoff} />
          ) : (
            <span className="badge">MAÇ ÖNÜ</span>
          )}
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

      {/* xG skorun ALTINDA */}
      <div className="xg">
        <span className="xgLabel">xG</span>
        <span className="xgVal">{formatXG(m.xgH)}</span>
        <span className="xgSep">:</span>
        <span className="xgVal">{formatXG(m.xgA)}</span>
      </div>

      {/* Oran çipleri (1X2) – yoksa "-" */}
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
      <span className="ov">{has ? value.toFixed(2) : "—"}</span>
    </span>
  );
}

/* Geri sayım chip (T- HH:MM:SS, 0 veya geçmişse “BAŞLIYOR”) */
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
  return <span className="badge cnt">{label}</span>;
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

/* -------------------- Enrichment -------------------- */
async function enrichMany(list: Match[]): Promise<Enriched[]> {
  const out: Enriched[] = [];
  const batchSize = 4;

  for (let i = 0; i < list.length; i += batchSize) {
    const batch = list.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (m) => {
        const [xg, odds] = await Promise.all([fetchXG(m.id), fetchOdds(m.id, m.minute)]);
        return { ...m, xgH: xg?.xgH ?? 0, xgA: xg?.xgA ?? 0, odds } as Enriched;
      })
    );
    out.push(...results);
  }
  return out;
}

async function fetchXG(fixtureId: string) {
  try {
    const r = await fetch(`${API}/api/live/stats?fixture=${fixtureId}`);
    if (!r.ok) return null;
    return (await r.json()) as { xgH: number; xgA: number };
  } catch {
    return null;
  }
}
async function fetchOdds(fixtureId: string, minute: number) {
  try {
    const r = await fetch(`${API}/api/live/odds?fixture=${fixtureId}&market=1&minute=${minute}`);
    if (!r.ok) return undefined;
    const js = (await r.json()) as Odds;
    return {
      H: isFiniteNum(js?.H) ? js.H : undefined,
      D: isFiniteNum(js?.D) ? js.D : undefined,
      A: isFiniteNum(js?.A) ? js.A : undefined,
    };
  } catch {
    return undefined;
  }
}
function isFiniteNum(n: any): n is number {
  return typeof n === "number" && Number.isFinite(n);
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
  display:inline-flex;gap:12px;padding:10px 6px;animation:marq var(--dur, 45s) linear infinite;
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

.min{display:inline-flex;align-items:center;gap:6px;color:#9ccaf7;font-size:12px}
.min .dot{width:6px;height:6px;border-radius:999px;background:var(--red);box-shadow:0 0 10px rgba(255,42,42,.9)}
.badge{display:inline-block;padding:2px 6px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#e8efff;font-size:11px}
.badge.cnt{background:rgba(0,229,255,.08);border-color:rgba(0,229,255,.25);color:#ccfaff}

.teams{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center}
.side{display:flex;align-items:center;gap:6px;min-width:0}
.side.right{justify-content:flex-end}
.name{color:#dfe8ff;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.score{display:flex;align-items:center;gap:6px;font-weight:900;font-size:16px}
.score .h{color:#aef4ff}
.score .a{color:#ffdede}
.score .sep{opacity:.7}

/* xG satırı */
.xg{
  display:flex;align-items:center;gap:6px;font-weight:900;color:#ffe3e3;
  background:rgba(255,42,42,.12);border:1px solid rgba(255,42,42,.25);
  padding:4px 8px;border-radius:10px;width:max-content
}
.xgLabel{font-size:11px;letter-spacing:.4px;opacity:.9}
.xgVal{font-size:13px}
.xgSep{opacity:.7}

/* odds row */
.odds{display:flex;gap:6px;margin-top:2px}
.odd{
  display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;
  background:rgba(0,229,255,.08); border:1px solid rgba(0,229,255,.25); color:#ccfaff; font-size:12px
}
.odd.muted{opacity:.55}
.ol{font-weight:900}
.ov{font-weight:700}

/* avatar / logo */
.ava{
  display:inline-grid;place-items:center;width:22px;height:22px;border-radius:999px;
  font-size:10px;font-weight:900;color:#001018;
  box-shadow:0 0 0 1px rgba(255,255,255,.15),0 6px 14px rgba(0,0,0,.25)
}
.ava.img{background:#0c1224;object-fit:cover}

@media(max-width:420px){
  .card{min-width:220px;max-width:220px}
}
`;
