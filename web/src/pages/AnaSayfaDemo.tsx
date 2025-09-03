// web/src/pages/AnaSayfaDemo.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/* =========================================================
   ANA SAYFA DEMO (Neon Mock-up v2 – FIXED)
   - Header: vurucu CTA + alt sub-nav
   - Canlı skor: neon chip'ler, daha ön planda
   - Hero: aurora + promo geri sayım rozeti
   - Genel: kutu hissi az, neon/cam vurgu
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
      <SubNav />
      <LiveTicker />
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

  useEffect(() => {
    const t = setInterval(() => {
      setOnline((n) => {
        const delta = Math.floor(Math.random() * 20) * dir;
        let next = n + delta;
        if (next < 4200 || next > 5800) setDir((d) => (d === 1 ? -1 : 1));
        return Math.max(4200, Math.min(5800, next));
      });
    }, 5000);
    return () => clearInterval(t);
  }, [dir]);

  return (
    <header className="hdr">
      <div className="hdr__glow" aria-hidden />
      <div className="hdr__inner">
        <a className="hdr__brand" href="/" onClick={(e) => e.preventDefault()}>
          <img src={LOGO} alt="Logo" />
          <span>Radisson Spin</span>
        </a>

        <div className="hdr__spacer" />

        <div className="hdr__actions">
          <OnlinePill value={online} />
          <a className="btn cta" href="#" onClick={(e) => e.preventDefault()}>
            <span className="cta__icon">↪</span> Radissonbet Giriş
          </a>

          <a
            className="btn ghost bell"
            href="#bonus"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById("bonus");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Hızlı Bonus
            <span className="badge">Yeni</span>
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

/* ===================== SUB NAV ===================== */
function SubNav() {
  return (
    <div className="subnav">
      <div className="subnav__inner">
        <a href="#" onClick={(e) => e.preventDefault()}>Spor</a>
        <a href="#" onClick={(e) => e.preventDefault()}>Casino</a>
        <a href="#" onClick={(e) => e.preventDefault()}>Canlı</a>
        <a href="#" onClick={(e) => e.preventDefault()}>Promolar</a>
        <a href="#" onClick={(e) => e.preventDefault()}>Yardım</a>
      </div>
    </div>
  );
}

/* ===================== LIVE TICKER ===================== */
function LiveTicker() {
  const [list, setList] = useState(LIVE_TICKER);

  useEffect(() => {
    const t = setInterval(() => {
      setList((prev) => {
        const [f, ...rest] = prev;
        return [...rest, f];
      });
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="live">
      <div className="live__rail">
        {list.concat(list).map((m, i) => (
          <span key={`${m.id}-${i}`} className="live__chip">
            <span className="ic">{m.logo}</span>
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
    timer.current = window.setInterval(() => setI((x) => (x + 1) % len), 4500);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [paused, len]);

  const { h, m, s, d } = getRemaining(BONUS_DEADLINE, Date.now());

  return (
    <section
      className="hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hero__aurora" aria-hidden />
      {BANNERS.map((b, k) => (
        <div
          key={b.id}
          className="hero__slide"
          style={{ opacity: k === idx ? 1 : 0, backgroundImage: `url("${b.image_url}")` }}
        >
          <div className="hero__overlay">
            <div className="hero__text">
              <h2 className="h-title">
                <span className="stroke">Radisson</span> <span className="glow">Spin</span>
              </h2>
              <p className="h-sub">
                {b.title} — {b.subtitle}
              </p>
              <div className="h-row">
                <button className="btn grad">Şimdi Katıl</button>
                <a className="btn ghost" href="#" onClick={(e) => e.preventDefault()}>
                  Özel Oranlar
                </a>
              </div>
            </div>

            <div className="hero__promo">
              <span className="promo__lbl">En Yakın Promo</span>
              <div className="promo__tm">
                <span>{pad2(h + d * 24)}</span>:<span>{pad2(m)}</span>:<span>{pad2(s)}</span>
              </div>
              <a
                className="promo__btn"
                href="#bonus"
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById("bonus");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Kodu Gör
              </a>
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
        <button className="btn" onClick={() => setA((x) => x + 1)}>GS</button>
        <button className="btn" onClick={() => setB((x) => x + 1)}>Rakip</button>
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
  --bg1:#0b1324; --bg2:#0e1a33;
  --text:#e9eef7; --muted:#9fb1d0;
  --aqua:#00e5ff; --vio:#9C27B0; --cyan:#00F5FF; --gold:#FFD700;
}
*{box-sizing:border-box}
body{margin:0}
.demo-page{
  min-height:100vh;
  background:radial-gradient(1200px 600px at 10% -10%, rgba(0,229,255,.08), transparent 60%),
             radial-gradient(1000px 500px at 110% 10%, rgba(156,39,176,.07), transparent 55%),
             linear-gradient(180deg,var(--bg1),var(--bg2));
  color:var(--text);
}
a{color:inherit}

/* Header */
.hdr{position:sticky;top:0;z-index:50;background:rgba(7,12,26,.5);backdrop-filter:blur(10px)}
.hdr__glow{position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(0,229,255,.08),transparent)}
.hdr__inner{max-width:1200px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;gap:16px}
.hdr__brand{display:flex;align-items:center;gap:10px;font-weight:900;letter-spacing:.3px;text-decoration:none}
.hdr__brand img{height:28px;display:block;filter:drop-shadow(0 0 10px rgba(0,229,255,.35))}
.hdr__brand span{background:linear-gradient(90deg,#dff7ff,#7ad7ff);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 18px rgba(0,229,255,.18)}
.hdr__spacer{flex:1}
.hdr__actions{display:flex;align-items:center;gap:10px}
.pill{display:inline-flex;align-items:center;gap:8px;background:rgba(10,26,44,.6);border:1px solid rgba(64,164,255,.25);color:#b9e8ff;padding:6px 10px;border-radius:999px;font-size:13px}
.pill .dot{width:8px;height:8px;border-radius:999px;background:#10ffb1;box-shadow:0 0 10px rgba(16,255,177,.8);display:inline-block;animation:pulse 1.6s infinite}
@keyframes pulse{0%{transform:scale(.9)}50%{transform:scale(1.15)}100%{transform:scale(.9)}}
.btn{border:1px solid rgba(40,75,134,.7);background:rgba(12,27,51,.55);color:#e8f2ff;border-radius:12px;padding:8px 12px;text-decoration:none;cursor:pointer;transition:transform .15s, filter .15s, box-shadow .2s}
.btn:hover{filter:brightness(1.08);transform:translateY(-1px)}
.btn.ghost{background:transparent}
.btn.grad{background:linear-gradient(90deg,var(--aqua),#6ea8ff);border:1px solid #175f85;color:#001018}
.btn.cta{
  position:relative; font-weight:800; letter-spacing:.2px;
  background:linear-gradient(90deg,#49e5ff,#82b6ff); color:#001018; border-color:#0aa3c6;
  box-shadow:0 0 14px rgba(0,229,255,.35), inset 0 0 0 1px rgba(255,255,255,.2);
}
.btn.cta .cta__icon{display:inline-block;margin-right:6px;transform:rotate(-20deg);transition:transform .18s}
.btn.cta:hover .cta__icon{transform:rotate(0deg) translateX(2px)}
.bell{position:relative}
.badge{position:absolute;top:-6px;right:-6px;background:#ff3b6b;color:#fff;border-radius:999px;padding:2px 6px;font-size:10px;border:1px solid rgba(255,255,255,.2);box-shadow:0 0 10px rgba(255,59,107,.6)}

/* Sub Nav */
.subnav{position:sticky;top:56px;z-index:45;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);background:rgba(7,12,26,.35);backdrop-filter:blur(8px)}
.subnav__inner{max-width:1200px;margin:0 auto;padding:8px 16px;display:flex;gap:14px}
.subnav__inner a{padding:6px 10px;border-radius:12px;color:#cfe3ff;text-decoration:none;position:relative}
.subnav__inner a::after{content:"";position:absolute;left:10px;right:10px;bottom:3px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,var(--aqua),transparent);opacity:0;transition:opacity .2s}
.subnav__inner a:hover::after{opacity:1}

/* Live Ticker (neon chips) */
.live{position:relative;border-bottom:1px solid rgba(255,255,255,.06);overflow:hidden}
.live::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(0,229,255,.06),transparent)}
.live__rail{display:inline-block;white-space:nowrap;animation:lr 22s linear infinite;padding:10px 0}
.live:hover .live__rail{animation-play-state:paused}
@keyframes lr{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.live__chip{
  display:inline-flex;align-items:center;gap:10px;margin:0 12px;padding:8px 12px;border-radius:14px;
  background:rgba(10,22,46,.45);backdrop-filter:blur(6px);
  border:1px solid rgba(64,164,255,.25);
  box-shadow:0 0 0 1px rgba(0,229,255,.05), 0 0 16px rgba(0,229,255,.08) inset;
  color:#cfe3ff;
}
.live__chip .ic{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:999px;background:#122347;border:1px solid #1a3870}
.live__chip .lg{color:#fff;font-weight:800}
.live__chip .teams b{color:#a5f3fc}
.live__chip .min{color:#93c5fd}

/* Hero */
.hero{position:relative;max-width:1200px;margin:14px auto;border-radius:22px;overflow:hidden;height:min(58vh,520px);min-height:360px;background:#0f1832}
.hero__slide{position:absolute;inset:0;background-size:cover;background-position:center;transition:opacity .9s ease}
.hero__overlay{position:absolute;inset:0;background:
  radial-gradient(800px 400px at 70% 10%, rgba(0,229,255,.18), transparent 60%),
  linear-gradient(180deg,rgba(5,10,20,.1) 0%,rgba(4,10,20,.78) 65%);
display:flex;align-items:flex-end;justify-content:space-between;gap:10px}
.hero__aurora{pointer-events:none;position:absolute;inset:-20%;background:
  radial-gradient(600px 300px at 20% 20%, rgba(0,229,255,.18), transparent 60%),
  radial-gradient(500px 250px at 80% 0%, rgba(156,39,176,.15), transparent 60%)}
.hero__text{padding:26px;color:#fff;max-width:720px}
.h-title{margin:0 0 6px;font-size:clamp(26px,5.2vw,48px);line-height:1.04}
.h-title .stroke{-webkit-text-stroke:1px rgba(255,255,255,.8);color:transparent}
.h-title .glow{text-shadow:0 0 18px rgba(0,229,255,.55)}
.h-sub{margin:0 0 12px;color:#d5e8ff;font-size:clamp(14px,2.6vw,18px)}
.h-row{display:flex;gap:10px;flex-wrap:wrap}
.hero__promo{
  margin:0 20px 20px 0;align-self:flex-end;
  background:rgba(5,18,36,.6);backdrop-filter:blur(8px);
  border:1px solid rgba(64,164,255,.35);border-radius:14px;padding:10px 12px;min-width:180px;text-align:center;
  box-shadow:0 0 22px rgba(0,229,255,.12) inset, 0 4px 20px rgba(0,0,0,.35)
}
.promo__lbl{display:block;font-size:12px;color:#aee9ff;margin-bottom:4px;letter-spacing:.6px}
.promo__tm{font-weight:900;letter-spacing:1px;font-size:18px;color:#e9fbff}
.promo__btn{display:inline-block;margin-top:8px;padding:6px 10px;border-radius:10px;border:1px solid #1a5f85;background:linear-gradient(90deg,var(--aqua),#6ea8ff);color:#001018;text-decoration:none}

/* Section Genel */
.section{max-width:1200px;margin:22px auto;padding:0 16px}
.sec-title{color:#def3ff;margin:0 0 10px;font-size:13px;letter-spacing:1px;opacity:.9}

/* Bonus */
.bonus{
  display:grid;grid-template-columns:360px 1fr;gap:16px;
  background:linear-gradient(180deg,rgba(8,19,38,.8),rgba(6,18,35,.8));
  border:1px solid rgba(23,51,91,.55);border-radius:18px;overflow:hidden
}
@media(max-width:900px){.bonus{grid-template-columns:1fr}}
.bonus__media{background-image:url('https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1500&auto=format&fit=crop');background-size:cover;background-position:center;min-height:220px}
.bonus__body{padding:16px;color:#e9f4ff}
.bonus__body h4{margin:0 0 6px}
.bonus .muted{color:#9cc0e7}
.timer{display:flex;gap:8px;margin:10px 0 12px}
.tbox{background:rgba(10,29,55,.6);border:1px solid rgba(20,53,97,.65);border-radius:12px;padding:8px 10px;min-width:72px;text-align:center}
.tbox__val{font-weight:900;color:#aaf1ff;font-size:18px}
.tbox__lbl{font-size:11px;color:#8fb2d9;letter-spacing:.6px}
.bonus__actions{display:flex;gap:8px;flex-wrap:wrap}

/* Mini Games */
.grid{display:grid;gap:12px}
.grid.four{grid-template-columns:repeat(4,minmax(0,1fr))}
.grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
@media(max-width:900px){.grid.four,.grid.three{grid-template-columns:1fr}}
.card.game{
  background:linear-gradient(180deg,rgba(11,23,49,.7),rgba(11,26,54,.7));
  border:1px solid rgba(26,44,87,.5);border-radius:16px;padding:14px;color:#eaf4ff;
}
.card.game h4{margin:0 0 6px}
.card .muted{color:#9db6da}
.bar{width:100%;height:8px;background:#0a1e3d;border:1px solid #173664;border-radius:10px;overflow:hidden;margin:8px 0}
.bar__fill{height:100%;background:linear-gradient(90deg,#40a4ff,var(--aqua))}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.score{color:#a5f3fc}
.scratch{position:relative;border-radius:12px;overflow:hidden;border:1px dashed rgba(40,76,135,.8);background:#0b1530;height:120px;display:grid;place-items:center}
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
.t-card{background:linear-gradient(180deg,rgba(11,23,49,.7),rgba(11,26,54,.7));border:1px solid rgba(26,44,87,.5);border-radius:16px;overflow:hidden;color:#eaf4ff;display:flex;flex-direction:column}
.t-cover{height:160px;background-size:cover;background-position:center}
.t-body{padding:12px}
.t-body h4{margin:0 0 6px}

/* Footer */
.ftr{border-top:1px solid rgba(255,255,255,.06);margin-top:22px}
.ftr__inner{max-width:1200px;margin:0 auto;padding:14px 16px;color:#9fb1d0;text-align:center}
`;
