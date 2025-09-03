// web/src/pages/AnaSayfaDemo.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * DEMO • Popüler Maçlar (Canlı & Yakında) – xG + Oranlar + Geri Sayım
 * Revizyon (overlap düzeltildi):
 *  - Header yok, sadece kart şeritleri
 *  - Arka plan: ÜLKE BAYRAĞI (leagueFlag) → okunabilirlik için koyu cam overlay
 *  - TAKIM BLOKLARI: Logo ÜSTTE, İsim ALTA (merkezde, kelimeye göre satır kırar)
 *  - SKOR: ortada, çerçevesiz, canlı renkler, büyük; golde kısa yeşil flash
 *  - Lig küçük görsel kaldırıldı (arka plan zaten bayrak); üstte sadece lig adı
 *  - xG / Oranlar yoksa çizilmez
 *  - Kart ölçüleri ve grid düzeni overlap yapmayacak şekilde ayarlandı
 */

const API = import.meta.env.VITE_API_BASE_URL;

type Team = { name: string; logo?: string };
type Match = {
  id: string;
  league: string;
  leagueLogo?: string;
  leagueFlag?: string;
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
    while (out.length < 5) out.push(...items);
    return out.slice(0, Math.max(out.length, 5));
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
      const t = setTimeout(() => setFlash(false), 1600);
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
      {/* Üst: Lig adı + dakika/geri sayım */}
      <div className="top">
        <div className="league">
          <span className="lg">{m.league}</span>
        </div>
        <div className="minText">{isLive ? `${m.minute}'` : m.kickoff ? <Countdown iso={m.kickoff} /> : "MAÇ ÖNÜ"}</div>
      </div>

      {/* Cam panel: overlap engellemek için tüm içerik burada */}
      <div className="glass">
        {/* 3 sütunlu düzen: Sol takım (logo üst, isim alt) — Skor — Sağ takım */}
        <div className="teams">
          <TeamCol name={m.home.name} logo={m.home.logo} />
          <CenterScore flash={flash} h={m.scoreH} a={m.scoreA} />
          <TeamCol name={m.away.name} logo={m.away.logo} right />
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
      </div>
    </a>
  );
}

function TeamCol({ name, logo, right = false }: { name: string; logo?: string; right?: boolean }) {
  return (
    <div className={`teamcol ${right ? "right" : ""}`}>
      <TeamLogo name={name} logo={logo} size={56} />
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

/* Geri sayım (T- HH:MM:SS) */
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

/* Logo varsa göster, kırık/boşsa avatar fallback */
function TeamLogo({ name, logo, size = 56 }: { name: string; logo?: string; size?: number }) {
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
    <span className="ava" style={{ width: size, height: size }}>
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
body{margin:0}
.demo{min-height:100vh;background:linear-gradient(180deg,var(--bg),var(--bg2))}

/* Bölüm başlıkları */
.liveWrap{max-width:1200px;margin:16px auto 0;padding:0 16px}
.liveHead{display:flex;align-items:center;gap:10px;color:#dfe8ff;margin:6px 0 8px}
.liveHead .led{width:8px;height:8px;border-radius:999px;background:#00ffa6;box-shadow:0 0 12px rgba(0,255,166,.9)}
.liveHead .title{font-weight:900;letter-spacing:.6px;font-size:13px}
.liveHead .sub{color:#9fb1cc;font-size:12px}

/* Kayan ray */
.rail{position:relative;overflow:hidden;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}
.track{display:inline-flex;gap:16px;padding:14px 6px;animation:marq var(--dur, 45s) linear infinite}
.rail:hover .track{animation-play-state:paused}
@keyframes marq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

/* Kart */
.card{
  position:relative; display:flex; flex-direction:column; gap:12px;
  min-width:380px; max-width:380px; padding:18px;
  color:#eaf2ff; text-decoration:none; overflow:hidden; border-radius:20px;
  background:linear-gradient(180deg, rgba(6,10,22,.85), rgba(6,12,24,.82));
  box-shadow:0 12px 20px rgba(0,0,0,.32);
  border:1px solid rgba(255,255,255,.10);
}
.card::before{
  content:""; position:absolute; inset:0;
  background-image:var(--bgimg); background-size:cover; background-position:center;
  filter:opacity(.55) saturate(1.15);
}
.card::after{
  content:""; position:absolute; inset:0;
  background:
    radial-gradient(60% 60% at 50% 0%, rgba(5,10,20,.65), transparent 60%),
    linear-gradient(180deg, rgba(5,10,20,.65) 10%, rgba(4,10,20,.78) 60%, rgba(6,12,24,.88) 100%);
  backdrop-filter: blur(4px);
}
.card > *{position:relative; z-index:1}
.card.goal{box-shadow:0 0 24px rgba(24,255,116,.25), 0 12px 20px rgba(0,0,0,.35)}

/* Üst satır: lig + dakika */
.top{display:flex;align-items:center;justify-content:space-between;min-height:28px}
.league{display:flex;align-items:center;gap:10px}
.lg{color:#e6f1ff;font-weight:800;font-size:15px;text-shadow:0 1px 8px rgba(0,0,0,.45)}
.minText{
  font-weight:900; font-size:22px; color:#ffd5d5;
  text-shadow:0 2px 14px rgba(0,0,0,.65);
}

/* İç cam panel */
.glass{
  display:flex; flex-direction:column; gap:12px;
  background:linear-gradient(180deg, rgba(10,16,28,.60), rgba(10,16,28,.45));
  border:1px solid rgba(255,255,255,.08);
  border-radius:16px; padding:14px; backdrop-filter: blur(6px);
}

/* Takım sütunları ve skor */
.teams{
  display:grid;
  grid-template-columns:1fr auto 1fr;
  gap:16px;
  align-items:center;
}
.teamcol{
  display:flex; flex-direction:column; align-items:center; gap:8px; min-width:0;
}
.teamcol.right{ align-items:center }
.tname{
  color:#eef4ff; font-size:16px; font-weight:800; text-align:center;
  white-space:normal; word-break:normal; overflow-wrap:break-word; line-height:1.25;
  max-height:3.8em; /* en fazla 3 satır */
}

.score{
  display:flex;align-items:center;gap:14px;
  font-weight:1000;font-size:38px; letter-spacing:.5px;
  color:#fff; text-shadow:
    0 0 10px rgba(255,255,255,.35),
    0 0 22px rgba(160,220,255,.30);
}
.score.pulse{
  animation:goalflash .22s ease-in-out 0s 8 alternate;
}
@keyframes goalflash{
  from{ text-shadow:0 0 18px rgba(24,255,116,.8), 0 0 30px rgba(24,255,116,.45); color:#eafff5 }
  to  { text-shadow:0 0 12px rgba(160,220,255,.3), 0 0 22px rgba(160,220,255,.25); color:#fff }
}
.score .sep{opacity:.95}
.score .h{color:#b9f0ff; text-shadow:0 0 18px rgba(120,220,255,.55)}
.score .a{color:#ffd9d9; text-shadow:0 0 18px rgba(255,120,120,.55)}

/* xG */
.xg{
  display:flex;align-items:center;gap:8px;font-weight:900;color:#ffe3e3;
  background:rgba(255,42,42,.08);border:1px solid rgba(255,42,42,.18);
  padding:8px 12px;border-radius:12px;width:max-content
}
.xgLabel{font-size:12px;letter-spacing:.4px;opacity:.9}
.xgVal{font-size:15px}
.xgSep{opacity:.7}

/* odds */
.odds{display:flex;gap:10px;flex-wrap:wrap}
.odd{
  display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;
  background:rgba(0,229,255,.12); border:1px solid rgba(0,229,255,.32); color:#ccfaff; font-size:13px
}
.ol{font-weight:900}
.ov{font-weight:800}

/* Logolar */
.ava{
  display:inline-grid;place-items:center;border-radius:999px;
  font-size:18px;font-weight:900;color:#001018;
  background:linear-gradient(180deg, rgba(255,255,255,.15), rgba(255,255,255,.05));
  box-shadow:0 10px 16px rgba(0,0,0,.25);
}
.ava.img{object-fit:cover;border:none;box-shadow:none;background:transparent}

/* Responsive */
@media(max-width:520px){
  .card{min-width:340px;max-width:340px}
  .minText{font-size:20px}
  .score{font-size:34px}
}
`;
