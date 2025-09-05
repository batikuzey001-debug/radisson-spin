// web/src/components/Hero.tsx
import { useEffect, useRef, useState, useMemo } from "react";

/**
 * HERO — Premium + Küçük İstatistik Kartları (₺)
 * - Arka plan slider (cross-fade + depth)
 * - Altta küçük istatistik kartları: ₺ tutarlar
 * - Tutarlar /api/hero/stats'tan gelir (admin değiştirilebilir); yoksa fallback
 * - Tutarlar ekranda küçük-küçük salınır (drift) ama tabandan uzaklaşmaz
 * - Kartlar kompakt (küçük), mobil uyumlu
 */

type Banner = {
  id: string | number;
  image_url: string;
  title?: string | null;
  subtitle?: string | null;
};

type HeroStats = {
  today_payout?: number;   // Bugün Ödeme (₺)
  jackpot?: number;        // Anlık Jackpot (₺)
  total_payout?: number;   // Toplam Kazanç (₺)
};

type AnyRow = { status?: string | null; start_at?: string | null; end_at?: string | null; created_at?: string | null };

const API = import.meta.env.VITE_API_BASE_URL;

/* -------------------- HERO -------------------- */
export default function Hero() {
  const [items, setItems] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | null>(null);
  const progRef = useRef<HTMLDivElement | null>(null);

  // İstatistik ₺ — taban (api'den), gösterilen (drift'li)
  const [baseStats, setBaseStats] = useState<Required<HeroStats>>({
    today_payout: 250000,   // fallback
    jackpot: 1250000,
    total_payout: 78500000,
  } as Required<HeroStats>);
  const [showStats, setShowStats] = useState<Required<HeroStats>>(baseStats);

  // Slide fetch
  useEffect(() => {
    fetch(`${API}/api/home/banners`)
      .then((r) => r.json())
      .then((rows) => {
        const arr = (Array.isArray(rows) ? rows : []).filter((b) => !!b?.image_url);
        setItems(arr.length ? arr : fallback);
      })
      .catch(() => setItems(fallback));
  }, []);

  // İstatistik (₺) fetch
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API}/api/hero/stats`);
        if (r.ok) {
          const js: HeroStats = await r.json();
          const today = toNum(js.today_payout, baseStats.today_payout);
          const jack  = toNum(js.jackpot,      baseStats.jackpot);
          const total = toNum(js.total_payout, baseStats.total_payout);
          if (!alive) return;
          const b = { today_payout: today, jackpot: jack, total_payout: total } as Required<HeroStats>;
          setBaseStats(b);
          setShowStats(b);
        }
      } catch {/* fallback kullan */}
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ek küçük drift — her 5sn'de tabana doğru yaklaş + hafif jitter
  useEffect(() => {
    const t = setInterval(() => {
      setShowStats((cur) => ({
        today_payout: drift(cur.today_payout, baseStats.today_payout, 0.008),
        jackpot:      drift(cur.jackpot,      baseStats.jackpot,      0.006),
        total_payout: drift(cur.total_payout, baseStats.total_payout, 0.003),
      }));
    }, 5000);
    return () => clearInterval(t);
  }, [baseStats]);

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
      {/* Glow arkaplan */}
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      {/* Slides stack */}
      <div className="stage">
        {items.map((b, i) => (
          <div
            key={b.id ?? i}
            className={`slide ${i === idx ? "active" : ""}`}
            style={{ ["--img" as any]: `url('${b.image_url}')` }}
            aria-hidden={i !== idx}
          />
        ))}
        <div className="shade" />
      </div>

      {/* Metin + ₺ küçük istatistik kartları */}
      <div className="dock">
        <div className="copy">
          <h1 className="title">{items[idx].title || "Radisson Spin"}</h1>
          {items[idx].subtitle && <p className="sub">{items[idx].subtitle}</p>}
        </div>

        <div className="miniStats">
          <MoneyTile label="Bugün Ödeme" value={showStats.today_payout} />
          <MoneyTile label="Anlık Jackpot" value={showStats.jackpot} />
          <MoneyTile label="Toplam Kazanç" value={showStats.total_payout} />
        </div>
      </div>

      {/* Nav okları */}
      <button className="arrow left" aria-label="Önceki" onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)}>
        ‹
      </button>
      <button className="arrow right" aria-label="Sonraki" onClick={() => setIdx((i) => (i + 1) % items.length)}>
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

/* -------------------- Kart: ₺ -------------------- */
function MoneyTile({ label, value }: { label: string; value: number }) {
  const txt = useMemo(() => formatTRY(value), [value]);
  return (
    <div className="mcard" title={txt}>
      <div className="mval">{txt}</div>
      <div className="mlab">{label}</div>
    </div>
  );
}

/* -------------------- Yardımcılar -------------------- */
function toNum(v: any, def: number) {
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : def;
}
function formatTRY(n: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Math.max(0, Math.floor(n))) + " ₺";
}
function drift(cur: number, base: number, ratio = 0.01) {
  const toward = cur + (base - cur) * 0.25;              // tabana yaklaş
  const jitter = (Math.random() - 0.5) * (base * ratio); // hafif salınım
  const next = Math.max(0, toward + jitter);
  return next;
}

/* -------------------- Fallback Bannerlar -------------------- */
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

/* -------------------- Stil -------------------- */
const css = `
.heroPremium{
  position:relative;
  height:min(58vh,540px);
  min-height:320px;
  border-radius:20px;
  overflow:hidden;
  margin:12px auto 18px;
  isolation:isolate;
}

/* Glow */
.glow{
  position:absolute; inset:-22%;
  pointer-events:none; mix-blend-mode:screen; opacity:.32;
  filter: blur(60px);
}
.glow-a{ background: radial-gradient(40% 40% at 80% 10%, rgba(0,229,255,.35), transparent 60%); }
.glow-b{ background: radial-gradient(35% 35% at 12% 85%, rgba(156,39,176,.28), transparent 60%); }

/* Slides */
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
    linear-gradient(180deg, rgba(6,10,22,.18) 0%, rgba(6,10,22,.78) 65%, rgba(6,10,22,.9) 100%),
    radial-gradient(50% 50% at 50% 0%, rgba(0,0,0,.22), transparent 60%);
}

/* Alt dock: metin + mini stats (kompakt) */
.dock{
  position:absolute; inset:0; display:flex; flex-direction:column; justify-content:flex-end; z-index:2;
  padding:16px;
  gap:10px;
}

/* Metin */
.copy{
  max-width:min(760px, 92%);
  padding:12px 14px;
  background:linear-gradient(180deg, rgba(12,16,28,.55), rgba(12,16,28,.35));
  border:1px solid rgba(255,255,255,.14);
  border-radius:14px;
  backdrop-filter: blur(8px);
  box-shadow:0 12px 26px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.05);
}
.title{
  margin:0 0 6px;
  font-size:clamp(24px,4.6vw,44px);
  font-weight:950; letter-spacing:.3px;
  background: linear-gradient(90deg,#eaf2ff 0%, #cfe0ff 40%, #a3dfff 60%, #eaf2ff 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  text-shadow:0 0 18px rgba(0,229,255,.18), 0 4px 18px rgba(0,0,0,.45);
}
.sub{ margin:0; font-size:clamp(13px,2.1vw,16px); color:#cfe0ff; text-shadow:0 2px 14px rgba(0,0,0,.35) }

/* Mini ₺ stats (kompakt kartlar) */
.miniStats{
  display:flex; gap:8px; flex-wrap:wrap;
}
.mcard{
  min-width:140px;
  padding:10px 12px;
  background:linear-gradient(180deg, rgba(10,16,30,.55), rgba(10,16,30,.35));
  border:1px solid rgba(255,255,255,.12);
  border-radius:10px; backdrop-filter:blur(6px);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.05);
}
.mval{
  font-weight:1000; font-size:clamp(18px,4vw,24px);
  color:#e9fbff; text-shadow:0 0 14px rgba(0,229,255,.35);
}
.mlab{
  font-size:11px; letter-spacing:.5px; color:#a7bddb; margin-top:4px;
}

/* Oklar */
.arrow{
  position:absolute; top:50%; transform:translateY(-50%);
  width:38px; height:38px; border-radius:999px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(6,10,22,.45); color:#fff; cursor:pointer;
  font-size:20px; line-height:1; z-index:3;
}
.left{ left:12px } .right{ right:12px }

/* Noktalar + progress */
.dots{ position:absolute; left:0; right:0; bottom:12px; display:flex; gap:8px; justify-content:center; z-index:3 }
.dot{ width:8px; height:8px; border-radius:999px; border:none; cursor:pointer; background:rgba(255,255,255,.35) }
.dot.active{ background:#00e5ff; box-shadow:0 0 10px rgba(0,229,255,.5) }

.progress{ position:absolute; left:16px; right:16px; bottom:6px; height:3px; background:rgba(255,255,255,.14); border-radius:999px; overflow:hidden; z-index:2 }
.bar{ width:0%; height:100%; background:linear-gradient(90deg,#00e5ff,#4aa7ff); box-shadow:0 0 12px rgba(0,229,255,.45) }
@keyframes prog{ from{ width:0% } to{ width:100% } }

@media(max-width:720px){
  .heroPremium{ height:48vh; min-height:300px }
  .arrow{ width:34px; height:34px }
  .dock{ padding:12px; gap:8px }
  .mcard{ min-width:120px; padding:8px 10px }
}
`;
