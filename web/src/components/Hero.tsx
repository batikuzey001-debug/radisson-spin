// web/src/components/Hero.tsx
import { useEffect, useRef, useState } from "react";

/**
 * Hero (Premium Fade+Depth)
 * Kaynak: /api/home/banners  -> [{id,image_url,title,subtitle}]
 * - Premium geçiş: cross-fade + depth (scale/blur) + parallax glow
 * - Sadece metin; CTA yok. Metinler güçlü tipografi ve neon vurgulu.
 * - Oklar + noktalar + ilerleme çubuğu (autoplay 6sn)
 * - Mobil uyumlu.
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
  const progRef = useRef<HTMLDivElement | null>(null);

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

  // autoplay + progress
  useEffect(() => {
    if (!items.length || paused) return;
    timer.current = window.setInterval(() => setIdx((i) => (i + 1) % items.length), 6000);
    if (progRef.current) {
      progRef.current.style.animation = "none";
      void progRef.current.offsetWidth;
      progRef.current.style.animation = "prog 6s linear forwards";
    }
    return () => timer.current && window.clearInterval(timer.current);
  }, [items, idx, paused]);

  if (!items.length) return null;

  return (
    <section
      className="heroPremium"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Öne çıkanlar"
    >
      {/* Glow katmanları */}
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      {/* Slide'lar (stack) */}
      <div className="stage">
        {items.map((b, i) => (
          <div
            key={b.id ?? i}
            className={`slide ${i === idx ? "active" : ""}`}
            style={{ ["--img" as any]: `url('${b.image_url}')` }}
            aria-hidden={i !== idx}
          />
        ))}
        {/* shade/overlay */}
        <div className="shade" />
      </div>

      {/* Metin paneli */}
      <div className="copy">
        <h1 className="title">
          {items[idx].title || "Radisson Spin"}
        </h1>
        {items[idx].subtitle && (
          <p className="sub">{items[idx].subtitle}</p>
        )}
      </div>

      {/* Nav okları */}
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

      {/* Noktalar + progress */}
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
      <div className="progress"><div ref={progRef} className="bar" /></div>

      <style>{css}</style>
    </section>
  );
}

/* Fallback – CMS boşsa */
const fallback: Banner[] = [
  {
    id: 1,
    image_url:
      "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2000&auto=format&fit=crop",
    title: "Sezona Özel Mega Turnuva",
    subtitle: "350.000 ₺ ödül havuzu",
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
.heroPremium{
  position:relative;
  height:min(62vh,600px);
  min-height:340px;
  border-radius:24px;
  overflow:hidden;
  margin:12px auto 18px;
  isolation:isolate;
}

/* Parallax neon ışıltılar */
.glow{
  position:absolute; inset:-20%;
  pointer-events:none; mix-blend-mode:screen; opacity:.35;
  filter: blur(60px);
}
.glow-a{ background: radial-gradient(40% 40% at 80% 10%, rgba(0,229,255,.35), transparent 60%); }
.glow-b{ background: radial-gradient(35% 35% at 12% 85%, rgba(156,39,176,.28), transparent 60%); }

/* Stage & slides */
.stage{ position:absolute; inset:0 }
.slide{
  position:absolute; inset:0; background-image:var(--img);
  background-size:cover; background-position:center;
  opacity:0; transform: scale(1.06);
  filter: saturate(1) brightness(.96) blur(2px);
  transition:
    opacity 900ms ease,
    transform 900ms cubic-bezier(.2,.7,.2,1),
    filter 900ms ease;
  will-change: opacity, transform, filter;
}
.slide.active{
  opacity:1; transform: scale(1.02);
  filter: saturate(1.05) brightness(1) blur(0px);
}
.shade{
  position:absolute; inset:0;
  background:
    linear-gradient(180deg, rgba(6,10,22,.18) 0%, rgba(6,10,22,.78) 65%, rgba(6,10,22,.92) 100%),
    radial-gradient(50% 50% at 50% 0%, rgba(0,0,0,.24), transparent 60%);
}

/* Metin – CTA yok, güçlü tipografi */
.copy{
  position:absolute; left:24px; right:24px; bottom:24px; z-index:2;
  max-width:min(780px, 92%);
  padding:16px 18px;
  background:linear-gradient(180deg, rgba(12,16,28,.55), rgba(12,16,28,.35));
  border:1px solid rgba(255,255,255,.14);
  border-radius:16px;
  backdrop-filter: blur(8px);
  box-shadow:0 16px 32px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.05);
}
.title{
  margin:0 0 8px;
  font-size:clamp(28px,5vw,54px);
  font-weight:950;
  letter-spacing:.3px;
  color:#f2f7ff;
  text-shadow:
    0 0 22px rgba(0,229,255,.20),
    0 4px 22px rgba(0,0,0,.45);
  /* premium hissi için çok ince stroke ve gradient */
  background: linear-gradient(90deg,#eaf2ff 0%, #cfe0ff 40%, #a3dfff 60%, #eaf2ff 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.sub{
  margin:0;
  font-size:clamp(14px,2.2vw,18px);
  color:#cfe0ff;
  text-shadow:0 2px 16px rgba(0,0,0,.35);
}

/* Oklar (minimal) */
.arrow{
  position:absolute; top:50%; transform:translateY(-50%);
  width:42px; height:42px; border-radius:999px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(6,10,22,.45); color:#fff; cursor:pointer;
  font-size:22px; line-height:1; z-index:3;
}
.left{ left:16px } .right{ right:16px }

/* Noktalar + progress */
.dots{ position:absolute; left:0; right:0; bottom:14px; display:flex; gap:8px; justify-content:center; z-index:3 }
.dot{ width:10px; height:10px; border-radius:999px; border:none; cursor:pointer; background:rgba(255,255,255,.35) }
.dot.active{ background:#00e5ff; box-shadow:0 0 12px rgba(0,229,255,.55) }

.progress{ position:absolute; left:24px; right:24px; bottom:8px; height:3px; background:rgba(255,255,255,.14); border-radius:999px; overflow:hidden; z-index:2 }
.bar{ width:0%; height:100%; background:linear-gradient(90deg,#00e5ff,#4aa7ff); box-shadow:0 0 14px rgba(0,229,255,.45) }
@keyframes prog{ from{ width:0% } to{ width:100% } }

@media(max-width:720px){
  .heroPremium{ height:50vh; min-height:320px }
  .arrow{ width:36px; height:36px }
  .copy{ left:16px; right:16px; bottom:16px; padding:12px 14px }
}
`;
