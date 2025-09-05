// web/src/components/Hero.tsx
import { useEffect, useRef, useState } from "react";

/**
 * HERO (revamp)
 * - SOL: otomatik kayan banner (gösterge yok)
 * - SAĞ: üç metrik aynı görsel ağırlıkta, eşit yükseklikte grid satırlarıyla alanı doldurur
 * - Tipografi tek ve tutarlı; tüm rakamlarda tabular-nums → boy farkı ve zıplama yok
 * - Yalnız son 3 basamak "ileri yönde dijital roll" animasyonu (taşıma hissi, hafif motion-blur)
 * - Backend uçları değişmedi: /api/home/banners ve /api/home/stats
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
const fmt   = (n: number) => new Intl.NumberFormat("tr-TR").format(Math.max(0, Math.floor(n)));

function splitLast3(n: number) {
  const s = fmt(n);
  const digits = s.replace(/\./g, "");
  const suffix3 = digits.slice(-3) || "000";
  const prefixDigits = digits.slice(0, Math.max(0, digits.length - 3));
  // Prefix boşsa 0 gösterme; görsel tutarlılık için lidersiz yaz (örn. ".123")
  const prefix = prefixDigits ? fmt(Number(prefixDigits)) : "";
  return { prefix, suffix3 };
}

/** Yumuşak drift aralığı */
function nextDrift(prev: number, min: number, max: number, amount = 0.015) {
  const center = (min + max) / 2;
  const toward = prev + (center - prev) * 0.18;
  const jitter = (Math.random() - 0.5) * ((max - min) * amount);
  return clamp(toward + jitter, min, max);
}

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
          setTotal(lerp(merged.total_min, merged.total_max, 0.5));
          setDist (lerp(merged.dist_min,  merged.dist_max,  0.5));
          setPart (lerp(merged.part_min,  merged.part_max,  0.5));
        }
      } catch { /* sessiz fallback */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SÜREKLİ drift (akışkan)
  useEffect(() => {
    const t = setInterval(() => {
      setTotal(p => nextDrift(p, ranges.total_min, ranges.total_max, 0.010));
      setDist (p => nextDrift(p, ranges.dist_min,  ranges.dist_max,  0.016));
      setPart (p => nextDrift(p, ranges.part_min,  ranges.part_max,  0.008));
    }, 5000);
    return () => clearInterval(t);
  }, [ranges]);

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

      {/* SAĞ — Premium metrikler (eşit yükseklikte 3 satır) */}
      <div className="hp-right">
        <Metric
          label="Toplam Ödül"
          value={total}
          suffix="₺"
          tone="gold"
        />
        <Metric
          label="Dağıtılan Ödül"
          value={dist}
          suffix="₺"
          tone="aqua"
        />
        <Metric
          label="Katılımcı"
          value={part}
          suffix=""
          tone="vio"
        />
      </div>

      <style>{css}</style>
    </section>
  );
}

/* -------------------- METRİK BLOĞU -------------------- */
function Metric({
  label, value, suffix, tone,
}: { label: string; value: number; suffix: string; tone: "gold"|"aqua"|"vio" }) {
  const { prefix, suffix3 } = splitLast3(Math.max(0, Math.floor(value)));

  return (
    <div className={`mtr ${tone}`} title={`${label}: ${fmt(value)} ${suffix}`}>
      <div className="mtr-head">
        <span className="dot" aria-hidden />
        <span className="lbl">{label}</span>
      </div>
      <div className="mtr-val">
        {/* Prefix her zaman tabular; boy zıplaması olmaz */}
        {prefix && <span className="prefix">{prefix}.</span>}
        <Digits3 triple={suffix3}/>
        {suffix && <span className="suf"> {suffix}</span>}
      </div>
    </div>
  );
}

/* Son 3 basamak: ileri yönlü, taşımalı hissiyatlı roller */
function Digits3({ triple }: { triple: string }) {
  const [d0, d1, d2] = triple.padStart(3, "0").split("");
  return (
    <span className="d3">
      <Digit d={d0} delay={0}/>
      <Digit d={d1} delay={60}/>
      <Digit d={d2} delay={100}/>
    </span>
  );
}

/**
 * Digit — yalnız ileri yönde döner.
 * - Önceki değere göre adım sayısını ekler; geri dönmez, böylece "carry" hissi verir.
 * - Hareket sırasında hafif motion-blur ve glow.
 */
function Digit({ d, delay = 0 }: { d: string; delay?: number }) {
  const target = Math.max(0, Math.min(9, parseInt(d, 10)));
  const prevRef = useRef<number>(target);
  const turnsRef = useRef<number>(target); // başlangıç konumu
  const [, setTick] = useState(0);
  const movingRef = useRef<NodeJS.Timeout | null>(null);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === target) return;
    // ileri yönde minimum adım (mod 10)
    const step = (target - prev + 10) % 10 || 10; // aynıysa tam tur at
    turnsRef.current += step;

    // "hareket" sınıfı
    if (movingRef.current) clearTimeout(movingRef.current);
    setTimeout(() => { setMoving(true); }, delay);
    movingRef.current = setTimeout(() => { setMoving(false); }, delay + 520);

    // re-render (animasyonu tetikle)
    setTimeout(() => setTick(x => x + 1), delay);

    prevRef.current = target;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const TOTAL_REPEATS = 30; // 0-9, 30 kere; uzun ömürlü
  const cells = Array.from({ length: TOTAL_REPEATS * 10 }, (_, i) => i % 10);
  const translatePct = -(turnsRef.current * 10);

  return (
    <span className={`digit ${moving ? "moving" : ""}`}>
      <span
        className="rail"
        style={{
          transform: `translateY(${translatePct}%)`,
          transitionDelay: `${delay}ms`,
        }}
      >
        {cells.map((n, i) => (
          <span key={i} className="cell">{n}</span>
        ))}
      </span>
    </span>
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
  --hp-bg: #090d17;
  --hp-card: #0f1524;
  --hp-edge: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,0));
  --hp-brd: rgba(255,255,255,.08);

  --hp-gold: #ffd057;  /* accent 1 */
  --hp-aqua: #3be2ff;  /* accent 2 */
  --hp-vio:  #b08cff;  /* accent 3 */

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
  .hero-prem{ grid-template-columns: 1fr; min-height: 580px; }
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

/* Metrik kart (çerçevesiz cam + gradient çizgi) */
.mtr{
  position: relative;
  display:flex;
  flex-direction:column;
  justify-content: center; /* satırın ortasını doldur */
  gap:10px;
  padding: 14px 16px;
  background:
    linear-gradient(180deg, rgba(15,21,36,.9), rgba(15,21,36,.65)),
    radial-gradient(120% 120% at -10% -10%, rgba(255,255,255,.06), rgba(255,255,255,0));
  border-radius: 14px;
  box-shadow: var(--hp-shadow);
  outline: 1px solid rgba(255,255,255,.06);
  overflow: hidden;
}
.mtr::after{
  /* köşede premium edge */
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

/* Değer alanı — tek tip boy; tüm kartlarda aynı */
.mtr-val{
  display:flex; align-items:flex-end; gap:6px; flex-wrap:wrap;
  color: var(--hp-text);
  font-weight: 900;
  /* Tüm rakamlar eş-genişlikli → zıplama yok */
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
  text-shadow: 0 0 28px rgba(59,226,255,.18);
  line-height: 1;
  /* tek bir boy belirleyip her kartta aynısını kullan */
  font-size: clamp(32px, 5.4vw, 48px);
}
.mtr.gold .mtr-val{ text-shadow: 0 0 28px rgba(255,208,87,.26); }
.mtr.aqua .mtr-val{ text-shadow: 0 0 28px rgba(59,226,255,.26); }
.mtr.vio  .mtr-val{ text-shadow: 0 0 28px rgba(176,140,255,.26); }

.prefix{
  opacity:.95;
  letter-spacing:.6px;
}
.suf{
  font-size: .52em;
  opacity:.96;
  margin-left: 2px;
  padding-bottom: 2px;
}

/* Son 3 basamak kapsayıcı */
.d3{
  display:inline-flex; gap:4px;
}

/* Tek hanelik roller */
.digit{
  position: relative;
  width: 18px; height: 26px;
  overflow: hidden; display:inline-block;
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.08),
    0 4px 10px rgba(0,0,0,.35);
  will-change: transform;
}
@media (max-width: 900px){
  .digit{ width: 16px; height: 24px; }
}

/* Ray: ileri yönlü, yumuşak */
.rail{
  display:flex;
  flex-direction:column;
  transition: transform 520ms cubic-bezier(.17,.9,.18,1);
  will-change: transform;
}
.cell{
  height: 26px;
  line-height: 26px;
  text-align: center;
  font-size: 18px;
  color: #f2fbff;
  text-shadow: 0 0 8px rgba(255,255,255,.16);
}
@media (max-width: 900px){
  .cell{ height: 24px; line-height: 24px; font-size: 16px; }
}

/* Hareket sırasında hafif motion blur + glow */
.digit.moving{
  filter: drop-shadow(0 0 10px rgba(255,255,255,.12)) saturate(1.05);
}
.digit.moving .rail{
  transition-timing-function: cubic-bezier(.18,.8,.15,1);
}

/* Tonlara küçük vurgu çizgisi (üst kenar) */
.mtr.gold{ outline-color: rgba(255,208,87,.28); }
.mtr.aqua{ outline-color: rgba(59,226,255,.28); }
.mtr.vio { outline-color: rgba(176,140,255,.28); }

@media (max-width: 900px){
  .hp-right{ gap:8px; }
  .mtr{ padding: 12px 14px; }
}
`;
