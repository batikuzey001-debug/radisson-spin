// web/src/components/Hero.tsx
import { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    fetch(`${API}/api/home/banners`)
      .then((r) => r.json())
      .then((rows) => setItems(Array.isArray(rows) ? rows.filter((b)=>!!b?.image_url) : []))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (!items.length || paused) return;
    timer.current = window.setInterval(
      () => setIdx((i) => (i + 1) % items.length),
      5000
    );
    return () => timer.current && window.clearInterval(timer.current);
  }, [items, paused]);

  if (!items.length) {
    return (
      <section className="hero fallback">
        <div className="inner">
          <h1 className="title">Radisson Spin</h1>
          <p className="sub">Kampanyalar ve turnuvalar burada</p>
          <div className="cta">
            <a className="btn primary" href="#" onClick={(e)=>e.preventDefault()}>Hemen Başla</a>
            <a className="btn ghost" href="#" onClick={(e)=>e.preventDefault()}>Detay</a>
          </div>
        </div>
        <style>{css}</style>
      </section>
    );
  }

  const current = items[idx];

  return (
    <section
      className="hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ ["--img" as any]: `url('${current.image_url}')` }}
    >
      <div className="shade" />
      <div className="inner">
        <div className="text">
          <h1 className="title">{current.title || "Radisson Spin"}</h1>
          {current.subtitle && <p className="sub">{current.subtitle}</p>}
          <div className="cta">
            <a className="btn primary" href="#" onClick={(e)=>e.preventDefault()}>Şimdi Katıl</a>
            <a className="btn ghost" href="#" onClick={(e)=>e.preventDefault()}>Detay</a>
          </div>
        </div>

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

        <div className="dots">
          {items.map((_, i) => (
            <button
              key={i}
              className={`dot ${i === idx ? "active" : ""}`}
              onClick={() => setIdx(i)}
              aria-label={`Slayt ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <style>{css}</style>
    </section>
  );
}

const css = `
.hero{
  position:relative; height:min(58vh,560px); min-height:320px;
  border-radius:20px; overflow:hidden; margin:12px auto;
  background-image:var(--img); background-size:cover; background-position:center;
}
.hero.fallback{
  position:relative; height:min(58vh,560px); min-height:320px;
  border-radius:20px; overflow:hidden; margin:12px auto;
  background:linear-gradient(180deg,#0b1224,#0e1a33);
}
.shade{
  position:absolute; inset:0;
  background:
    linear-gradient(180deg, rgba(6,10,22,.25) 0%, rgba(6,10,22,.78) 65%, rgba(6,10,22,.92) 100%),
    radial-gradient(60% 60% at 80% 0%, rgba(0,229,255,.12), transparent 60%);
  backdrop-filter: blur(2px);
}
.inner{position:relative; z-index:1; height:100%; display:flex; align-items:flex-end; padding:22px}
.text{max-width:720px}
.title{margin:0 0 6px; font-size:clamp(26px, 4.8vw, 46px); font-weight:900; color:#eaf2ff; letter-spacing:.2px}
.sub{margin:0 0 12px; color:#cfe0ff; font-size:clamp(14px, 2.4vw, 18px)}
.cta{display:flex; gap:10px; flex-wrap:wrap}
.btn{display:inline-block; padding:10px 14px; text-decoration:none; border-radius:12px; border:1px solid rgba(255,255,255,.14); color:#eaf2ff}
.btn.primary{background:linear-gradient(90deg,#00e5ff,#4aa7ff); color:#001018; border-color:#0f6d8c; font-weight:900}
.btn.ghost{background:transparent}

.arrow{
  position:absolute; top:50%; transform:translateY(-50%);
  width:42px; height:42px; border-radius:999px; border:1px solid rgba(255,255,255,.18);
  background:rgba(6,10,22,.45); color:#fff; cursor:pointer; font-size:20px; line-height:1;
}
.left{left:12px} .right{right:12px}

.dots{
  position:absolute; left:0; right:0; bottom:14px; display:flex; gap:8px; justify-content:center
}
.dot{width:10px; height:10px; border-radius:999px; background:rgba(255,255,255,.35); border:none; cursor:pointer}
.dot.active{background:#00e5ff; box-shadow:0 0 10px rgba(0,229,255,.55)}

@media(max-width:600px){
  .hero{height:46vh}
  .arrow{width:36px; height:36px}
}
`;
