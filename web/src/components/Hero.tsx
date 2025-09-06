// web/src/components/Hero.tsx
import { useEffect, useState } from "react";

/**
 * HERO — Sol banner • Sağ: ödül odaklı premium metrikler
 * - Toplam Ödül kartı geniş; diğerleri kompakt
 * - Tek fetch, arka plan artış yok
 */

const API = import.meta.env.VITE_API_BASE_URL;

type HeroStats = {
  total_min: number; total_max: number;
  dist_min:  number; dist_max:  number;
  part_min:  number; part_max:  number;
};
type Banner = { id: string | number; image_url: string };

const fmt = (n: number) => new Intl.NumberFormat("tr-TR").format(Math.max(0, Math.floor(n)));

export default function Hero() {
  const [slides, setSlides] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);

  const [ranges, setRanges] = useState<HeroStats>({
    total_min: 60_000_000, total_max: 95_000_000,
    dist_min:    200_000,  dist_max:   1_200_000,
    part_min:    300_000,  part_max:     800_000,
  });

  // Gösterilecek sabit (tek fetch ile ayarlanan) değerler
  const [total, setTotal] = useState(78_500_000);
  const [dist,  setDist]  = useState(735_000);
  const [part,  setPart]  = useState(542_000);

  /* ------- Bannerlar ------- */
  useEffect(() => {
    fetch(`${API}/api/home/banners`)
      .then(r => r.json())
      .then(rows => {
        const arr = (Array.isArray(rows) ? rows : [])
          .map((b: any) => b?.image_url)
          .filter(Boolean);
        setSlides((arr.length ? arr : FALLBACKS).map((src, i) => ({ id: i, image_url: src })));
      })
      .catch(() => setSlides(FALLBACKS.map((src, i) => ({ id: i, image_url: src }))));
  }, []);

  useEffect(() => {
    if (!slides.length) return;
    const t = window.setInterval(() => setIdx(i => (i + 1) % slides.length), 6000);
    return () => window.clearInterval(t);
  }, [slides.length]);

  /* ------- Stats (tek sefer) ------- */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/api/home/stats`, { cache: "no-store" });
        if (!r.ok) return;
        const js: Partial<HeroStats> = await r.json();
        const merged: HeroStats = {
          total_min: js.total_min ?? ranges.total_min, total_max: js.total_max ?? ranges.total_max,
          dist_min:  js.dist_min  ?? ranges.dist_min,  dist_max:  js.dist_max  ?? ranges.dist_max,
          part_min:  js.part_min  ?? ranges.part_min,  part_max:  js.part_max  ?? ranges.part_max,
        };
        setRanges(merged);
        const pick = (a: number, b: number) => Math.round((a + 0.62 * (b - a)) / 1000) * 1000; // WHY: göze hoş midpoint
        setTotal(pick(merged.total_min, merged.total_max));
        setDist (pick(merged.dist_min,  merged.dist_max));
        setPart (pick(merged.part_min,  merged.part_max));
      } catch { /* sessiz */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = (v: number, min: number, max: number) => {
    if (max <= min) return 0.5;
    const t = (v - min) / (max - min);
    return Math.max(0.08, Math.min(0.98, t));
  };

  return (
    <section className="heroWrap" aria-label="Hero alanı">
      {/* SOL — Banner */}
      <div className="heroLeft">
        {slides.map((b, i) => (
          <div
            key={b.id}
            className={`bg ${i === idx ? "active" : ""}`}
            style={{ ["--img" as any]: `url('${b.image_url}')` }}
          />
        ))}
        <div className="shade" />
      </div>

      {/* SAĞ — Ödül odaklı metrikler */}
      <div className="heroRight">
        {/* Geniş: Toplam Ödül */}
        <MetricCard
          variant="wide"
          tone="gold"
          icon="trophy"
          label="Toplam Ödül"
          value={total}
          suffix=" ₺"
          percent={pct(total, ranges.total_min, ranges.total_max)}
        />
        {/* Kompakt iki kart */}
        <MetricCard
          variant="compact"
          tone="aqua"
          icon="gift"
          label="Dağıtılan Ödül"
          value={dist}
          suffix=" ₺"
          percent={pct(dist, ranges.dist_min, ranges.dist_max)}
        />
        <MetricCard
          variant="compact"
          tone="vio"
          icon="users"
          label="Katılımcı"
          value={part}
          suffix=""
          percent={pct(part, ranges.part_min, ranges.part_max)}
        />
      </div>

      <style>{css}</style>
    </section>
  );
}

/* ------- Metric Card ------- */
function MetricCard({
  variant, tone, icon, label, value, suffix, percent
}: {
  variant: "wide" | "compact";
  tone: "gold" | "aqua" | "vio";
  icon: "trophy" | "gift" | "users";
  label: string; value: number; suffix: string; percent: number;
}) {
  const iconPath =
    icon === "trophy" ? "M8 3h8a1 1 0 0 1 1 1v1h2a2 2 0 0 1 0 4h-1.1A6.01 6.01 0 0 1 13 13v2h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2a6.01 6.01 0 0 1-4.9-4H5a2 2 0 1 1 0-4h2V4a1 1 0 0 1 1-1Z"
    : icon === "gift" ? "M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8h16Zm2-4h-5.17a3 3 0 1 0-3.66-3.66V4h-2.34V4.34A3 3 0 1 0 7.17 8H2v2h20V8ZM11 12v10h2V12h-2Z"
    : "M16 13a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-7 6a5 5 0 0 0-5 5v1h16v-1a5 5 0 0 0-5-5H9Z";

  return (
    <div className={`statCard ${variant} ${tone}`} title={`${label}: ${fmt(value)}${suffix}`}>
      {/* Cam + dış aura */}
      <span className="edge" aria-hidden />

      {/* Başlık satırı */}
      <div className="head">
        <div className="icoWrap" aria-hidden>
          <span className="icoRing" />
          <svg viewBox="0 0 24 24" className="ico"><path fill="currentColor" d={iconPath}/></svg>
        </div>
        <div className="headText">
          <div className="label">{label}</div>
          <div className="value">
            <span className="num">{fmt(value)}</span>
            <span className="suf">{suffix}</span>
          </div>
        </div>
      </div>

      {/* İnce neon progress */}
      <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent*100)}>
        <span className="track" />
        <span className="fill" style={{ width: `${Math.round(percent * 100)}%` }} />
      </div>
    </div>
  );
}

/* ------- Fallback görseller ------- */
const FALLBACKS = [
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518609571773-39b7d303a87b?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559703248-dcaaec9fab78?q=80&w=2000&auto=format&fit=crop",
];

/* ------- Stil ------- */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800;900&display=swap');

.heroWrap{
  display:grid; grid-template-columns: 1.25fr .75fr; gap:16px;
  min-height:330px; border-radius:18px; overflow:hidden;
  font-family:'Poppins',system-ui,Segoe UI,Roboto,Arial,sans-serif;
}
@media(max-width:1060px){ .heroWrap{ grid-template-columns:1fr } }

/* SOL — Banner */
.heroLeft{ position:relative; min-height:330px; border-radius:16px; overflow:hidden; }
.bg{
  position:absolute; inset:0; background-image:var(--img);
  background-size:cover; background-position:center;
  opacity:0; transform:scale(1.06); filter:brightness(.9) contrast(1.02);
  transition:opacity .8s ease, transform .8s ease, filter .8s ease;
}
.bg.active{ opacity:1; transform:scale(1.02); filter:brightness(1) }
.shade{
  position:absolute; inset:0; pointer-events:none;
  background:
    radial-gradient(130% 90% at 90% 10%, rgba(6,10,22,0), rgba(6,10,22,.55) 70%),
    linear-gradient(180deg, rgba(6,10,22,.08) 0%, rgba(6,10,22,.84) 66%, rgba(6,10,22,.92) 100%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.045);
}

/* SAĞ — Ödül odaklı grid */
.heroRight{
  display:grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto auto;
  gap:14px;
}
@media(min-width:1060px){
  .heroRight{
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: 1fr;
    grid-template-areas:
      "wide wide"
      "c1   c2";
  }
}
.statCard{ position:relative; border-radius:16px; padding:16px; overflow:hidden;
  background:linear-gradient(180deg, rgba(18,24,40,.58), rgba(14,20,36,.38));
  border:1px solid rgba(255,255,255,.10);
  box-shadow:0 18px 34px rgba(0,0,0,.42), inset 0 0 0 1px rgba(255,255,255,.04);
  isolation:isolate;
}
.statCard.wide{ grid-area: wide; padding:18px 18px 16px }
.statCard.compact{ }
.statCard.gold{ --t1:#f7c948; --t2:#f59e0b; --txt:#fff }
.statCard.aqua{ --t1:#06d6ff; --t2:#118ab2; --txt:#eaffff }
.statCard.vio { --t1:#bb86fc; --t2:#7c3aed; --txt:#f3e8ff }

/* Dış aura */
.statCard .edge{
  position:absolute; inset:-2px; border-radius:18px; z-index:0; pointer-events:none;
  background:
    radial-gradient(140% 90% at 50% -20%, color-mix(in oklab, var(--t1) 70%, transparent), transparent 60%),
    radial-gradient(140% 90% at 50% 120%, color-mix(in oklab, var(--t2) 55%, transparent), transparent 60%);
  filter: blur(12px);
}

/* Başlık satırı */
.statCard .head{ position:relative; z-index:2; display:flex; align-items:center; gap:12px }
.statCard .icoWrap{
  position:relative; width:42px; height:42px; border-radius:999px; flex:0 0 42px;
  display:grid; place-items:center; color:#0b0f1a;
  background:linear-gradient(180deg, var(--t1), var(--t2));
  box-shadow:0 10px 22px color-mix(in oklab, var(--t1) 40%, transparent);
}
.statCard .icoWrap .icoRing{
  content:""; position:absolute; inset:-3px; border-radius:999px;
  background:conic-gradient(from 0deg, var(--t1), var(--t2), var(--t1));
  filter: blur(8px); opacity:.55; animation:ring 4s linear infinite;
}
@keyframes ring{ to { transform: rotate(360deg) } }
.statCard .ico{ width:22px; height:22px; z-index:1; color:#051018 }

/* Metinler */
.statCard .headText{ display:flex; align-items:baseline; justify-content:space-between; width:100% }
.statCard .label{
  font-size:12px; letter-spacing:.8px; color:#cfe1ff; text-transform:uppercase; opacity:.95
}
.statCard .value{
  display:flex; align-items:baseline; gap:6px; color:var(--txt);
  font-family:'Orbitron', monospace;
  font-weight:900; line-height:1;
  font-size: clamp(22px, 4.4vw, 36px);
  text-shadow:0 0 10px color-mix(in oklab, var(--t1) 35%, transparent);
}
.statCard .value .suf{ font-size:.58em; opacity:.9 }

/* İnce neon progress */
.statCard .meter{ position:relative; margin-top:10px; height:10px }
.statCard.wide .meter{ height:12px }
.statCard .meter .track{
  position:absolute; inset:0; border-radius:999px;
  background:linear-gradient(180deg, rgba(10,15,28,.65), rgba(10,15,28,.9));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), inset 0 6px 16px rgba(0,0,0,.45);
}
.statCard .meter .fill{
  position:absolute; left:0; top:0; bottom:0; border-radius:999px;
  background:linear-gradient(90deg, var(--t1), var(--t2), var(--t1));
  box-shadow:0 0 20px color-mix(in oklab, var(--t1) 60%, transparent);
  transition: width .7s cubic-bezier(.22,.61,.36,1);
}

/* Responsive küçük düzeltmeler */
@media(max-width:1060px){
  .heroLeft{ min-height:280px }
  .statCard .icoWrap{ width:38px; height:38px; flex-basis:38px }
  .statCard .ico{ width:20px; height:20px }
  .statCard .value{ font-size: clamp(20px, 5.4vw, 32px) }
}
`;
