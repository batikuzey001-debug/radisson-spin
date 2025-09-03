// web/src/pages/AnaSayfaDemo.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/* =========================================================
   ANA SAYFA DEMO (Mock-up)
   - Koyu lacivert + aqua vurgu
   - Header: logo, canlı oyuncu sayısı, Giriş + Hızlı Bonus
   - Canlı skor ticker (logolu, marquee)
   - Hero slider (autoplay)
   - Hızlı Bonus bölümü (geri sayım, #bonus)
   - Mini Oyunlar (4 interaktif demo kartı)
   - Turnuva kartları
   ========================================================= */

/* ---------- Sabitler ---------- */
const LOGO =
  "https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png";

/* Banner Mock */
const BANNERS = [
  {
    id: 1,
    title: "Mega Turnuva",
    subtitle: "350.000 ₺ ödül havuzu • Hemen katıl",
    image_url:
      "https://images.unsplash.com/photo-1521417531039-1482a3e5f1a7?q=80&w=1600&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "Günlük Bonus",
    subtitle: "Her gün sürpriz avantajlar",
    image_url:
      "https://images.unsplash.com/photo-1517632298120-58e3b4079ab2?q=80&w=1600&auto=format&fit=crop",
  },
  {
    id: 3,
    title: "Özel Etkinlik",
    subtitle: "Sınırlı süreli kampanyalar",
    image_url:
      "https://images.unsplash.com/photo-1533130061792-64b345e4a833?q=80&w=1600&auto=format&fit=crop",
  },
];

/* Ticker Mock (logolu) */
const LIVE_TICKER = [
  { id: "1", logo: "⚽", league: "Süper Lig", home: "GS", away: "FB", min: 62, sh: 2, sa: 0 },
  { id: "2", logo: "🏆", league: "EPL", home: "MCI", away: "ARS", min: 74, sh: 1, sa: 1 },
  { id: "3", logo: "🕹️", league: "LoL", home: "FNC", away: "G2", min: 23, sh: 15, sa: 11 },
  { id: "4", logo: "🎯", league: "CS:GO", home: "NAVI", away: "FaZe", min: 9, sh: 6, sa: 5 },
];

/* Turnuva Mock */
const TOURNEYS = [
  {
    id: 101,
    title: "League of Legends Midnight Clash",
    prize: 50000,
    img: "https://images.unsplash.com/photo-1533236897111-3e94666b2edf?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 102,
    title: "CS:GO Lightning Masters",
    prize: 15000,
    img: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 103,
    title: "Valorant Spike Cup",
    prize: 25000,
    img: "https://images.unsplash.com/photo-1547949003-9792a18a2601?q=80&w=1200&auto=format&fit=crop",
  },
];

/* Hızlı Bonus Mock (geri sayım hedefi) */
const BONUS_DEADLINE = new Date(Date.now() + 1000 * 60 * 45); // 45 dk sonra

export default function AnaSayfaDemo() {
  return (
    <div className="demo-page">
      <Header />
      <Ticker />
      <Hero />
      <QuickBonus />
      <MiniGames />
      <Tournaments />
      <Footer />
      <style>{css}</style>
    </div>
  );
}

/* ===================== HEADER ===================== */
function Header() {
  const [online, setOnline] = useState<number>(() => 4820 + Math.floor(Math.random() * 500));
  const [dir, setDir] = useState<1 | -1>(1);

  // Why: Demo online sayacı için küçük dalgalanma efekti
  useEffect(() => {
    const t = setInterval(() => {
      setOnline((n) => {
        const delta = Math.floor(Math.random() * 20) * dir;
        let next = n + delta;
        if (next < 4200 || next > 5800) setDir((d) => (d === 1 ? -1 : 1)); // sınırlar
        return Math.max(4200, Math.min(5800, next));
      });
    }, 5000);
    return () => clearInterval(t);
  }, [dir]);

  return (
    <header className="hdr">
      <div className="hdr__inner">
        <div className="hdr__brand">
          <img src={LOGO} alt="Logo" />
          <span>Radisson Spin</span>
        </div>

        <nav className="hdr__nav">
          <a href="/" onClick={(e) => e.preventDefault()}>
            Ana Sayfa
          </a>
          <a href="#" onClick={(e) => e.preventDefault()}>
            Turnuvalar
          </a>
          <a href="#" onClick={(e) => e.preventDefault()}>
            Etkinlikler
          </a>
        </nav>

        <div className="hdr__actions">
          <OnlinePill value={online} />
          <a className="btn primary" href="#" onClick={(e) => e.preventDefault()}>
            Radissonbet Giriş
          </a>
          <a
            className="btn ghost"
            href="#bonus"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById("bonus");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Hızlı Bonus
          </a>
        </div>
      </div>
    </header>
  );
}

function OnlinePill({ value }: { value: number }) {
  return (
    <span className="pill">
      <span className="dot" />
      <b>{new Intl.NumberFormat("tr-TR").format(value)}</b> çevrim içi
    </span>
  );
}

/* ===================== TICKER ===================== */
function Ticker() {
  const [list, setList] = useState(LIVE_TICKER);

  // Why: Demo—kayarken listeyi döndür, hep canlı dursun
  useEffect(() => {
    const t = setInterval(() => {
      setList((prev) => {
        const [f, ...rest] = prev;
        return [...rest, f];
      });
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="ticker">
      <div className="ticker__track">
        {list.concat(list).map((m, i) => (
          <span key={`${m.id}-${i}`} className="ticker__item">
            <span className="logo">{m.logo}</span>
            <span className="lg">{m.league}</span>
            <span className="teams">
              {m.home} <b>{m.sh}</b> - <b>{m.sa}</b> {m.away}
            </span>
            <span className="min">{m.min}'</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ===================== HERO ===================== */
function Hero() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const len = BANNERS.length;
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
      {BANNERS.map((b, k) => (
        <div
          key={b.id}
          className="hero__slide"
          style={{ opacity: k === idx ? 1 : 0, backgroundImage: `url("${b.image_url}")` }}
        >
          <div className="hero__overlay">
            <div className="hero__text">
              <h2>{b.title}</h2>
              <p>{b.subtitle}</p>
              <button className="btn grad">Şimdi Katıl</button>
            </div>
          </div>
        </div>
      ))}

      {len > 1 && (
        <>
          <button
            className="hero__nav hero__nav--l"
            onClick={() => setI((x) => (x - 1 + len) % len)}
            aria-label="Önceki"
          >
            ‹
          </button>
          <button
            className="hero__nav hero__nav--r"
            onClick={() => setI((x) => (x + 1) % len)}
            aria-label="Sonraki"
          >
            ›
          </button>
          <div className="hero__dots">
            {BANNERS.map((_, k) => (
              <button
                key={k}
                className={`dot ${k === idx ? "active" : ""}`}
                onClick={() => setI(k)}
                aria-label={`Slayt ${k + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* ===================== QUICK BONUS ===================== */
function QuickBonus() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const { d, h, m, s } = getRemaining(BONUS_DEADLINE, now);

  return (
    <section id="bonus" className="section">
      <h3 className="sec-title">HIZLI BONUS</h3>
      <div className="bonus">
        <div className="bonus__media" />
        <div className="bonus__body">
          <h4>Bugünün Ücretsiz Bonusu</h4>
          <p className="muted">Sınırlı süre için geçerli. Zaman dolmadan al!</p>
          <div className="timer">
            <TimerBox label="SAAT" value={pad2(h + d * 24)} />
            <TimerBox label="DAKİKA" value={pad2(m)} />
            <TimerBox label="SANİYE" value={pad2(s)} />
          </div>
          <div className="bonus__actions">
            <button className="btn grad">Hemen Al</button>
            <button
              className="btn ghost"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              En Üste Çık
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
function TimerBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="tbox">
      <div className="tbox__val">{value}</div>
      <div className="tbox__lbl">{label}</div>
    </div>
  );
}

/* ===================== MINI GAMES ===================== */
function MiniGames() {
  return (
    <section className="section">
      <h3 className="sec-title">MİNİ OYUNLAR</h3>
      <div className="grid four">
        <ClickRush />
        <ScratchDemo />
        <VoteBar />
        <ReflexTest />
      </div>
    </section>
  );
}

function ClickRush() {
  const [count, setCount] = useState(0);
  const [left, setLeft] = useState(5);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const int = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000);
    const end = setTimeout(() => setRunning(false), 5000);
    return () => {
      clearInterval(int);
      clearTimeout(end);
    };
  }, [running]);
  return (
    <div className="card game">
      <h4>Hız Tıkla</h4>
      <p className="muted">5 sn içinde en çok tıkla!</p>
      <div className="bar">
        <div className="bar__fill" style={{ width: `${(left / 5) * 100}%` }} />
      </div>
      <div className="row">
        <button
          className="btn grad"
          disabled={running}
          onClick={() => {
            setCount(0);
            setLeft(5);
            setRunning(true);
          }}
        >
          Başlat
        </button>
        <button className="btn" disabled={!running} onClick={() => setCount((c) => c + 1)}>
          Tıkla (+1)
        </button>
      </div>
      <div className="score">Skor: {count}</div>
    </div>
  );
}

function ScratchDemo() {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="card game">
      <h4>Kazı Kazan</h4>
      <p className="muted">Alanı sürükleyerek kazı, sürprizi gör!</p>
      <div
        className={`scratch ${revealed ? "open" : ""}`}
        onMouseMove={() => setRevealed(true)}
        onTouchMove={() => setRevealed(true)}
      >
        <div className="scratch__cover" />
        <div className="scratch__inner">🎁 25₺ Bonus!</div>
      </div>
    </div>
  );
}

function VoteBar() {
  const [a, setA] = useState(50);
  const [b, setB] = useState(50);
  const total = a + b || 1;
  return (
    <div className="card game">
      <h4>Tahmin Kutusu</h4>
      <p className="muted">Bugün Galatasaray mı kazanır?</p>
      <div className="vote">
        <button
          className="btn"
          onClick={() => {
            setA((x) => x + 1);
          }}
        >
          GS
        </button>
        <button
          className="btn"
          onClick={() => {
            setB((x) => x + 1);
          }}
        >
          Rakip
        </button>
      </div>
      <div className="vbar">
        <div className="vbar__a" style={{ width: `${(a / total) * 100}%` }} />
        <div className="vbar__b" style={{ width: `${(b / total) * 100}%` }} />
      </div>
      <small className="muted">
        GS: {Math.round((a / total) * 100)}% • Diğer: {Math.round((b / total) * 100)}%
      </small>
    </div>
  );
}

function ReflexTest() {
  const [state, setState] = useState<"idle" | "wait" | "go">("idle");
  const [msg, setMsg] = useState("Başlat'a bas ve yeşili bekle!");
  const [startAt, setStartAt] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);

  function start() {
    setScore(null);
    setState("wait");
    setMsg("Hazır ol… Yeşil olunca tıkla!");
    const delay = 1000 + Math.random() * 2500;
    const t = setTimeout(() => {
      setState("go");
      setMsg("ŞİMDİ!");
      setStartAt(Date.now());
    }, delay);
    return () => clearTimeout(t);
  }

  function click() {
    if (state === "go" && startAt) {
      const ms = Date.now() - startAt;
      setScore(ms);
      setMsg("Tebrikler! Tekrar dene.");
      setState("idle");
      setStartAt(null);
    } else if (state === "wait") {
      setMsg("Erken tıkladın! Tekrar dene.");
      setState("idle");
    }
  }

  return (
    <div className="card game">
      <h4>Refleks Testi</h4>
      <p className="muted">{msg}</p>
      <div className={`reflex ${state}`} onClick={state === "idle" ? undefined : click}>
        <span>{state === "go" ? "Tıkla!" : state === "wait" ? "Bekle…" : "Hazır"}</span>
      </div>
      <div className="row">
        <button className="btn grad" onClick={start} disabled={state !== "idle"}>
          Başlat
        </button>
        {score !== null && <div className="score">{score} ms</div>}
      </div>
    </div>
  );
}

/* ===================== TOURNAMENTS ===================== */
function Tournaments() {
  return (
    <section className="section">
      <h3 className="sec-title">TURNUVALAR</h3>
      <div className="grid three">
        {TOURNEYS.map((t) => (
          <div key={t.id} className="t-card">
            <div className="t-cover" style={{ backgroundImage: `url("${t.img}")` }} />
            <div className="t-body">
              <h4>{t.title}</h4>
              <p className="muted">Ödül Havuzu: {formatTRY(t.prize)}</p>
              <button className="btn grad">Katıl</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ===================== FOOTER ===================== */
function Footer() {
  return (
    <footer className="ftr">
      <div className="ftr__inner">© {new Date().getFullYear()} Radisson Spin • Demo</div>
    </footer>
  );
}

/* ===================== UTIL ===================== */
function formatTRY(n: number) {
  return new Intl.NumberFormat("tr-TR").format(n) + " ₺";
}
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function getRemaining(deadline: Date, nowMs: number) {
  const diff = Math.max(0, +deadline - nowMs);
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { d, h, m, s: sec };
}

/* ===================== CSS ===================== */
const css = `
:root{
  --bg1:#0b1324; --bg2:#0e1a33; --card:#0e1530; --line:#192243; --text:#e9eef7; --muted:#9fb1d0;
  --aqua:#00e5ff; --violet:#7c3aed; --red:#ff0033;
}
*{box-sizing:border-box}
body{margin:0}
.demo-page{min-height:100vh;background:linear-gradient(180deg,var(--bg1),var(--bg2))}
a{color:inherit}

/* Header */
.hdr{position:sticky;top:0;z-index:40;background:rgba(5,10,22,.7);backdrop-filter:blur(8px);border-bottom:1px solid rgba(255,255,255,.05)}
.hdr__inner{max-width:1200px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;gap:16px;justify-content:space-between}
.hdr__brand{display:flex;align-items:center;gap:10px;color:#fff;font-weight:800;letter-spacing:.3px}
.hdr__brand img{height:28px;display:block}
.hdr__nav{display:flex;gap:12px}
.hdr__nav a{color:#cfe3ff;text-decoration:none;padding:6px 10px;border-radius:10px;border:1px solid transparent}
.hdr__nav a:hover{border-color:rgba(0,229,255,.35);box-shadow:0 0 0 2px rgba(0,229,255,.15)}
.hdr__actions{display:flex;align-items:center;gap:10px}
.pill{display:inline-flex;align-items:center;gap:8px;background:#0a1a2c;border:1px solid #173555;color:#b9e8ff;padding:6px 10px;border-radius:999px;font-size:13px}
.pill .dot{width:8px;height:8px;border-radius:999px;background:#10ffb1;box-shadow:0 0 10px rgba(16,255,177,.8);display:inline-block;animation:pulse 1.6s infinite}
@keyframes pulse{0%{transform:scale(.9)}50%{transform:scale(1.15)}100%{transform:scale(.9)}}
.btn{border:1px solid #22406c;background:#0c1b33;color:#e8f2ff;border-radius:12px;padding:8px 12px;text-decoration:none;cursor:pointer}
.btn:hover{filter:brightness(1.08)}
.btn.primary{background:linear-gradient(90deg,var(--aqua),#40a4ff);border-color:#196b84;color:#001018}
.btn.ghost{background:transparent;border-color:#284b86}

/* Ticker */
.ticker{border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);overflow:hidden}
.ticker__track{display:inline-block;white-space:nowrap;animation:marq 24s linear infinite}
.ticker:hover .ticker__track{animation-play-state:paused}
.ticker__item{display:inline-flex;align-items:center;gap:10px;color:#cbdaf6;margin-right:28px;padding:8px 0}
.ticker__item .logo{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:999px;background:#122347;border:1px solid #1a3870}
.ticker__item .lg{color:#fff;font-weight:700}
.ticker__item .teams b{color:#a5f3fc}
.ticker__item .min{color:#93c5fd}
@keyframes marq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

/* Hero */
.hero{position:relative;max-width:1200px;margin:14px auto;border-radius:18px;overflow:hidden;height:min(58vh,520px);min-height:340px;background:#0f1832}
.hero__slide{position:absolute;inset:0;background-size:cover;background-position:center;transition:opacity .9s ease}
.hero__overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(4,10,20,.78));display:flex;align-items:flex-end}
.hero__text{padding:26px;color:#fff}
.hero__text h2{margin:0 0 8px;font-size:clamp(18px,3.6vw,30px);font-weight:900;letter-spacing:.3px}
.hero__text p{margin:0 0 12px;color:#c8ddff}
.hero__nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:999px;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.35);color:#fff;font-size:26px}
.hero__nav--l{left:12px}.hero__nav--r{right:12px}
.hero__dots{position:absolute;left:50%;transform:translateX(-50%);bottom:12px;display:flex;gap:8px}
.dot{width:10px;height:10px;border-radius:999px;border:none;background:rgba(255,255,255,.6);cursor:pointer}
.dot.active{background:#fff}
.btn.grad{background:linear-gradient(90deg,var(--aqua),#6ea8ff);border:1px solid #175f85;color:#001018}

/* Section Genel */
.section{max-width:1200px;margin:18px auto;padding:0 16px}
.sec-title{color:#def3ff;margin:0 0 10px;font-size:14px;letter-spacing:1px}

/* Bonus */
.bonus{display:grid;grid-template-columns:360px 1fr;gap:16px;background:linear-gradient(180deg,#081326,#061223);border:1px solid #17335b;border-radius:18px;overflow:hidden}
@media(max-width:900px){.bonus{grid-template-columns:1fr}}
.bonus__media{background-image:url('https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1500&auto=format&fit=crop');background-size:cover;background-position:center;min-height:220px}
.bonus__body{padding:16px;color:#e9f4ff}
.bonus__body h4{margin:0 0 6px}
.bonus .muted{color:#9cc0e7}
.timer{display:flex;gap:8px;margin:10px 0 12px}
.tbox{background:#0a1d37;border:1px solid #143561;border-radius:12px;padding:8px 10px;min-width:72px;text-align:center}
.tbox__val{font-weight:900;color:#aaf1ff;font-size:18px}
.tbox__lbl{font-size:11px;color:#8fb2d9;letter-spacing:.6px}
.bonus__actions{display:flex;gap:8px;flex-wrap:wrap}

/* Mini Games */
.grid{display:grid;gap:12px}
.grid.four{grid-template-columns:repeat(4,minmax(0,1fr))}
.grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
@media(max-width:900px){.grid.four,.grid.three{grid-template-columns:1fr}}
.card.game{background:linear-gradient(180deg,#0b1731,#0b1a36);border:1px solid #1a2c57;border-radius:16px;padding:14px;color:#eaf4ff}
.card.game h4{margin:0 0 6px}
.card .muted{color:#9db6da}
.bar{width:100%;height:8px;background:#0a1e3d;border:1px solid #173664;border-radius:10px;overflow:hidden;margin:8px 0}
.bar__fill{height:100%;background:linear-gradient(90deg,#40a4ff,var(--aqua))}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.score{color:#a5f3fc}
.scratch{position:relative;border-radius:12px;overflow:hidden;border:1px dashed #284c87;background:#0b1530;height:120px;display:grid;place-items:center}
.scratch__cover{position:absolute;inset:0;background:repeating-linear-gradient(45deg,#1a2f5a 0 10px,#0e1c3f 10px 20px);transition:opacity .5s}
.scratch.open .scratch__cover{opacity:0}
.scratch__inner{position:relative;color:#fff;font-size:22px}
.vote{display:flex;gap:8px;margin:8px 0}
.vbar{position:relative;width:100%;height:10px;background:#092042;border:1px solid #193a72;border-radius:999px;overflow:hidden}
.vbar__a{height:100%;background:linear-gradient(90deg,#4f46e5,#7c3aed)}
.vbar__b{height:100%;background:linear-gradient(90deg,#06b6d4,#00e5ff)}
.reflex{height:100px;border:1px solid #173664;border-radius:12px;display:grid;place-items:center;cursor:pointer;color:#e7f5ff}
.reflex.idle{background:#0a1731}
.reflex.wait{background:#32120f}
.reflex.go{background:#0d3a1b}

/* Tournaments */
.t-card{background:linear-gradient(180deg,#0b1731,#0b1a36);border:1px solid #1a2c57;border-radius:16px;overflow:hidden;color:#eaf4ff;display:flex;flex-direction:column}
.t-cover{height:160px;background-size:cover;background-position:center}
.t-body{padding:12px}
.t-body h4{margin:0 0 6px}

/* Footer */
.ftr{border-top:1px solid rgba(255,255,255,.06);margin-top:22px}
.ftr__inner{max-width:1200px;margin:0 auto;padding:14px 16px;color:#9fb1d0;text-align:center}
`;
