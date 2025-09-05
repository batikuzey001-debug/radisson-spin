// web/src/components/Hero.tsx
import { useEffect, useRef, useState } from "react";

/**
 * HERO — Sol: otomatik kayan banner (gösterge yok) • Sağ: tam dolduran metrikler
 * - Sol taraftaki görsel otomatik değişir (ok/nokta/progress yok)
 * - Sağ tarafta üç metrik aynı fontla, bölümü tamamen dolduracak şekilde yerleşir
 * - Yalnız SON 3 BASAMAK "dijital roll" animasyonu yapar, geri kalanı sabit
 * - Veriler /api/home/stats (min/max) -> küçük drift ile akıcı görünüm
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
  const prefix = prefixDigits ? fmt(Number(prefixDigits)) : "0";
  return { prefix, suffix3 };
}

function nextDrift(prev: number, min: number, max: number, amount = 0.015) {
  const center = (min + max) / 2;
  const toward = prev + (center - prev) * 0.18;
  const jitter = (Math.random() - 0.5) * ((max - min) * amount);
  return clamp(toward + jitter, min, max);
}

export default function Hero() {
  const [slides, setSlides] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);
  const progRef = useRef<HTMLDivElement | null>(null); // kullanılmıyor ama kalsın (ileride gerekirse)

  const [ranges, setRanges] = useState<HeroStats>({
    total_min: 60_000_000, total_max: 95_000_000,
    dist_min:    200_000,  dist_max:   1_200_000,
    part_min:    300_000,  part_max:     800_000,
  });
  const [total, setTotal] = useState(72_000_000);
  const [dist,  setDist]  = useState(420_000);
  const [part,  setPart]  = useState(480_000);

  // sol bannerlar
  useEffect(() => {
    fetch(`${API}/api/home/banners`)
      .then(r => r.json())
      .then(rows => {
        const arr = (Array.isArray(rows)? rows:[])
          .map((b:any)=> b?.image_url)
          .filter(Boolean);
        setSlides((arr.length? arr: FALLBACKS).map((src, i)=> ({ id: i, image_url: src })));
      })
      .catch(()=> setSlides(FALLBACKS.map((src, i)=> ({ id: i, image_url: src }))));
  }, []);

  // otomatik değişim (6 sn)
  useEffect(() => {
    if (!slides.length) return;
    const t = window.setInterval(() => setIdx(i => (i + 1) % slides.length), 6000);
    return () => window.clearInterval(t);
  }, [slides, idx]);

  // min/max aralıkları
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
      } catch { /* fallback */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // yumuşak drift
  useEffect(() => {
    const t = setInterval(() => {
      setTotal(p => nextDrift(p, ranges.total_min, ranges.total_max, 0.010));
      setDist (p => nextDrift(p, ranges.dist_min,  ranges.dist_max,  0.016));
      setPart (p => nextDrift(p, ranges.part_min,  ranges.part_max,  0.008));
    }, 5000);
    return () => clearInterval(t);
  }, [ranges]);

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
        <div className="shade"/>
      </div>

      {/* SAĞ — tam dolduran metrikler */}
      <div className="right">
        <StatBlock label="Toplam Ödül" value={total} suffix=" ₺" tone="gold" />
        <StatBlock label="Dağıtılan Ödül" value={dist} suffix=" ₺" tone="aqua" />
        <StatBlock label="Katılımcı" value={part} suffix="" tone="vio" />
      </div>

      <style>{css}</style>
    </section>
  );
}

/* ---- Dolduran metrik bloğu (çerçeve yok, tek tip font, son 3 basamak animasyon) ---- */
function StatBlock({ label, value, suffix, tone }:{
  label: string; value: number; suffix: string; tone: "gold"|"aqua"|"vio"
}) {
  const { prefix, suffix3 } = splitLast3(Math.max(0, Math.floor(value)));
  return (
    <div className={`block ${tone}`} title={`${label}: ${fmt(value)}${suffix}`}>
      <div className="blab">{label}</div>
      <div className="bval">
        <span className="prefix">{prefix}{prefix === "0" ? "" : "."}</span>
        <Digits3 triple={suffix3}/>
        <span className="suf">{suffix}</span>
      </div>
    </div>
  );
}

function Digits3({ triple }: { triple: string }) {
  const [d0, d1, d2] = triple.padStart(3, "0").split("");
  return (
    <span className="d3">
      <Digit d={d0}/><Digit d={d1}/><Digit d={d2}/>
    </span>
  );
}
function Digit({ d }: { d: string }) {
  const t = Math.max(0, Math.min(9, parseInt(d, 10)));
  return (
    <span className="digit">
      <span className="rail" style={{ transform: `translateY(-${t * 10}%)` }}>
        {Array.from({length:10}).map((_,i)=><span key={i} className="cell">{i}</span>)}
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

/* ---- Stil ---- */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700;800;900&display=swap');

.heroSplit{
  display:grid; grid-template-columns: 1.1fr .9fr; gap:14px;
  min-height:320px; border-radius:18px; overflow:hidden;
  font-family:'Poppins',system-ui,Segoe UI,Roboto,Arial,sans-serif;
}
@media(max-width:900px){
  .heroSplit{ grid-template-columns: 1fr; }
}

/* Sol: Banner (gösterge yok, otomatik değişir) */
.left{ position:relative; min-height:260px; border-radius:14px; overflow:hidden; }
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

/* Sağ: Tam dolduran, çerçevesiz metrikler */
.right{
  display:flex; flex-direction:column; justify-content:space-evenly; gap:8px;
  padding:8px 12px;
}
.block{
  display:flex; flex-direction:column; gap:6px;
  /* ÇERÇEVE YOK, sadece tipografi & glow */
}
.blab{
  font-size:clamp(12px,1.8vw,14px);
  letter-spacing:.6px; color:#a7bddb;
  text-transform:uppercase;
}
.bval{
  display:flex; align-items:flex-end; flex-wrap:wrap; gap:4px;
  font-weight:900; color:#e9fbff;
  text-shadow:0 0 16px rgba(0,229,255,.30);
  font-size: clamp(28px, 6vw, 46px);
  line-height:1.06;
}
.prefix{ opacity:.95; letter-spacing:.6px }
.suf{ font-size:.6em; opacity:.95; margin-left:2px }

/* son 3 basamak sadece */
.d3{ display:inline-flex; gap:2px; margin-left:2px }
.digit{
  width:16px; height:22px; overflow:hidden; display:inline-block;
  background:rgba(255,255,255,.08); border-radius:4px;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.10);
}
.rail{ display:flex; flex-direction:column; transition: transform .55s cubic-bezier(.18,.7,.2,1) }
.cell{ height:22px; line-height:22px; text-align:center; font-size:14px; color:#f2fbff; }

/* tonlara ufak renk vurgusu (tipografi glow) */
.block.gold .bval{ text-shadow:0 0 16px rgba(255,196,0,.30) }
.block.aqua .bval{ text-shadow:0 0 16px rgba(0,229,255,.30) }
.block.vio  .bval{ text-shadow:0 0 16px rgba(156,39,176,.28) }

@media(max-width:900px){
  .right{ padding:6px 8px }
  .digit{ width:15px; height:20px }
  .cell{ height:20px; line-height:20px; font-size:13px }
}
`;
