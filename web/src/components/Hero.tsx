// web/src/components/Hero.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * HERO — Banner (sol) + İstatistikler (sağ)
 * - Banner arkada akarken SAYILAR banner ÜSTÜNDE DEĞİL, sağ sütunda gösterilir.
 * - 3 metrik: Toplam Ödül, Dağıtılan Ödül, Katılımcı
 * - Sadece SON 3 BASAMAK (yüzler) dijital şekilde "roll" animasyonuyla değişir.
 * - Veriler: /api/home/stats (min/max). Frontend küçük drift uygular.
 */

const API = import.meta.env.VITE_API_BASE_URL;

/* -------------------- Types -------------------- */
type HeroStats = {
  total_min: number; total_max: number;
  dist_min:  number; dist_max:  number;
  part_min:  number; part_max:  number;
};
type Banner = { id: string|number; image_url: string };

/* -------------------- Utils -------------------- */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp  = (a: number, b: number, t: number)   => a + (b - a) * t;
const fmt   = (n: number) => new Intl.NumberFormat("tr-TR").format(Math.max(0, Math.floor(n)));

// sayıyı "prefix" (ilk kısım) + "suffix" (son 3 basamak) olarak ayır
function splitLast3(n: number) {
  const s = fmt(n);
  // sayının sadece rakamlarını al, gruplama için tekrardan formatlayacağız
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

/* -------------------- Component -------------------- */
export default function Hero() {
  // BG banners (sol taraf)
  const [slides, setSlides] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);
  const progRef = useRef<HTMLDivElement | null>(null);

  // ranges & visible values
  const [ranges, setRanges] = useState<HeroStats>({
    total_min: 60_000_000, total_max: 95_000_000,
    dist_min:    200_000,  dist_max:   1_200_000,
    part_min:    300_000,  part_max:     800_000,
  });
  const [total, setTotal] = useState(72_000_000);
  const [dist,  setDist]  = useState(420_000);
  const [part,  setPart]  = useState(480_000);

  /* --- fetch banners (sol, sadece görsel) --- */
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

  /* --- autoplay --- */
  useEffect(() => {
    if (!slides.length) return;
    const t = window.setInterval(() => setIdx(i => (i + 1) % slides.length), 6000);
    if (progRef.current) {
      progRef.current.style.animation = "none";
      void progRef.current.offsetWidth;
      progRef.current.style.animation = "prog 6s linear forwards";
    }
    return () => window.clearInterval(t);
  }, [slides, idx]);

  /* --- fetch ranges --- */
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
      } catch {/* fallback */}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- gentle drift (son 3 basamak animasyonunu tetikler) --- */
  useEffect(() => {
    const t = setInterval(() => {
      setTotal(p => nextDrift(p, ranges.total_min, ranges.total_max, 0.010));
      setDist (p => nextDrift(p, ranges.dist_min,  ranges.dist_max,  0.016));
      setPart (p => nextDrift(p, ranges.part_min,  ranges.part_max,  0.008));
    }, 5000);
    return () => clearInterval(t);
  }, [ranges]);

  return (
    <section className="heroWrap" aria-label="Hero alanı">
      {/* Sol: Banner */}
      <div className="heroLeft">
        {slides.map((b, i) => (
          <div
            key={b.id}
            className={`bg ${i === idx ? "active" : ""}`}
            style={{ ["--img" as any]: `url('${b.image_url}')` }}
          />
        ))}
        <div className="shade"/>
        <div className="dots">
          {slides.map((_, i)=>(
            <button key={i} className={`dot ${i===idx?"active":""}`} onClick={()=>setIdx(i)} />
          ))}
        </div>
        <div className="progress"><div ref={progRef} className="bar" /></div>
      </div>

      {/* Sağ: Sadece metrikler */}
      <div className="heroRight">
        <StatLine label="Toplam Ödül" value={total} suffix="₺" tone="gold"/>
        <StatLine label="Dağıtılan Ödül" value={dist} suffix="₺" tone="aqua"/>
        <StatLine label="Katılımcı" value={part} suffix="" tone="vio"/>
      </div>

      <style>{css}</style>
    </section>
  );
}

/* -------------------- StatLine (yalnız son 3 basamak animasyonlu) -------------------- */
function StatLine({ label, value, suffix, tone }:{
  label: string; value: number; suffix: string; tone: "gold"|"aqua"|"vio"
}) {
  const { prefix, suffix3 } = splitLast3(Math.max(0, Math.floor(value)));
  return (
    <div className={`line ${tone}`} title={`${label}: ${fmt(value)} ${suffix}`.trim()}>
      <div className="lab">{label}</div>
      <div className="val">
        <span className="prefix">{prefix}{prefix === "0" ? "" : "."}</span>
        <Digits3 triple={suffix3}/>
        {suffix && <span className="suf"> {suffix}</span>}
      </div>
    </div>
  );
}

/* ---- yalnız son 3 basamak roll animasyonu ---- */
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

/* -------------------- Fallback BG -------------------- */
const FALLBACKS = [
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518609571773-39b7d303a87b?q=80&w=2000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559703248-dcaaec9fab78?q=80&w=2000&auto=format&fit=crop",
];

/* -------------------- Styles -------------------- */
const css = `
.heroWrap{
  display:grid; grid-template-columns: 1.1fr .9fr; gap:12px;
  min-height:300px; border-radius:18px; overflow:hidden;
}
@media(max-width:900px){
  .heroWrap{ grid-template-columns: 1fr; }
}

/* ----- Sol: Banner ----- */
.heroLeft{ position:relative; min-height:260px; border-radius:14px; overflow:hidden; }
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
.dots{ position:absolute; left:10px; bottom:10px; display:flex; gap:6px; z-index:2 }
.dot{ width:8px;height:8px;border-radius:50%;border:none;background:rgba(255,255,255,.35);cursor:pointer }
.dot.active{ background:#00e5ff; box-shadow:0 0 10px rgba(0,229,255,.5) }
.progress{ position:absolute; left:10px; right:10px; bottom:4px; height:3px; background:rgba(255,255,255,.15); border-radius:999px; overflow:hidden }
.bar{ width:0%; height:100%; background:linear-gradient(90deg,#00e5ff,#4aa7ff); box-shadow:0 0 12px rgba(0,229,255,.45) }
@keyframes prog{ from{ width:0% } to{ width:100% } }

/* ----- Sağ: İstatistikler ----- */
.heroRight{
  display:flex; flex-direction:column; gap:10px; justify-content:center;
  border-radius:14px; padding:12px;
  background:linear-gradient(180deg, rgba(12,16,28,.45), rgba(12,16,28,.30));
  border:1px solid rgba(255,255,255,.10);
  backdrop-filter: blur(6px);
}

.line{
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:10px 12px;
  background:linear-gradient(180deg, rgba(10,16,30,.55), rgba(10,16,30,.35));
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.05);
}
.line.gold{  border-color: rgba(255,196,0,.45) }
.line.aqua{  border-color: rgba(0,229,255,.45) }
.line.vio{   border-color: rgba(156,39,176,.40) }

.lab{
  font-size:12px; letter-spacing:.6px; color:#a7bddb; white-space:nowrap;
}
.val{
  display:flex; align-items:flex-end; gap:0;
  font-weight:1000; color:#e9fbff;
  text-shadow:0 0 14px rgba(0,229,255,.3);
  font-size: clamp(18px, 4.6vw, 28px);
}
.prefix{ opacity:.95; letter-spacing:.5px; }
.suf{ font-size:.8em; opacity:.95; margin-left:4px }

/* son 3 basamak */
.d3{ display:inline-flex; gap:2px; margin-left:2px }
.digit{
  width:14px; height:20px; overflow:hidden; display:inline-block;
  background:rgba(255,255,255,.06); border-radius:4px;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);
}
.rail{ display:flex; flex-direction:column; transition: transform .55s cubic-bezier(.18,.7,.2,1) }
.cell{ height:20px; line-height:20px; text-align:center; font-size:14px; color:#f2fbff; }

@media(max-width:900px){
  .heroRight{ padding:10px }
  .line{ padding:9px 10px }
  .digit{ width:13px; height:18px }
  .cell{ height:18px; line-height:18px; font-size:13px }
}
`;
