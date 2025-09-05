// web/src/components/Hero.tsx
import { useEffect, useRef, useState } from "react";

/**
 * HERO (rev3 - sadece sayı mantığı değişti, boyutlar korunuyor)
 * - Sol: otomatik kayan banner (gösterge yok)
 * - Sağ: 3 metrik aynı formatta, aynı tipografi; SON 3 BASAMAK ÖZEL DEĞİL
 * - Artış: 10 dakikada 1 kez, +10..+300 arası tek adım artar (drift/animasyon yok)
 * - Backend uçları ve mevcut boyutlar korunur
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

export default function Hero() {
  const [slides, setSlides] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);

  // min/max aralıkları
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

  // min/max aralıkları + başlangıç değerleri
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
          // başlangıçları ortadan ver (boyutlar korunuyor)
          setTotal(lerp(merged.total_min, merged.total_max, 0.5));
          setDist (lerp(merged.dist_min,  merged.dist_max,  0.5));
          setPart (lerp(merged.part_min,  merged.part_max,  0.5));
        }
      } catch { /* fallback sessiz */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Artış mantığı:
   * - Her 10 dakikada (600_000ms) bir kez, +10..+300 arası tek adım artış yap.
   * - Max'ı geçmez (clamp).
   * - Geri düşme, yumuşak drift vb. YOK.
   */
  useTenMinuteIncrement(total, setTotal, ranges.total_min, ranges.total_max);
  useTenMinuteIncrement(dist,  setDist,  ranges.dist_min,  ranges.dist_max);
  useTenMinuteIncrement(part,  setPart,  ranges.part_min,  ranges.part_max);

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

      {/* SAĞ — metrikler (boyutlar aynen korunur) */}
      <div className="right">
        <StatBlock label="Toplam Ödül" value={total} suffix=" ₺" tone="gold" />
        <StatBlock label="Dağıtılan Ödül" value={dist} suffix=" ₺" tone="aqua" />
        <StatBlock label="Katılımcı" value={part} suffix="" tone="vio" />
      </div>

      <style>{css}</style>
    </section>
  );
}

/* ---- 10 dakikada bir artış hook'u ---- */
function useTenMinuteIncrement(
  value: number,
  setValue: (n: number) => void,
  min: number,
  max: number
){
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // her kurulumda eskiyi temizle
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    const stepper = () => {
      const inc = 10 + Math.floor(Math.random() * 291); // 10..300
      setValue(v => clamp(v + inc, min, max));
    };
    intervalRef.current = window.setInterval(stepper, 600_000); // 10 dk
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [min, max, setValue]);
}

/* ---- Düz metinli metrik bloğu (boyutlar korunur) ---- */
function StatBlock({ label, value, suffix, tone }:{
  label: string; value: number; suffix: string; tone: "gold"|"aqua"|"vio"
}) {
  return (
    <div className={`block ${tone}`} title={`${label}: ${fmt(value)}${suffix}`}>
      <div className="blab">{label}</div>
      <div className="bval">
        <span className="num">{fmt(value)}</span>
        <span className="suf">{suffix}</span>
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

/* ---- Stil (ORİJİNAL BOYUTLAR KORUNDU) ---- */
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
  font-size: clamp(28px, 6vw, 46px); /* ÖNCEKİ BOYUTLAR */
  line-height:1.06;

  /* tüm rakamlar aynı genişlikte → zıplama yok */
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
}
.block.gold .bval{ text-shadow:0 0 16px rgba(255,196,0,.30) }
.block.aqua .bval{ text-shadow:0 0 16px rgba(0,229,255,.30) }
.block.vio  .bval{ text-shadow:0 0 16px rgba(156,39,176,.28) }

.num{ letter-spacing:.4px }
.suf{ font-size:.6em; opacity:.95; margin-left:2px }

/* Responsive ince ayar */
@media(max-width:900px){
  .right{ padding:6px 8px }
}
`;
