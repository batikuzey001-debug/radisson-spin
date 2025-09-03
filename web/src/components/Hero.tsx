// web/src/components/Hero.tsx
import { useEffect, useRef, useState } from "react";

/**
 * Hero (V3)
 * - Kaynak: /api/home/banners  -> [{id,image_url,title,subtitle}]
 * - Özellikler:
 *    • Ken Burns (yumuşak zoom/pan) + parallax ışıklar
 *    • Cam (glassmorphism) metin paneli, okunaklı overlay
 *    • Otomatik geçiş + manuel oklar + noktalar + ilerleme çubuğu
 *    • Mobil uyum (yükseklik ve tipografi skaler)
 *    • Klavye erişimi (←/→, Space durdur/başlat)
 */

type Banner = {
  id: string | number;
  image_url: string;
  title?: string | null;
  subtitle?: string | null;
};

const API = import.meta.env.VITE_API_BASE_URL;

export default function Hero() {
  const [items, setItems] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  // fetch banners
  useEffect(() => {
    fetch(`${API}/api/home/banners`)
      .then((r) => r.json())
      .then((rows) => {
        const arr = (Array.isArray(rows) ? rows : []).filter((b) => !!b?.image_url);
        setItems(arr.length ? arr : fallback);
      })
      .catch(() => setItems(fallback));
  }, []);

  // autoplay
  useEffect(() => {
    if (!items.length || paused) return;
    const run = () => setIdx((i) => (i + 1) % items.length);
    timer.current = window.setInterval(run, 6000);
    // progress animasyonu reset
    if (progressRef.current) {
      progressRef.current.style.animation = "none";
      // reflow
      void progressRef.current.offsetWidth;
      progressRef.current.style.animation = "prog 6s linear forwards";
    }
    return () => timer.current && window.clearInterval(timer.current);
  }, [items, idx, paused]);

  // keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!items.length) return;
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % items.length);
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + items.length) % items.length);
      if (e.key === " ") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length]);

  if (!items.length) return null;
  const curr = items[idx];

  return (
    <section
      className="heroV3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ ["--img" as any]: `url('${curr.image_url}')` }}
      aria-roledescription="carousel"
      aria-label="Öne çıkanlar"
    >
      {/* Arka plan katmanları */}
      <div className="bg kenburns" />
      <div className="glow glow-a" />
      <div className="glow glow-b" />
      <div className="shade" />

      {/* İçerik */}
      <div className="inner">
        <div className="glass">
          <h1 className="title">{curr.title || "Radisson Spin"}</h1>
          {curr.subtitle && <p className="sub">{curr.subtitle}</p>}
          <div className="cta">
            <a className="btn primary" href="#" onClick={(e) => e.preventDefault()}>
              Şimdi Katıl
            </a>
            <a className="btn ghost" href="#" onClick={(e) => e.preventDefault()}>
              Kampanyalar
            </a>
          </div>
        </div>

        {/* Navigasyon */}
        <button
          className="arrow left"
          aria-label="Önceki"
          onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)}
        >
          ‹
        </button>
        <button
          className="arrow right"
          aria-label="Sonraki"
          onClick={() => setIdx((i) => (i + 1) % items.length)}
        >
          ›
        </button>

        {/* Noktalar + ilerleme */}
        <div className="dots" role="tablist">
          {items.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === idx}
              className={`dot ${i === idx ? "active" : ""}`}
              onClick={() => setIdx(i)}
              aria-label={`Slayt ${i + 1}`}
            />
          ))}
        </div>
        <div className="progress">
          <div ref={progressRef} className="bar" />
        </div>
      </div>

      <style>{css}</style>
    </section>
  );
}

/* Fallback içerik – CMS boşsa */
const fallback: Banner[] = [
  {
    id: 1,
    image_url:
      "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2000&auto=format&fit=crop",
    title: "Sezona Özel Mega Turnuva",
    subtitle: "350.000 ₺ ödül havuzu seni bekliyor",
  },
  {
    id: 2,
    image_url:
      "https://images.unsplash.com/photo-1518609571773-39b7d303a87b?q=80&w=2000&auto=format&fit=crop",
    title: "Günlük Bonuslarla Kazan",
    subtitle: "Her gün sürpriz promosyonlar",
  },
  {
    id: 3,
    image_url:
      "https://images.unsplash.com/photo-1559703248-dcaaec9fab78?q=80&w=2000&auto=format&fit=crop",
    title: "Özel Oranlar",
    subtitle: "Büyük maçlarda cazip oranlar",
  },
];

/* ===================== CSS ===================== */
const css = `
.heroV3{
  position:relative;
  height:min(62vh,600px);
  min-height:340px;
  border-radius:24px;
  overflow:hidden;
  margin:12px auto 18px;
  isolation:isolate;
}

/* Arka plan görseli (Ken Burns) */
.bg{
  position:absolute; inset:0;
  background-image:var(--img);
  background-size:cover; background-position:center;
  transform-origin: 60% 40%;
  will-change: transform, filter;
}
.kenburns{
  animation: kb 26s ease-in-out infinite alternate;
}
@keyframes kb{
  0%   { transform: scale(1.05); filter: saturate(1) brightness(.98); }
  100% { transform: scale(1.12) translate3d(0,-1.5%,0); filter: saturate(1.08) brightness(1); }
}

/* Neon parıltılar (parallax hissi) */
.glow{
  position:absolute; inset:-20%;
  pointer-events:none; mix-blend-mode:screen; opacity:.35;
  filter: blur(60px);
}
.glow-a{
  background: radial-gradient(40% 40% at 80% 10%, rgba(0,229,255,.35), transparent 60%);
  transform: translate3d(0,0,0);
}
.glow-b{
  background: radial-gradient(35% 35% at 10% 80%, rgba(156,39,176,.28), transparent 60%);
}

/* Okunabilirlik overlay'i */
.shade{
  position:absolute; inset:0;
  background:
    linear-gradient(180deg, rgba(6,10,22,.25) 0%, rgba(6,10,22,.78) 65%, rgba(6,10,22,.92) 100%),
    radial-gradient(50% 50% at 50% 0%, rgba(0,0,0,.24), transparent 60%);
  backdrop-filter: blur(1px);
}

/* İçerik */
.inner{
  position:relative; z-index:2; height:100%;
  display:flex; align-items:flex-end; justify-content:space-between;
  padding:24px;
}

/* Cam panel */
.glass{
  background:linear-gradient(180deg, rgba(12,16,28,.55), rgba(12,16,28,.38));
  border:1px solid rgba(255,255,255,.16);
  box-shadow: 0 16px 32px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.06);
  backdrop-filter: blur(8px);
  border-radius:18px;
  padding:18px 20px;
  max-width:min(720px, 90%);
}
.title{
  margin:0 0 8px;
  font-size: clamp(28px, 4.8vw, 52px);
  font-weight: 900;
  letter-spacing:.3px;
  color:#f2f7ff;
  text-shadow:0 4px 20px rgba(0,0,0,.35);
}
.sub{
  margin:0 0 14px;
  font-size: clamp(14px, 2.2vw, 18px);
  color:#cfe0ff;
}
.cta{ display:flex; gap:10px; flex-wrap:wrap }
.btn{
  display:inline-block; padding:10px 14px; text-decoration:none; border-radius:12px;
  border:1px solid rgba(255,255,255,.16); color:#eaf2ff; transition:.18s transform, .18s filter;
}
.btn.primary{
  background:linear-gradient(90deg,#00e5ff,#4aa7ff);
  color:#001018; border-color:#0f6d8c; font-weight:900;
  box-shadow:0 8px 22px rgba(0,229,255,.25), inset 0 0 0 1px rgba(255,255,255,.18);
}
.btn:hover{ transform: translateY(-1px); filter:brightness(1.04); }
.btn.ghost{ background:transparent }

/* Oklar */
.arrow{
  position:absolute; top:50%; transform:translateY(-50%);
  width:44px; height:44px; border-radius:999px;
  border:1px solid rgba(255,255,255,.18);
  background:rgba(6,10,22,.45); color:#fff; cursor:pointer;
  font-size:22px; line-height:1;
}
.left{ left:16px } .right{ right:16px }

/* Noktalar + ilerleme */
.dots{
  position:absolute; left:0; right:0; bottom:16px;
  display:flex; gap:8px; justify-content:center;
}
.dot{
  width:10px; height:10px; border-radius:999px; border:none; cursor:pointer;
  background:rgba(255,255,255,.4);
}
.dot.active{ background:#00e5ff; box-shadow:0 0 12px rgba(0,229,255,.55) }
.progress{ position:absolute; left:24px; right:24px; bottom:10px; height:3px; background:rgba(255,255,255,.18); border-radius:999px; overflow:hidden }
.bar{ width:0%; height:100%; background:linear-gradient(90deg,#00e5ff,#4aa7ff); box-shadow:0 0 14px rgba(0,229,255,.45) }
@keyframes prog{ from{ width:0% } to{ width:100% } }

@media(max-width:720px){
  .heroV3{ height:50vh; min-height:320px }
  .glass{ padding:14px 16px }
  .arrow{ width:38px; height:38px }
}
`;
