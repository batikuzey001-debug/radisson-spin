// web/src/components/Hero.tsx
import { useEffect, useState } from "react";

/**
 * HERO — Sol: otomatik kayan banner • Sağ: premium neon metrik kartları
 * API:
 *  - GET  /api/home/banners  -> [{image_url}]
 *  - GET  /api/home/stats    -> { total_min/max, dist_min/max, part_min/max }
 * Neden: Arkaplanda artış scripti kaldırıldı; değerler tek sefer çekilip gösterilir.
 */

const API = import.meta.env.VITE_API_BASE_URL;

type HeroStats = {
  total_min: number; total_max: number;
  dist_min:  number; dist_max:  number;
  part_min:  number; part_max:  number;
};
type Banner = { id: string | number; image_url: string };

const fmt = (n: number) =>
  new Intl.NumberFormat("tr-TR").format(Math.max(0, Math.floor(n)));

export default function Hero() {
  const [slides, setSlides] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);

  const [ranges, setRanges] = useState<HeroStats>({
    total_min: 60_000_000, total_max: 95_000_000,
    dist_min:    200_000,  dist_max:   1_200_000,
    part_min:    300_000,  part_max:     800_000,
  });

  // Gösterilecek “sabit” değerler (nice midpoint)
  const [total, setTotal] = useState(78_500_000);
  const [dist,  setDist]  = useState(735_000);
  const [part,  setPart]  = useState(542_000);

  /* ------- sol: bannerlar ------- */
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

  /* ------- istatistikler (tek sefer) ------- */
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

        // Neden: Sabit ama “güzel” değer — min/max arası altın oran (~0.62) ve yuvarlama
        const pick = (a: number, b: number) => Math.round((a + 0.62 * (b - a)) / 1000) * 1000;
        setTotal(pick(merged.total_min, merged.total_max));
        setDist (pick(merged.dist_min,  merged.dist_max));
        setPart (pick(merged.part_min,  merged.part_max));
      } catch { /* sessiz */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Progress yüzdeleri (sadece görsel)
  const pct = (v: number, min: number, max: number) => {
    if (max <= min) return 0.5;
    const t = (v - min) / (max - min);
    return Math.max(0.05, Math.min(0.98, t));
  };

  return (
    <section className="heroSplit" aria-label="Hero alanı">
      {/* SOL — banner */}
      <div className="left">
        {slides.map((b, i) => (
          <div
            key={b.id}
            className={`bg ${i === idx ? "active" : ""}`}
            style={{ ["--img" as any]: `url('${b.image_url}')` }}
          />
        ))}
        <div className="shade" />
      </div>

      {/* SAĞ — premium neon metrik kartları */}
      <div className="right">
        <MetricCard
          tone="gold"
          label="Toplam Ödül"
          value={total}
          suffix=" ₺"
          percent={pct(total, ranges.total_min, ranges.total_max)}
        />
        <MetricCard
          tone="aqua"
          label="Dağıtılan Ödül"
          value={dist}
          suffix=" ₺"
          percent={pct(dist, ranges.dist_min, ranges.dist_max)}
        />
        <MetricCard
          tone="vio"
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
  label, value, suffix, percent, tone
}: {
  label: string; value: number; suffix: string; percent: number; tone: "gold"|"aqua"|"vio";
}) {
  return (
    <div className={`mCard ${tone}`} title={`${label}: ${fmt(value)}${suffix}`}>
      {/* LED cam çerçeve */}
      <span className="edge" aria-hidden />

      {/* Bar track + fill */}
      <div className="bar">
        <span className="fill" style={{ width: `${Math.round(percent * 100)}%` }} />
        <span className="spark" />
      </div>

      {/* İçerik */}
      <div className="row">
        <div className="lbl">{label}</div>
        <div className="val">
          <span className="num">{fmt(value)}</span>
          <span className="suf">{suffix}</span>
        </div>
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

.heroSplit{
  display:grid; grid-template-columns: 1.25fr .75fr; gap:14px;
  min-height:320px; border-radius:18px; overflow:hidden;
  font-family:'Poppins',system-ui,Segoe UI,Roboto,Arial,sans-serif;
}
@media(max-width:900px){ .heroSplit{ grid-template-columns:1fr } }

/* Sol banner */
.left{ position:relative; min-height:320px; border-radius:14px; overflow:hidden; }
.bg{
  position:absolute; inset:0; background-image:var(--img);
  background-size:cover; background-position:center;
  opacity:0; transform:scale(1.06); filter:brightness(.92) contrast(1.02);
  transition:opacity .8s ease, transform .8s ease, filter .8s ease;
}
.bg.active{ opacity:1; transform:scale(1.02); filter:brightness(1) }
.shade{
  position:absolute; inset:0; pointer-events:none;
  background:
    radial-gradient(120% 80% at 100% 10%, rgba(5,10,22,.0), rgba(5,10,22,.55) 70%),
    linear-gradient(180deg, rgba(6,10,22,.10) 0%, rgba(6,10,22,.84) 66%, rgba(6,10,22,.92) 100%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.04);
}

/* Sağ metrik sütunu */
.right{ display:flex; flex-direction:column; gap:14px; }

/* Premium Neon Metric */
.mCard{
  --tone: 190;
  position:relative; border-radius:16px; overflow:hidden;
  background: linear-gradient(180deg, rgba(18,24,42,.58), rgba(14,20,38,.38));
  border:1px solid rgba(255,255,255,.10);
  box-shadow:
    0 16px 30px rgba(0,0,0,.40),
    inset 0 0 0 1px rgba(255,255,255,.04);
  padding:14px 14px 16px;
  isolation:isolate;
}
.mCard.gold{ --tone: 48 }   /* amber */
.mCard.aqua{ --tone: 190 }  /* aqua  */
.mCard.vio { --tone: 280 }  /* violet*/

/* Dış aura + cam */
.mCard .edge{
  position:absolute; inset:-1px; border-radius:18px; z-index:0;
  background:
    radial-gradient(140% 90% at 50% -20%, hsla(var(--tone),95%,60%,.35), transparent 60%),
    radial-gradient(140% 90% at 50% 120%, hsla(var(--tone),95%,55%,.28), transparent 60%);
  filter: blur(12px);
  pointer-events:none;
}

/* Bar */
.mCard .bar{
  position:relative; height:16px; border-radius:999px;
  background:linear-gradient(180deg, rgba(9,13,24,.65), rgba(9,13,24,.85));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), inset 0 6px 16px rgba(0,0,0,.45);
  overflow:hidden; margin-bottom:12px;
}
.mCard .bar .fill{
  position:absolute; left:0; top:0; bottom:0;
  background:linear-gradient(90deg,
    hsla(var(--tone),95%,70%,1),
    hsla(var(--tone),95%,60%,1),
    hsla(var(--tone),95%,72%,1));
  box-shadow:0 0 20px hsla(var(--tone),95%,60%,.65), 0 0 36px hsla(var(--tone),95%,60%,.35);
  transition:width .6s cubic-bezier(.22,.61,.36,1);
}
.mCard .bar .spark{
  position:absolute; top:1px; bottom:1px; left:0; width:38px; border-radius:999px;
  background:linear-gradient(90deg, rgba(255,255,255,.0), rgba(255,255,255,.85), rgba(255,255,255,0));
  filter:blur(.6px); mix-blend-mode:screen; pointer-events:none;
  animation:spark 2.4s linear infinite;
}
@keyframes spark{
  0%{ transform:translateX(0) }
  100%{ transform:translateX(260px) }
}

/* İçerik */
.mCard .row{
  display:flex; align-items:flex-end; justify-content:space-between; gap:10px;
}
.mCard .lbl{
  font-size:12px; letter-spacing:.8px; color:#cfe1ff; text-transform:uppercase;
  opacity:.95;
}
.mCard .val{
  display:flex; align-items:baseline; gap:6px;
  color:#e9fbff; font-weight:900; line-height:1;
  font-size: clamp(20px, 4.8vw, 32px);   /* daha küçük ve dengeli */
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
  text-shadow:0 0 10px rgba(0,229,255,.22);
  font-family:'Orbitron', monospace;     /* sadece sayı hissi */
}
.mCard .val .num{ letter-spacing:.4px }
.mCard .val .suf{ font-size:.58em; opacity:.9; margin-left:2px }

@media(max-width:900px){
  .left{ min-height:280px }
  .mCard{ padding:12px 12px 14px }
  .mCard .bar{ height:14px; margin-bottom:10px }
}
`;
