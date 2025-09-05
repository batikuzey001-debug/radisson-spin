// web/src/components/Hero.tsx
import { useEffect, useRef, useState } from "react";

/**
 * HERO – Sadece SOL BLOK İSTATİSTİKLER
 * Arka planda mevcut slider çalışır; sol yanda sadece üç metrik görünür:
 *  - Toplam Ödül
 *  - Dağıtılan Ödül
 *  - Toplam Katılımcı
 *
 * Veriler /api/hero/stats uçtan gelir. Admin panelinde min/max set edilecek şekilde tasarlandı.
 * Uç örnek (hepsi opsiyonel; yoksa fallback/minimal jitter): 
 * {
 *   "total_min": 56000000, "total_max": 90000000,
 *   "dist_min": 200000,    "dist_max": 1200000,
 *   "part_min": 350000,    "part_max": 600000
 * }
 *
 * Not: Sadece TASARIMSAL/ÖN YÜZ; var olan akış bozulmaz.
 */

const API = import.meta.env.VITE_API_BASE_URL;

/* ---- Types ---- */
type HeroRange = {
  total_min?: number; total_max?: number;
  dist_min?: number;  dist_max?: number;
  part_min?: number;  part_max?: number;
};

/* ---- Utils ---- */
const fmt = (n: number) => new Intl.NumberFormat("tr-TR").format(Math.max(0, Math.floor(n)));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;

/* ---- Component ---- */
export default function Hero() {
  // arka plan slider için sadece görsel; fakat metin vs. yok
  const [slides, setSlides] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const timer = useRef<number | null>(null);
  const progRef = useRef<HTMLDivElement | null>(null);

  // metrik state (görünen)
  const [total, setTotal] = useState(72_500_000);
  const [dist, setDist]   = useState(420_000);
  const [part, setPart]   = useState(482_000);

  // aralıklar (backend -> min/max)
  const [range, setRange] = useState<Required<HeroRange>>({
    total_min: 60_000_000, total_max: 95_000_000,
    dist_min:   200_000,   dist_max:   1_200_000,
    part_min:   300_000,   part_max:   800_000,
  });

  /* --- fetch banners (sadece back görüntü) --- */
  useEffect(() => {
    fetch(`${API}/api/home/banners`)
      .then(r => r.json())
      .then(rows => {
        const arr = (Array.isArray(rows) ? rows : []).map((b: any) => b?.image_url).filter(Boolean);
        setSlides(arr.length ? arr : FALLBACK_SLIDES);
      })
      .catch(() => setSlides(FALLBACK_SLIDES));
  }, []);

  /* --- autoplay --- */
  useEffect(() => {
    if (!slides.length) return;
    timer.current = window.setInterval(() => setIdx(i => (i + 1) % slides.length), 6000);
    if (progRef.current) {
      progRef.current.style.animation = "none";
      void progRef.current.offsetWidth;
      progRef.current.style.animation = "prog 6s linear forwards";
    }
    return () => timer.current && window.clearInterval(timer.current);
  }, [slides, idx]);

  /* --- ranges & seed --- */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/api/hero/stats`);
        if (!r.ok) return;
        const js = (await r.json()) as HeroRange;

        const rr: Required<HeroRange> = {
          total_min: js.total_min ?? range.total_min,
          total_max: js.total_max ?? range.total_max,
          dist_min:  js.dist_min  ?? range.dist_min,
          dist_max:  js.dist_max  ?? range.dist_max,
          part_min:  js.part_min  ?? range.part_min,
          part_max:  js.part_max  ?? range.part_max,
        };
        // başlangıç değerleri aralığın ortası
        setRange(rr);
        setTotal(lerp(rr.total_min, rr.total_max, 0.5));
        setDist( lerp(rr.dist_min,  rr.dist_max,  0.5));
        setPart( lerp(rr.part_min,  rr.part_max,  0.5));
      } catch { /* fallback kalır */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- küçük drift (5sn) --- */
  useEffect(() => {
    const t = setInterval(() => {
      setTotal(prev => drift(prev, range.total_min, range.total_max, 0.012));
      setDist (prev => drift(prev, range.dist_min,  range.dist_max,  0.018));
      setPart (prev => drift(prev, range.part_min,  range.part_max,  0.010));
    }, 5000);
    return () => clearInterval(t);
  }, [range]);

  return (
    <section className="heroOnlyStats" aria-label="Öne çıkanlar">
      {/* back slider */}
      <div className="stage">
        {slides.map((src, i) => (
          <div key={i} className={`bg ${i === idx ? "active" : ""}`} style={{ ["--img" as any]: `url('${src}')` }} />
        ))}
        <div className="shade" />
      </div>

      {/* Sol kolon küçük kartlar */}
      <div className="statsDock">
        <StatCard label="Toplam Ödül" value={fmt(total) + " ₺"} tone="gold" />
        <StatCard label="Dağıtılan Ödül" value={fmt(dist) + " ₺"} tone="aqua" />
        <StatCard label="Katılımcı" value={fmt(part)} tone="vio" />
      </div>

      {/* Noktalar + progress (küçük) */}
      <div className="dots">
        {slides.map((_, i) => (
          <button key={i} className={`dot ${i === idx ? "active" : ""}`} onClick={() => setIdx(i)} aria-label={`Slayt ${i+1}`} />
        ))}
      </div>
      <div className="progress"><div ref={progRef} className="bar" /></div>

      <style>{css}</style>
    </section>
  );
}

/* -------------------- Parçalar -------------------- */
function StatCard({ label, value, tone }: { label: string; value: string; tone: "gold" | "aqua" | "vio" }) {
  return (
    <div className={`sCard ${tone}`}>
      <div className="v">{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}

/* -------------------- Yardımcılar -------------------- */
function drift(cur: number, min: number, max: number, ratio = 0.01) {
  // tabana yaklaş + jitter
  const toward = cur + ( (min + max)/2 - cur ) * 0.15;
  const jitter = (Math.random() - 0.5) * ((max - min) * ratio);
  return clamp(toward + jitter, min, max);
}

/* -------------------- Fallback BG -------------------- */
const FALLBACK_SLIDES = [
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518609571773-39b7d303a87b?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559703248-dcaaec9fab78?q=80&w=2000&auto=format&fit=crop",
];

/* -------------------- Stil -------------------- */
const css = `
.heroOnlyStats{
  position:relative;
  height:min(46vh,460px);
  min-height:280px;
  border-radius:18px;
  overflow:hidden;
  margin:12px auto 18px;
  isolation:isolate;
}

/* BG slider */
.stage{ position:absolute; inset:0 }
.bg{
  position:absolute; inset:0;
  background-image:var(--img);
  background-size:cover; background-position:center;
  opacity:0; transform:scale(1.04); filter:blur(2px) brightness(.96);
  transition:opacity 800ms ease, transform 800ms ease, filter 800ms ease;
}
.bg.active{ opacity:1; transform:scale(1.01); filter:blur(0px) brightness(1) }
.shade{
  position:absolute; inset:0;
  background:
    linear-gradient(180deg, rgba(6,10,22,.18) 0%, rgba(6,10,22,.84) 66%, rgba(6,10,22,.92) 100%),
    radial-gradient(50% 50% at 100% 100%, rgba(0,0,0,.22), transparent 60%);
}

/* Sol dock – kompakt */
.statsDock{
  position:absolute; left:16px; top:16px; bottom:16px; width:min(320px,35%);
  display:flex; flex-direction:column; gap:10px; z-index:2;
}
.sCard{
  flex:0 0 auto;
  padding:12px 14px;
  border-radius:12px;
  background:linear-gradient(180deg, rgba(12,16,28,.55), rgba(12,16,28,.35));
  border:1px solid rgba(255,255,255,.12);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.05);
  backdrop-filter:blur(6px);
}
.sCard .v{ font-weight:1000; font-size:clamp(18px,3.8vw,26px); color:#e9fbff }
.sCard .l{ font-size:12px; letter-spacing:.6px; color:#a7bddb }
.sCard.gold{ border-color:rgba(255,196,0,.45) }
.sCard.aqua{ border-color:rgba(0,229,255,.45) }
.sCard.vio { border-color:rgba(156,39,176,.40) }

/* dots + progress */
.dots{ position:absolute; right:14px; bottom:12px; display:flex; gap:6px; z-index:3 }
.dot{ width:8px;height:8px;border-radius:50%;border:none;background:rgba(255,255,255,.35);cursor:pointer }
.dot.active{ background:#00e5ff; box-shadow:0 0 10px rgba(0,229,255,.5) }
.progress{ position:absolute; left:16px; right:16px; bottom:6px; height:3px; background:rgba(255,255,255,.15); border-radius:999px; overflow:hidden; z-index:2 }
.bar{ width:0%; height:100%; background:linear-gradient(90deg,#00e5ff,#4aa7ff); box-shadow:0 0 12px rgba(0,229,255,.45) }
@keyframes prog{ from{ width:0% } to{ width:100% } }

@media (max-width:720px){
  .heroOnlyStats{ height:44vh; min-height:260px }
  .statsDock{ width:calc(100% - 32px); position:absolute; right:16px; left:16px; top:auto; bottom:14px; flex-direction:row; }
  .sCard{ flex:1 }
}
`;
