// web/src/components/Hero.tsx
import { useEffect, useState } from "react";

/**
 * HERO v2 — Üstte büyük banner, altında 3 premium metrik kartı
 * - Arkaplan artış scripti YOK; tek sefer fetch
 * - Uyumlu tipografi: Inter (label) + Rajdhani (sayı)
 * - Cam rozet ikonlar, progress bar kaldırıldı
 */

const API = import.meta.env.VITE_API_BASE_URL;

type HeroStats = {
  total_min: number; total_max: number;
  dist_min:  number; dist_max:  number;
  part_min:  number; part_max:  number;
};
type Banner = { id: string | number; image_url: string };

const fmt = (n: number) => new Intl.NumberFormat("tr-TR").format(Math.max(0, Math.floor(n)));

export default function Hero() {
  const [slides, setSlides] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);

  const [ranges, setRanges] = useState<HeroStats>({
    total_min: 60_000_000, total_max: 95_000_000,
    dist_min:    200_000,  dist_max:   1_200_000,
    part_min:    300_000,  part_max:     800_000,
  });

  // Gösterilecek sabit değerler (tek fetch ile ayarlanır)
  const [total, setTotal] = useState(78_500_000);
  const [dist,  setDist]  = useState(735_000);
  const [part,  setPart]  = useState(542_000);

  /* ------- Bannerlar ------- */
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
  }, [slides.length]);

  /* ------- Stats (tek sefer) ------- */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/api/home/stats`, { cache: "no-store" });
        if (!r.ok) return;
        const js: Partial<HeroStats> = await r.json();
        const merged: HeroStats = {
          total_min: js.total_min ?? ranges.total_min, total_max: js.total_max ?? ranges.total_max,
          dist_min:  js.dist_min  ?? ranges.dist_min,  dist_max:  js.dist_max  ?? ranges.dist_max,
          part_min:  js.part_min  ?? ranges.part_min,  part_max:  js.part_max  ?? ranges.part_max,
        };
        setRanges(merged);
        // Göze hoş sabit değer: altın oran ~0.62
        const pick = (a: number, b: number) => Math.round((a + 0.62 * (b - a)) / 1000) * 1000;
        setTotal(pick(merged.total_min, merged.total_max));
        setDist (pick(merged.dist_min,  merged.dist_max));
        setPart (pick(merged.part_min,  merged.part_max));
      } catch { /* sessiz */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="heroV2" aria-label="Hero alanı">
      {/* BÜYÜK BANNER */}
      <div className="banner">
        {slides.map((b, i) => (
          <div
            key={b.id}
            className={`bg ${i === idx ? "active" : ""}`}
            style={{ ["--img" as any]: `url('${b.image_url}')` }}
          />
        ))}
        <div className="shade" />
      </div>

      {/* METRİKLER */}
      <div className="metrics">
        <StatCard
          tone="gold"
          icon="coins"
          label="Toplam Ödül"
          value={fmt(total)}
          suffix=" ₺"
        />
        <StatCard
          tone="aqua"
          icon="gift"
          label="Dağıtılan Ödül"
          value={fmt(dist)}
          suffix=" ₺"
        />
        <StatCard
          tone="vio"
          icon="users"
          label="Katılımcı"
          value={fmt(part)}
          suffix=""
        />
      </div>

      <style>{css}</style>
    </section>
  );
}

/* ------- Stat Card ------- */
function StatCard({
  tone, icon, label, value, suffix
}: {
  tone: "gold" | "aqua" | "vio";
  icon: "coins" | "gift" | "users";
  label: string;
  value: string;
  suffix: string;
}) {
  const path =
    icon === "coins" ? "M12 6a4 2 0 1 1 0 4 4 2 0 0 1 0-4Zm-6 6a4 2 0 1 0 8 0 4 2 0 0 0-8 0Zm12-2a4 2 0 1 0 0 4 4 2 0 0 0 0-4Z"
    : icon === "gift" ? "M20 7h-3.2a2.8 2.8 0 1 0-5.6 0H8A2 2 0 0 0 6 9v2h12V9a2 2 0 0 0 2-2Zm-8-2a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 12 5ZM6 13v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7H6Z"
    : "M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 7a6 6 0 0 1 12 0v1H5Z";

  return (
    <article className={`stat ${tone}`} title={`${label}: ${value}${suffix}`}>
      {/* Cam rozet ikon */}
      <div className="badge" aria-hidden>
        <span className="ring" />
        <svg viewBox="0 0 24 24" className="glyph"><path d={path} /></svg>
      </div>

      <div className="content">
        <div className="label">{label}</div>
        <div className="number">
          <span className="val">{value}</span>
          <span className="suf">{suffix}</span>
        </div>
      </div>
    </article>
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800;900&family=Rajdhani:wght@700;800;900&display=swap');

.heroV2{
  display:flex; flex-direction:column; gap:18px;
  font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;
}

/* Daha büyük banner */
.banner{
  position:relative; min-height:420px; border-radius:18px; overflow:hidden;
  box-shadow:0 18px 40px rgba(0,0,0,.42), inset 0 0 0 1px rgba(255,255,255,.04);
}
@media(max-width:900px){ .banner{ min-height:340px } }
.bg{
  position:absolute; inset:0; background-image:var(--img);
  background-size:cover; background-position:center;
  opacity:0; transform:scale(1.06); filter:brightness(.9) contrast(1.02);
  transition:opacity .8s ease, transform .8s ease, filter .8s ease;
}
.bg.active{ opacity:1; transform:scale(1.02); filter:brightness(1) }
.shade{
  position:absolute; inset:0; pointer-events:none;
  background:
    radial-gradient(120% 90% at 90% 10%, rgba(5,10,22,0), rgba(5,10,22,.55) 70%),
    linear-gradient(180deg, rgba(6,10,22,.08) 0%, rgba(6,10,22,.84) 66%, rgba(6,10,22,.92) 100%);
}

/* Metrikler — banner ALTINDA */
.metrics{
  display:grid; gap:14px;
  grid-template-columns: repeat(3, minmax(0,1fr));
}
@media(max-width:900px){ .metrics{ grid-template-columns:1fr } }

/* Kart */
.stat{
  position:relative; display:flex; align-items:center; gap:12px;
  border-radius:16px; padding:14px 16px; overflow:hidden;
  background:linear-gradient(180deg, rgba(18,24,40,.58), rgba(14,20,36,.38));
  border:1px solid rgba(255,255,255,.10);
  box-shadow:0 16px 32px rgba(0,0,0,.42), inset 0 0 0 1px rgba(255,255,255,.04);
  isolation:isolate;
}
.stat.gold{ --t1:#f7c948; --t2:#f59e0b; --txt:#fff }
.stat.aqua{ --t1:#06d6ff; --t2:#118ab2; --txt:#eaffff }
.stat.vio { --t1:#bb86fc; --t2:#7c3aed; --txt:#f3e8ff }

/* Cam rozet ikon */
.stat .badge{
  position:relative; width:48px; height:48px; border-radius:999px; flex:0 0 48px;
  display:grid; place-items:center;
  background:linear-gradient(180deg, color-mix(in oklab, var(--t1) 35%, #0b1224), color-mix(in oklab, var(--t2) 35%, #0b1224));
  box-shadow:
    0 10px 24px color-mix(in oklab, var(--t1) 40%, transparent),
    inset 0 0 0 1px rgba(255,255,255,.18);
}
.stat .badge .ring{
  position:absolute; inset:-3px; border-radius:999px;
  background:conic-gradient(from 0deg, var(--t1), var(--t2), var(--t1));
  filter: blur(10px); opacity:.5; animation:spin 4s linear infinite;
}
@keyframes spin{ to { transform: rotate(360deg) } }
.stat .badge .glyph{
  width:24px; height:24px; z-index:1; color:#06101a;
  filter:drop-shadow(0 2px 8px rgba(0,0,0,.35));
}
.stat .badge .glyph path{ fill:currentColor }

/* İçerik */
.stat .content{ display:flex; flex-direction:column; gap:4px; min-width:0; }
.stat .label{
  font: 800 12px/1 Inter,system-ui,sans-serif;
  letter-spacing:.9px; text-transform:uppercase; color:#cfe1ff; opacity:.95;
}
.stat .number{
  display:flex; align-items:baseline; gap:6px; color:var(--txt);
  font-family:Rajdhani,system-ui,sans-serif; font-weight:900; line-height:1;
  font-size: clamp(24px, 5.2vw, 38px);
  text-shadow:0 0 12px color-mix(in oklab, var(--t1) 35%, transparent);
}
.stat .number .suf{ font-size:.58em; opacity:.9 }

/* Küçük ekran optimizasyonu */
@media(max-width:900px){
  .stat{ padding:12px 14px }
  .stat .badge{ width:44px; height:44px; flex-basis:44px }
  .stat .badge .glyph{ width:22px; height:22px }
}
`;
