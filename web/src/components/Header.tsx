// web/src/components/Hero.tsx
import { useEffect, useRef, useState } from "react";

/**
 * HERO (rev2)
 * - SOL: otomatik kayan banner (backend aynen)
 * - SAĞ: üç metrik aynı tipografi ve boyda; son 3 basamak ÖZEL DEĞİL → düz metin
 * - Artış: her 10 dakikada bir hedef belirlenir (rastgele +10 ile +300 arası)
 *   ve değerler o hedefe doğru akıcı şekilde yükselir (geri düşmez).
 * - Backend uçları KORUNDU: /api/home/banners ve /api/home/stats
 */

const API = import.meta.env.VITE_API_BASE_URL;

type HeroStats = {
  total_min: number; total_max: number;
  dist_min:  number; dist_max:  number;
  part_min:  number; part_max:  number;
};
type Banner = { id: string|number; image_url: string };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp  = (a: number, b: number, t: number)   => a + (b - a) * t;
const fmtTR = new Intl.NumberFormat("tr-TR");

export default function Hero() {
  const [slides, setSlides] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);

  // min/max aralıkları (backendten gelir)
  const [ranges, setRanges] = useState<HeroStats>({
    total_min: 60_000_000, total_max: 95_000_000,
    dist_min:    200_000,  dist_max:   1_200_000,
    part_min:    300_000,  part_max:     800_000,
  });

  // değerler
  const [total, setTotal] = useState(72_000_000);
  const [dist,  setDist]  = useState(420_000);
  const [part,  setPart]  = useState(480_000);

  // SOL — bannerlar
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

  // Banner otomatik değişim
  useEffect(() => {
    if (!slides.length) return;
    const t = window.setInterval(() => setIdx(i => (i + 1) % slides.length), 6000);
    return () => window.clearInterval(t);
  }, [slides, idx]);

  // İLK yükleme: min/max al
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
          // başlangıçları ortadan ver
          setTotal(lerp(merged.total_min, merged.total_max, 0.5));
          setDist (lerp(merged.dist_min,  merged.dist_max,  0.5));
          setPart (lerp(merged.part_min,  merged.part_max,  0.5));
        }
      } catch { /* sessiz fallback */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * — Artış mantığı —
   * Her 10 dakikada bir (600_000 ms) yeni bir hedef seç:
   * hedef = clamp(şu anki + rand(10..300), min, max)
   * Sonra her ~1s küçük adımlarla hedefe doğru ilerle (akıcı).
   * Not: max'a ulaşınca bekler; bir sonraki 10 dakikada yine artış denemesi yapılır.
   */
  useIncrementTowardsTarget({
    value: total,
    setValue: setTotal,
    min: ranges.total_min, max: ranges.total_max,
  });
  useIncrementTowardsTarget({
    value: dist,
    setValue: setDist,
    min: ranges.dist_min, max: ranges.dist_max,
  });
  useIncrementTowardsTarget({
    value: part,
    setValue: setPart,
    min: ranges.part_min, max: ranges.part_max,
  });

  return (
    <section className="hero-prem" aria-label="Hero alanı">
      {/* SOL — Banner */}
      <div className="hp-left">
        {slides.map((b, i) => (
          <div
            key={b.id}
            className={`hp-bg ${i === idx ? "active" : ""}`}
            style={{ ["--img" as any]: `url('${b.image_url}')` }}
          />
        ))}
        <div className="hp-shade"/>
        <div className="hp-edge" />
      </div>

      {/* SAĞ — Metrikler (eşit satırlar; son 3 basamak özel değil) */}
      <div className="hp-right">
        <Metric label="Toplam Ödül" value={total} suffix="₺" tone="gold" />
        <Metric label="Dağıtılan Ödül" value={dist} suffix="₺" tone="aqua" />
        <Metric label="Katılımcı" value={part} suffix=""    tone="vio" />
      </div>

      <style>{css}</style>
    </section>
  );
}

/* -------------------- ARTIRIM HOOK'U -------------------- */
function useIncrementTowardsTarget({
  value, setValue, min, max,
}: { value: number; setValue: (n: number) => void; min: number; max: number }) {
  const targetRef = useRef<number>(value);
  const lastPlanRef = useRef<number>(Date.now());
  const plannerMs = 600_000; // 10 dakika
  const stepTimerRef = useRef<number | null>(null);

  // Planner: her 10 dk yeni hedef seç
  useEffect(() => {
    function plan() {
      const now = Date.now();
      const since = now - lastPlanRef.current;
      if (since >= plannerMs || targetRef.current <= value + 0.5) {
        const inc = 10 + Math.floor(Math.random() * 291); // 10..300
        const next = clamp(value + inc, min, max);
        targetRef.current = next;
        lastPlanRef.current = now;
      }
    }
    const planId = window.setInterval(plan, 5_000); // 5 sn'de bir kontrol et
    plan(); // hemen bir kere
    return () => clearInterval(planId);
  }, [value, min, max]);

  // Akıcı artış: ~1 sn aralıkla hedefe yaklaş
  useEffect(() => {
    if (stepTimerRef.current) window.clearInterval(stepTimerRef.current);
    stepTimerRef.current = window.setInterval(() => {
      const tgt = targetRef.current;
      if (value >= tgt) return;
      // kalan mesafeye göre dinamik küçük adım
      const remain = tgt - value;
      const step = Math.max(1, Math.ceil(remain * 0.08)); // %8 yaklaşım (min 1)
      setValue(clamp(value + step, min, tgt));
    }, 1000);
    return () => {
      if (stepTimerRef.current) window.clearInterval(stepTimerRef.current);
    };
  }, [value, min, setValue]);
}

/* -------------------- METRİK BLOĞU (düz sayı) -------------------- */
function Metric({ label, value, suffix, tone }:{
  label: string; value: number; suffix: string; tone: "gold"|"aqua"|"vio"
}) {
  return (
    <div className={`mtr ${tone}`} title={`${label}: ${fmtTR.format(Math.floor(value))}${suffix ? " " + suffix : ""}`}>
      <div className="mtr-head">
        <span className="dot" aria-hidden />
        <span className="lbl">{label}</span>
      </div>
      <div className="mtr-val">
        <span className="num">{fmtTR.format(Math.floor(value))}</span>
        {suffix && <span className="suf"> {suffix}</span>}
      </div>
    </div>
  );
}

/* ---- Fallback görseller ---- */
const FALLBACKS = [
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518609571773-39b7d303a87b?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559703248-dcaaec9fab78?q=80&w=2000&auto=format&fit=crop",
];

/* -------------------- STİL -------------------- */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;800;900&display=swap');

:root {
  --hp-card: #0f1524;
  --hp-brd: rgba(255,255,255,.08);

  --hp-gold: #ffd057;
  --hp-aqua: #3be2ff;
  --hp-vio:  #b08cff;

  --hp-text: #e8f1ff;
  --hp-muted:#9ab0c9;

  --hp-r: 18px;
  --hp-shadow: 0 10px 40px rgba(0,0,0,.35);
}

/* Kapsayıcı */
.hero-prem{
  display:grid;
  grid-template-columns: 1.1fr .9fr;
  gap:14px;
  min-height: 340px;
  border-radius: var(--hp-r);
  position: relative;
  isolation: isolate;
  font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
}
@media (max-width: 900px){
  .hero-prem{ grid-template-columns: 1fr; min-height: 560px; }
}

/* SOL — Banner */
.hp-left{
  position:relative;
  min-height: 280px;
  border-radius: calc(var(--hp-r) - 2px);
  overflow:hidden;
  background: #0b1020;
  box-shadow: var(--hp-shadow);
}
.hp-bg{
  position:absolute; inset:0;
  background-image: var(--img);
  background-position: center;
  background-size: cover;
  opacity: 0;
  transform: scale(1.05);
  filter: saturate(1) brightness(.9) contrast(1.02);
  transition: opacity 700ms ease, transform 900ms ease, filter 900ms ease;
  will-change: opacity, transform, filter;
}
.hp-bg.active{
  opacity: 1;
  transform: scale(1.015);
  filter: saturate(1.05) brightness(1) contrast(1.05);
}
.hp-shade{
  position:absolute; inset:0;
  background:
    radial-gradient(80% 60% at 70% 20%, rgba(0,0,0,.15) 0%, rgba(0,0,0,0) 60%),
    linear-gradient(180deg, rgba(6,10,22,.10), rgba(6,10,22,.86) 68%, rgba(6,10,22,.92));
  pointer-events:none;
}
.hp-edge{
  position:absolute; inset:0;
  border: 1px solid var(--hp-brd);
  border-radius: calc(var(--hp-r) - 2px);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.04);
  pointer-events:none;
}

/* SAĞ — Metrikler: 3 eşit satır */
.hp-right{
  display:grid;
  grid-template-rows: 1fr 1fr 1fr;
  gap:10px;
  min-height: 100%;
}

/* Metrik kart */
.mtr{
  position: relative;
  display:flex;
  flex-direction:column;
  justify-content: center;
  gap:10px;
  padding: 16px 18px;
  background:
    linear-gradient(180deg, rgba(15,21,36,.92), rgba(15,21,36,.70)),
    radial-gradient(120% 120% at -10% -10%, rgba(255,255,255,.06), rgba(255,255,255,0));
  border-radius: 14px;
  box-shadow: var(--hp-shadow);
  outline: 1px solid rgba(255,255,255,.06);
  overflow: hidden;
}
.mtr::after{
  content:"";
  position:absolute; inset:0;
  border-radius: 14px;
  pointer-events:none;
  background:
    linear-gradient(90deg, rgba(255,255,255,.10), rgba(255,255,255,0) 40%) top left / 100% 1px no-repeat,
    linear-gradient(0deg, rgba(255,255,255,.10), rgba(255,255,255,0) 40%) top left / 1px 100% no-repeat;
  opacity: .5;
}

.mtr-head{
  display:flex; align-items:center; gap:10px;
  letter-spacing:.4px;
}
.mtr-head .dot{
  width:8px; height:8px; border-radius:50%;
  background: currentColor;
  filter: drop-shadow(0 0 6px currentColor);
  opacity:.9;
}
.mtr .lbl{
  color: var(--hp-muted);
  font-size: clamp(12px, 1.5vw, 14px);
  text-transform: uppercase;
}

/* Değer alanı — düz metin, son 3 basamak ÖZEL DEĞİL */
.mtr-val{
  display:flex; align-items:flex-end; gap:6px; flex-wrap:wrap;
  color: var(--hp-text);
  font-weight: 900;
  font-variant-numeric: tabular-nums lining-nums; /* sabit genişlikli rakam */
  font-feature-settings: "tnum" 1, "lnum" 1;
  line-height: 1;
  font-size: clamp(32px, 5.4vw, 48px);
  text-shadow: 0 0 22px rgba(59,226,255,.18);
}
.mtr.gold .mtr-val{ text-shadow: 0 0 22px rgba(255,208,87,.24); color: #fff7e0; }
.mtr.aqua .mtr-val{ text-shadow: 0 0 22px rgba(59,226,255,.22); color: #e9fbff; }
.mtr.vio  .mtr-val{ text-shadow: 0 0 22px rgba(176,140,255,.22); color: #f1e9ff; }

.num{
  letter-spacing:.4px;
}
.suf{
  font-size: .52em;
  opacity:.96;
  margin-left: 2px;
  padding-bottom: 2px;
}

@media (max-width: 900px){
  .hp-right{ gap:8px; }
  .mtr{ padding: 12px 14px; }
}
`;
