// web/src/pages/AnaSayfaDemo.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/** LOGO */
const LOGO =
  "https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png";

/** MOCK: Bannerlar */
const MOCK_BANNERS = [
  {
    id: 1,
    title: "2025 Yaz Mega Turnuvası",
    subtitle: "350.000 ₺ ödül havuzu seni bekliyor",
    image_url:
      "https://images.unsplash.com/photo-1521417531039-1482a3e5f1a7?q=80&w=1600&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "Ücretsiz Katılım Etkinliği",
    subtitle: "Haftalık sürpriz ödüller",
    image_url:
      "https://images.unsplash.com/photo-1517632298120-58e3b4079ab2?q=80&w=1600&auto=format&fit=crop",
  },
  {
    id: 3,
    title: "Özel Oranlı Bahisler",
    subtitle: "Sadece bugün geçerli!",
    image_url:
      "https://images.unsplash.com/photo-1533130061792-64b345e4a833?q=80&w=1600&auto=format&fit=crop",
  },
];

/** MOCK: Canlı skorlar (ticker) */
const MOCK_LIVE = [
  { id: "1", league: "Süper Lig", home: "Galatasaray", away: "Fenerbahçe", min: 62, sh: 2, sa: 0 },
  { id: "2", league: "EPL", home: "Man. City", away: "Arsenal", min: 74, sh: 1, sa: 1 },
  { id: "3", league: "LoL", home: "FNC", away: "G2", min: 23, sh: 15, sa: 11 },
  { id: "4", league: "CS:GO", home: "NAVI", away: "FaZe", min: 9, sh: 6, sa: 5 },
];

/** MOCK: Etkinlikler */
const MOCK_EVENTS = [
  { id: 11, title: "Günün Promo Kodu", desc: "NEON50", cta: "Kodu Kullan", badge: "Yeni" },
  { id: 12, title: "Ücretsiz Katılım", desc: "Haftalık sürpriz ödüller", cta: "Katıl" },
  { id: 13, title: "Özel Oranlı", desc: "Galatasaray kazanır: 3.01", cta: "Katıl" },
];

/** MOCK: Turnuvalar */
const MOCK_TOURNEYS = [
  {
    id: 101,
    title: "League of Legends Midnight Clash",
    prize: 50000,
    img: "https://images.unsplash.com/photo-1533236897111-3e94666b2edf?q=80&w=1200&auto=format&fit=crop",
    startsAt: "2025-08-01T20:00:00Z",
  },
  {
    id: 102,
    title: "CS:GO Lightning Masters",
    prize: 15000,
    img: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop",
    startsAt: "2025-08-03T19:30:00Z",
  },
  {
    id: 103,
    title: "Valorant Spike Cup",
    prize: 25000,
    img: "https://images.unsplash.com/photo-1547949003-9792a18a2601?q=80&w=1200&auto=format&fit=crop",
    startsAt: "2025-08-05T18:00:00Z",
  },
];

export default function AnaSayfaDemo() {
  return (
    <div className="page">
      <Header />
      <LiveTicker />
      <Hero />
      <EventsRow />
      <Tournaments />
      <Footer />
      <style>{css}</style>
    </div>
  );
}

/* ---------------- Header ---------------- */
function Header() {
  return (
    <header className="header">
      <div className="brand">
        <img src={LOGO} alt="Logo" />
        <span>Ana Sayfa Demo</span>
      </div>
      <nav className="nav">
        <a href="#" onClick={(e) => e.preventDefault()}>
          Ana Sayfa
        </a>
        <a href="#" onClick={(e) => e.preventDefault()}>
          Turnuvalar
        </a>
        <a href="#" onClick={(e) => e.preventDefault()}>
          Etkinlikler
        </a>
      </nav>
    </header>
  );
}

/* ---------------- Live Ticker ---------------- */
function LiveTicker() {
  // Why: Demo — her 4 sn’de bir skorları döndürerek hareket hissi veriyoruz.
  const [list, setList] = useState(MOCK_LIVE);
  useEffect(() => {
    const t = setInterval(() => {
      setList((prev) => {
        const [first, ...rest] = prev;
        return [...rest, first];
      });
    }, 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="ticker">
      <div className="track">
        {list.concat(list).map((m, i) => (
          <span key={`${m.id}-${i}`} className="item">
            <b>{m.league}</b> • {m.home} {m.sh}-{m.sa} {m.away} <em>{m.min}'</em>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Hero (Slider) ---------------- */
function Hero() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const len = MOCK_BANNERS.length;
  const idx = useMemo(() => (len ? i % len : 0), [i, len]);

  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (paused || len < 2) return;
    timer.current = window.setInterval(() => setI((x) => (x + 1) % len), 4000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [paused, len]);

  return (
    <section
      className="hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {MOCK_BANNERS.map((b, k) => (
        <div
          key={b.id}
          className="slide"
          style={{ opacity: k === idx ? 1 : 0, backgroundImage: `url("${b.image_url}")` }}
        >
          <div className="overlay">
            <div className="texts">
              <h2>{b.title}</h2>
              <p>{b.subtitle}</p>
              <button className="cta">Şimdi Katıl</button>
            </div>
          </div>
        </div>
      ))}

      {len > 1 && (
        <>
          <button className="nav left" onClick={() => setI((x) => (x - 1 + len) % len)} aria-label="Önceki">
            ‹
          </button>
          <button className="nav right" onClick={() => setI((x) => (x + 1) % len)} aria-label="Sonraki">
            ›
          </button>
          <div className="dots">
            {MOCK_BANNERS.map((_, k) => (
              <button key={k} className={`dot ${k === idx ? "active" : ""}`} onClick={() => setI(k)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* ---------------- Events ---------------- */
function EventsRow() {
  return (
    <section className="section">
      <h3 className="sec-title">ETKİNLİKLER</h3>
      <div className="grid three">
        {MOCK_EVENTS.map((e) => (
          <div key={e.id} className="card">
            <div className="card-head">
              <span className="badge">{e.badge ?? "Etkinlik"}</span>
            </div>
            <h4>{e.title}</h4>
            <p className="muted">{e.desc}</p>
            <button className="btn">{e.cta}</button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Tournaments ---------------- */
function Tournaments() {
  return (
    <section className="section">
      <h3 className="sec-title">TURNUVALAR</h3>
      <div className="grid three">
        {MOCK_TOURNEYS.map((t) => (
          <div key={t.id} className="t-card">
            <div className="cover" style={{ backgroundImage: `url("${t.img}")` }} />
            <div className="t-body">
              <h4>{t.title}</h4>
              <p className="muted">Ödül Havuzu: {formatTRY(t.prize)}</p>
              <button className="btn">Katıl</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function Footer() {
  return (
    <footer className="footer">
      <span>© {new Date().getFullYear()} Radisson Spin • Demo</span>
    </footer>
  );
}

/* ---------------- Util ---------------- */
function formatTRY(n: number) {
  return new Intl.NumberFormat("tr-TR").format(n) + " ₺";
}

/* ---------------- CSS ---------------- */
const css = `
:root{
  --bg:#0a0b0f; --card:#11151f; --line:#1b2130; --text:#e8ebf1; --muted:#9aa3b7;
  --accent:#7c3aed; --accent2:#06b6d4; --red:#ff0033;
}
*{box-sizing:border-box}
body{margin:0}
.page{min-height:100vh;background:linear-gradient(180deg,#0b0e14,#0a0b10)}
.header{max-width:1200px;margin:16px auto;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.brand{display:flex;align-items:center;gap:12px}
.brand img{height:28px}
.brand span{color:#fff;font-weight:800;letter-spacing:.4px}
.nav a{color:#cdd5e1;text-decoration:none;margin-left:12px}
.nav a:hover{color:#fff}

/* Ticker */
.ticker{max-width:1200px;margin:10px auto;padding:8px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);overflow:hidden}
.track{display:inline-block;white-space:nowrap;animation:marq 22s linear infinite}
.item{display:inline-flex;gap:8px;color:#cbd5e1;margin-right:22px}
.item b{color:#fff}
.item em{font-style:normal;color:#93c5fd}
@keyframes marq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

/* Hero */
.hero{position:relative;max-width:1200px;height:min(58vh,520px);min-height:340px;margin:12px auto;border-radius:20px;overflow:hidden;background:#0e1422}
.slide{position:absolute;inset:0;background-size:cover;background-position:center;transition:opacity .9s ease}
.overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(7,10,14,.75));display:flex;align-items:flex-end}
.texts{padding:26px;color:#fff}
.texts h2{margin:0 0 8px;font-size:clamp(18px,3.6vw,30px);font-weight:800}
.texts p{margin:0 0 12px;color:#cbd5e1}
.cta{background:linear-gradient(90deg,var(--accent),var(--accent2));border:none;color:#fff;border-radius:10px;padding:10px 14px;cursor:pointer}
.cta:hover{filter:brightness(1.05)}
.nav{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.35);color:#fff;font-size:24px}
.left{left:12px}.right{right:12px}
.dots{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:8px}
.dot{width:10px;height:10px;border-radius:999px;border:none;background:rgba(255,255,255,.5);cursor:pointer}
.dot.active{background:#fff}

/* Section */
.section{max-width:1200px;margin:18px auto;padding:0 16px}
.sec-title{color:#fff;margin:0 0 10px;font-size:14px;letter-spacing:1px}
.grid{display:grid;gap:12px}
.grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
@media(max-width:900px){.grid.three{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;color:#fff}
.card .badge{display:inline-block;background:#1a1030;color:#e9d5ff;border:1px solid #2d184f;border-radius:999px;padding:4px 8px;font-size:12px}
.card h4{margin:8px 0 6px}
.card .muted{color:var(--muted)}
.btn{border:1px solid #263042;background:#0f172a;color:#fff;border-radius:10px;padding:8px 10px;cursor:pointer}
.btn:hover{background:#111c34}

/* Tournament cards */
.t-card{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;color:#fff;display:flex;flex-direction:column}
.cover{height:160px;background-size:cover;background-position:center}
.t-body{padding:12px}
.t-body h4{margin:0 0 6px}

/* Footer */
.footer{max-width:1200px;margin:24px auto 30px;color:#94a3b8;text-align:center;padding:0 16px}
`;

/*
Demo sayfa:
- Tüm veriler MOCK; backend bağımsızdır.
- Ticker CSS animasyonu ile akar; üstte 4sn'de bir listeyi döndürerek canlı his verir.
- Hero slider autoplay + ok + dot içerir, hover’da durur.
*/
