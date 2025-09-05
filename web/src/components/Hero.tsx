import { useEffect, useRef, useState } from "react";

/**
 * HERO — Sol: otomatik kayan banner • Sağ: metrik kartları (neon şerit + sağa hizalı sayı)
 * API:
 *  - GET  /api/home/banners  -> [{image_url}]
 *  - GET  /api/home/stats    -> { total_min/max, dist_min/max, part_min/max }
 * Görsel akış/istatistik mantığı aynen; sadece layout/stiller değişti.
 */

const API = import.meta.env.VITE_API_BASE_URL;

type HeroStats = {
  total_min: number; total_max: number;
  dist_min:  number; dist_max:  number;
  part_min:  number; part_max:  number;
};
type Banner = { id: string | number; image_url: string };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp  = (a: number, b: number, t: number)   => a + (b - a) * t;
const fmt   = (n: number) => new Intl.NumberFormat("tr-TR").format(Math.max(0, Math.floor(n)));

export default function Hero() {
  const [slides, setSlides] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);

  const [ranges, setRanges] = useState<HeroStats>({
    total_min: 60_000_000, total_max: 95_000_000,
    dist_min:    200_000,  dist_max:   1_200_000,
    part_min:    300_000,  part_max:     800_000,
  });

  const [total, setTotal] = useState(72_000_000);
  const [dist,  setDist]  = useState(420_000);
  const [part,  setPart]  = useState(480_000);

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
  }, [slides, idx]);

  /* ------- min/max + başlangıç ------- */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/api/home/stats`);
        if (r.ok) {
          const js: Partial<HeroStats> = await r.json();
          const merged: HeroStats = {
            total_min: js.total_min ?? ranges.total_min, total_max: js.total_max ?? ranges.total_max,
            dist_min:  js.dist_min  ?? ranges.dist_min,  dist_max:  js.dist_max  ?? ranges.dist_max,
            part_min:  js.part_min  ?? ranges.part_min,  part_max:  js.part_max  ?? ranges.part_max,
          };
          setRanges(merged);
          setTotal(lerp(merged.total_min, merged.total_max, 0.5));
          setDist (lerp(merged.dist_min,  merged.dist_max,  0.5));
          setPart (lerp(merged.part_min,  merged.part_max,  0.5));
        }
      } catch { /* sessiz fallback */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------- 10 dakikada tek adım artış (10..300) ------- */
  useTenMinuteIncrement(setTotal, ranges.total_min, ranges.total_max);
  useTenMinuteIncrement(setDist,  ranges.dist_min,  ranges.dist_max);
  useTenMinuteIncrement(setPart,  ranges.part_min,  ranges.part_max);

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

      {/* SAĞ — metrik kartları (neon bordürlü, sağa hizalı sayılar) */}
      <div className="right">
        <MetricCard tone="gold" label="Toplam Ödül" value={total} suffix=" ₺" />
        <MetricCard tone="aqua" label="Dağıtılan Ödül" value={dist} suffix=" ₺" />
        <MetricCard tone="vio"  label="Katılımcı" value={part} suffix="" />
      </div>

      <style>{css}</style>
    </section>
  );
}

/* ------- 10 dk artış ------- */
function useTenMinuteIncrement(
  setValue: (u: (prev: number) => number) => void,
  min: number,
  max: number
){
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const step = () => {
      const inc = 10 + Math.floor(Math.random() * 291); // 10..300
      setValue(prev => clamp(prev + inc, min, max));
    };
    timerRef.current = window.setInterval(step, 600_000); // 10 dk
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [min, max, setValue]);
}

/* ------- Metric Card ------- */
function MetricCard({
  label, value, suffix, tone
}: { label: string; value: number; suffix: string; tone: "gold"|"aqua"|"vio" }) {
  return (
    <div className={`mCard ${tone}`} title={`${label}: ${fmt(value)}${suffix}`}>
      {/* neon bordür */}
      <span className="neonBar top" aria-hidden />
      <span className="neonBar bot" aria-hidden />

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
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700;800;900&display=swap');

/* Oran: görsel biraz daha büyük */
.heroSplit{
  display:grid; grid-template-columns: 1.2fr .8fr; gap:14px;
  min-height:320px; border-radius:18px; overflow:hidden;
  font-family:'Poppins',system-ui,Segoe UI,Roboto,Arial,sans-serif;
}
@media(max-width:900px){
  .heroSplit{ grid-template-columns: 1fr; }
}

/* Sol banner */
.left{ position:relative; min-height:320px; border-radius:14px; overflow:hidden; }
.bg{
  position:absolute; inset:0; background-image:var(--img);
  background-size:cover; background-position:center;
  opacity:0; transform:scale(1.04); filter:blur(2px) brightness(.96);
  transition:opacity 800ms ease, transform 800ms ease, filter 800ms ease;
}
.bg.active{ opacity:1; transform:scale(1.01); filter:blur(0px) brightness(1) }
.shade{
  position:absolute; inset:0;
  background:linear-gradient(180deg, rgba(6,10,22,.18) 0%, rgba(6,10,22,.84) 66%, rgba(6,10,22,.92) 100%);
}

/* Sağ metrik sütunu */
.right{
  display:flex; flex-direction:column; justify-content:space-between; gap:12px;
  padding:6px 8px;
}

/* Metric Card (neon bordür + cam arka plan) */
.mCard{
  position:relative; border-radius:16px; overflow:hidden;
  background: linear-gradient(180deg, rgba(12,16,28,.55), rgba(12,16,28,.35));
  border:1px solid rgba(255,255,255,.10);
  box-shadow: 0 10px 26px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.04);
  padding:18px 16px;
}
/* üst/alt neon çizgi (tone’a göre) */
.mCard .neonBar{
  position:absolute; left:12px; right:12px; height:3px; border-radius:3px; filter:blur(.3px);
  background:linear-gradient(90deg, rgba(255,255,255,0), hsla(var(--tone,190),95%,60%,1), rgba(255,255,255,0));
}
.mCard .neonBar.top{ top:8px }
.mCard .neonBar.bot{ bottom:8px }

/* satır yerleşimi: metin solda, sayı sağda */
.mCard .row{
  display:flex; align-items:center; justify-content:space-between; gap:10px;
}
.mCard .lbl{
  font-size:clamp(12px,1.8vw,14px);
  letter-spacing:.6px; color:#a7bddb; text-transform:uppercase;
}
.mCard .val{
  display:flex; align-items:flex-end; flex-wrap:wrap; gap:4px;
  color:#e9fbff; font-weight:900; line-height:1.06;
  /* tek tip boyut – sağa hizalı büyük sayı */
  font-size: clamp(28px, 6vw, 46px);
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
  text-shadow:0 0 16px rgba(0,229,255,.30);
  justify-content:flex-end;
}
.mCard .val .num{ letter-spacing:.4px }
.mCard .val .suf{ font-size:.6em; opacity:.95; margin-left:2px }

/* ton renkleri */
.mCard.gold{ --tone: 48 }   /* altın */
.mCard.aqua{ --tone: 190 }  /* aqua */
.mCard.vio { --tone: 280 }  /* mor */

/* Küçük ekran */
@media(max-width:900px){
  .left{ min-height:280px }
  .mCard{ padding:14px 12px }
}
`;
/* ---- hooks ---- */
function useTenMinuteIncrement(
  setValue: (u: (prev: number) => number) => void,
  min: number,
  max: number
){
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const step = () => {
      const inc = 10 + Math.floor(Math.random() * 291);
      setValue(prev => clamp(prev + inc, min, max));
    };
    timerRef.current = window.setInterval(step, 600_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [min, max, setValue]);
}
