// web/src/pages/AnaSayfaDemo.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/* =========================================================
   ANA SAYFA DEMO (revize)
   Odak: Radissonbet Giriş CTA, Hızlı Bonus bildirim, kart-sız (sleek) stil
   - Koyu lacivert + aqua vurgu
   - Header: güçlü CTA + animasyonlu ikon, Hızlı Bonus bildirim
   - Alt Menü (header altı, ince şerit)
   - Canlı skorlar: küçük şerit-kartlar (logolu), fazla yer kaplamaz
   - Hero: dikkat çekici, en yakın promo kod + geri sayım overlay
   - Özel Oranlar (yatay kaydırılabilir chip'ler)
   - Promo Kodları (kupon/ticket stili + geri sayım)
   - Kutulardan kaçın: blur, glow, yumuşak gradient
   ========================================================= */

/* ---------- Sabitler ---------- */
const LOGO =
  "https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png";

/* Mock veriler */
const LIVE_TICKER = [
  { id: "1", logo: "⚽", league: "Süper Lig", home: "GS", away: "FB", min: 62, sh: 2, sa: 0 },
  { id: "2", logo: "🏆", league: "EPL", home: "MCI", away: "ARS", min: 74, sh: 1, sa: 1 },
  { id: "3", logo: "🕹️", league: "LoL", home: "FNC", away: "G2", min: 23, sh: 15, sa: 11 },
  { id: "4", logo: "🎯", league: "CS:GO", home: "NAVI", away: "FaZe", min: 9, sh: 6, sa: 5 },
];

const HERO_BANNERS = [
  {
    id: 1,
    image_url:
      "https://images.unsplash.com/photo-1533130061792-64b345e4a833?q=80&w=2000&auto=format&fit=crop",
    title: "ÖZEL PROMO KODU",
    subtitle: "Sadece bugün geçerli! Kaçırma.",
    promoCode: "RDX-50",
    endsAt: Date.now() + 1000 * 60 * 45, // 45 dk
  },
  {
    id: 2,
    image_url:
      "https://images.unsplash.com/photo-1521417531039-1482a3e5f1a7?q=80&w=2000&auto=format&fit=crop",
    title: "MEGA TURNUVA",
    subtitle: "350.000 ₺ ödül havuzu • Hemen Katıl",
    promoCode: null,
    endsAt: Date.now() + 1000 * 60 * 90,
  },
];

const ODD_CHIPS = [
  { id: 1, tag: "Özel Oran", text: "GS kazanır 3.01" },
  { id: 2, tag: "Boost", text: "Corner +2.5 @2.15" },
  { id: 3, tag: "Kombine", text: "3 Maç 5.75" },
  { id: 4, tag: "Canlı", text: "MCI gol atar @1.70" },
  { id: 5, tag: "Özel Oran", text: "FB ilk yarı 2.90" },
];

const PROMO_TICKETS = [
  {
    id: "px1",
    code: "NEON50",
    desc: "Yatırımsız 50 ₺",
    endsAt: Date.now() + 1000 * 60 * 30, // 30 dk
  },
  {
    id: "px2",
    code: "SPARK20",
    desc: "Kayıp %20 iade",
    endsAt: Date.now() + 1000 * 60 * 75,
  },
];

export default function AnaSayfaDemo() {
  return (
    <div className="page">
      <Header />
      <SubNav />
      <LiveStrip />
      <Hero />
      <section className="section">
        <h3 className="sec-title">ÖZEL ORANLAR</h3>
        <OddsChips />
      </section>
      <section id="bonus" className="section">
        <h3 className="sec-title">HIZLI BONUS • PROMO KODLARI</h3>
        <PromoTickets />
      </section>
      <Footer />
      <style>{css}</style>
    </div>
  );
}

/* ===================== HEADER ===================== */
function Header() {
  const [online, setOnline] = useState<number>(() => 5200 + Math.floor(Math.random() * 300));
  const [dir, setDir] = useState<1 | -1>(1);

  useEffect(() => {
    const t = setInterval(() => {
      setOnline((n) => {
        const delta = Math.floor(Math.random() * 18) * dir;
        const next = Math.max(4800, Math.min(6200, n + delta));
        if (next === 4800 || next === 6200) setDir((d) => (d === 1 ? -1 : 1));
        return next;
      });
    }, 5000);
    return () => clearInterval(t);
  }, [dir]);

  return (
    <header className="hdr">
      <div className="hdr__inner">
        <div className="hdr__left">
          <img className="logo" src={LOGO} alt="Logo" />
          <span className="brand">Radisson Spin</span>
        </div>

        <div className="hdr__right">
          <OnlinePill value={online} />
          {/* Öne çıkan CTA: Radissonbet Giriş */}
          <a className="cta" href="#" onClick={(e) => e.preventDefault()}>
            <span className="cta__icon" aria-hidden>
              <span className="ping" />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21c-4.8 0-9-3.9-9-8.7C3 8.2 6.6 4.5 11 3.9V2l4 3-4 3V6c-3.4.6-6 3.5-6 6.3 0 3.6 3.1 6.7 7 6.7s7-3.1 7-6.7h2c0 4.8-4.2 8.7-9 8.7z" />
              </svg>
            </span>
            <span className="cta__text">Radissonbet Giriş</span>
          </a>

          {/* Hızlı Bonus bildirimi */}
          <button
            className="notif"
            title="Hızlı Bonus'a git"
            onClick={() => {
              const el = document.getElementById("bonus");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5a6 6 0 0 0-12 0v5l-2 2v1h16v-1l-2-2Z" />
            </svg>
            <span className="dot" />
            <span className="notif__text">Hızlı Bonus</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function OnlinePill({ value }: { value: number }) {
  return (
    <span className="online">
      <span className="led" />
      <b>{new Intl.NumberFormat("tr-TR").format(value)}</b> çevrim içi
    </span>
  );
}

/* ===================== SUB NAV (header altı) ===================== */
function SubNav() {
  return (
    <div className="subnav">
      <div className="subnav__inner">
        <a href="#" onClick={(e) => e.preventDefault()}>
          Ana Sayfa
        </a>
        <a href="#" onClick={(e) => e.preventDefault()}>
          Turnuvalar
        </a>
        <a href="#" onClick={(e) => e.preventDefault()}>
          Etkinlikler
        </a>
        <a href="#" onClick={(e) => e.preventDefault()}>
          Canlı Skor
        </a>
      </div>
    </div>
  );
}

/* ===================== LIVE STRIP ===================== */
function LiveStrip() {
  const [list, setList] = useState(LIVE_TICKER);
  useEffect(() => {
    const t = setInterval(() => {
      setList((prev) => {
        const [f, ...rest] = prev;
        return [...rest, f];
      });
    }, 6000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="live">
      <div className="live__track">
        {list.concat(list).map((m, i) => (
          <span key={`${m.id}-${i}`} className="pill">
            <span className="icon">{m.logo}</span>
            <span className="lg">{m.league}</span>
            <span className="tm">
              {m.home} <b>{m.sh}</b>-<b>{m.sa}</b> {m.away}
            </span>
            <span className="mn">{m.min}'</span>
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
  const len = HERO_BANNERS.length;
  const idx = useMemo(() => (len ? i % len : 0), [i, len]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (paused || len < 2) return;
    timer.current = window.setInterval(() => setI((x) => (x + 1) % len), 4500);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [paused, len]);

  const banner = HERO_BANNERS[idx];

  return (
    <section
      className="hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ backgroundImage: `url("${banner.image_url}")` }}
    >
      {/* Neon çizgiler */}
      <div className="hero__glow hero__glow--a" />
      <div className="hero__glow hero__glow--b" />

      {/* Overlay metin */}
      <div className="hero__overlay">
        <div className="hero__text">
          <div className="kicker">{banner.title}</div>
          <h2>{banner.subtitle}</h2>

          {/* En yakın promo kodu (varsa) */}
          {banner.promoCode && <NearestPromo code={banner.promoCode} endsAt={banner.endsAt} />}

          <div className="hero__actions">
            <button className="btn grad">Hemen Katıl</button>
            <div className="dots">
              {HERO_BANNERS.map((_, k) => (
                <button
                  key={k}
                  className={`dot ${k === idx ? "active" : ""}`}
                  onClick={() => setI(k)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NearestPromo({ code, endsAt }: { code: string; endsAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const { h, m, s } = getRemainingMs(endsAt - now);
  return (
    <div className="promo">
      <span className="badge">EN YAKIN PROMO</span>
      <div className="promo__code">
        <span className="tag">KOD</span>
        <span className="val">{code}</span>
        <button
          className="copy"
          onClick={() => {
            navigator.clipboard?.writeText(code);
          }}
          title="Kopyala"
        >
          ⧉
        </button>
      </div>
      <div className="promo__timer">
        <Timer label="SA" value={h} />
        <Timer label="DK" value={m} />
        <Timer label="SN" value={s} />
      </div>
    </div>
  );
}
function Timer({ label, value }: { label: string; value: string }) {
  return (
    <div className="t">
      <div className="v">{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}

/* ===================== ODDS ===================== */
function OddsChips() {
  return (
    <div className="chips">
      {ODD_CHIPS.map((o) => (
        <button key={o.id} className="chip" onClick={(e) => e.preventDefault()}>
          <span className="chip__tag">{o.tag}</span>
          <span className="chip__text">{o.text}</span>
        </button>
      ))}
    </div>
  );
}

/* ===================== PROMO TICKETS ===================== */
function PromoTickets() {
  return (
    <div className="tickets">
      {PROMO_TICKETS.map((p) => (
        <Ticket key={p.id} code={p.code} desc={p.desc} endsAt={p.endsAt} />
      ))}
    </div>
  );
}
function Ticket({ code, desc, endsAt }: { code: string; desc: string; endsAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const { h, m, s } = getRemainingMs(endsAt - now);
  return (
    <div className="ticket">
      <div className="ticket__left">
        <div className="ticket__code">
          <span className="tag">KOD</span>
          <span className="val">{code}</span>
        </div>
        <div className="ticket__desc">{desc}</div>
      </div>
      <div className="ticket__right">
        <div className="tt">
          <Timer label="SA" value={h} />
          <Timer label="DK" value={m} />
          <Timer label="SN" value={s} />
        </div>
        <button className="btn outline">Kullan</button>
      </div>
    </div>
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
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function getRemainingMs(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return { h: pad2(h), m: pad2(m), s: pad2(s) };
}

/* ===================== CSS ===================== */
const css = `
:root{
  --bg1:#0a1022; --bg2:#0c142b; --text:#eaf2ff; --muted:#aac0e6;
  --aqua:#00e5ff; --aqua2:#6ee7ff; --violet:#7c3aed;
  --glass: rgba(12,20,43,.55);
}
*{box-sizing:border-box}
body{margin:0}
.page{min-height:100vh;background:linear-gradient(180deg,var(--bg1),var(--bg2))}
a{color:inherit;text-decoration:none}

/* Header */
.hdr{position:sticky;top:0;z-index:40;background:var(--glass);backdrop-filter:blur(12px)}
.hdr__inner{max-width:1200px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;justify-content:space-between}
.hdr__left{display:flex;align-items:center;gap:10px}
.logo{height:28px;display:block}
.brand{color:#fff;font-weight:900;letter-spacing:.3px}
.hdr__right{display:flex;align-items:center;gap:10px}
.online{display:inline-flex;align-items:center;gap:8px;color:#b8efff;background:rgba(8,40,60,.45);padding:6px 10px;border-radius:999px;border:1px solid rgba(0,229,255,.25)}
.online .led{width:8px;height:8px;border-radius:999px;background:#10ffb1;box-shadow:0 0 10px rgba(16,255,177,.8)}
.cta{display:inline-flex;align-items:center;gap:10px;padding:9px 12px;border-radius:14px;color:#001018;border:1px solid #167494;background:linear-gradient(90deg,var(--aqua),#45a4ff);box-shadow:0 6px 22px rgba(0,229,255,.25)}
.cta:hover{filter:brightness(1.05)}
.cta__icon{position:relative;display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.18);color:#001018}
.ping{position:absolute;inset:-4px;border-radius:999px;border:2px solid rgba(255,255,255,.35);animation:ping 1.6s infinite}
@keyframes ping{0%{transform:scale(0.9);opacity:.9}70%{transform:scale(1.25);opacity:.2}100%{transform:scale(1.25);opacity:0}}
.cta__text{font-weight:800}
.notif{position:relative;display:inline-flex;align-items:center;gap:8px;color:#d9ecff;background:rgba(12,30,52,.35);padding:8px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);cursor:pointer}
.notif .dot{position:absolute;top:2px;right:2px;width:8px;height:8px;border-radius:999px;background:#ff4d6d;box-shadow:0 0 0 6px rgba(255,77,109,.18)}

/* SubNav */
.subnav{border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)}
.subnav__inner{max-width:1200px;margin:0 auto;padding:8px 16px;display:flex;gap:14px}
.subnav__inner a{color:#cfe3ff;padding:6px 6px;border-radius:8px}
.subnav__inner a:hover{color:#fff;background:rgba(0,229,255,.08)}

/* Live Strip (küçük şerit kartlar) */
.live{overflow:hidden}
.live__track{display:inline-block;white-space:nowrap;animation:marq 28s linear infinite}
.live:hover .live__track{animation-play-state:paused}
@keyframes marq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.live .pill{display:inline-flex;align-items:center;gap:10px;margin:8px 10px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.05);color:#dfeaff;border:1px solid rgba(255,255,255,.06)}
.live .icon{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:999px;background:rgba(0,0,0,.25)}
.live .lg{font-weight:700;color:#fff}
.live .tm b{color:#a5f3fc}
.live .mn{color:#a7c7ff}

/* Hero (dikkat çekici + en yakın promo overlay) */
.hero{position:relative;max-width:1200px;margin:14px auto;border-radius:22px;overflow:hidden;height:min(60vh,560px);min-height:360px;background-size:cover;background-position:center}
.hero__overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(6,12,24,.82));display:flex;align-items:flex-end}
.hero__text{padding:28px;color:#fff;max-width:760px}
.kicker{display:inline-block;color:#001018;background:linear-gradient(90deg,var(--aqua),#4ea6ff);padding:4px 8px;border-radius:999px;font-size:12px;font-weight:900;letter-spacing:.6px}
.hero__text h2{margin:8px 0 10px;font-size:clamp(20px,3.8vw,34px);font-weight:900;letter-spacing:.2px}
.promo{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.badge{display:inline-block;background:rgba(255,255,255,.08);padding:6px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.14);color:#d8ecff;font-size:12px}
.promo__code{display:inline-flex;align-items:center;gap:8px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.18);padding:8px 10px;border-radius:12px}
.promo__code .tag{color:#9ddfff;font-size:12px}
.promo__code .val{font-weight:900;letter-spacing:.8px}
.copy{border:none;background:rgba(255,255,255,.1);color:#fff;border-radius:8px;cursor:pointer;padding:4px 6px}
.promo__timer{display:flex;gap:6px}
.t{background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:6px 8px;min-width:58px;text-align:center}
.v{font-weight:900;color:#aef4ff}
.l{font-size:10px;color:#bcd9ff;letter-spacing:.6px}
.hero__actions{display:flex;align-items:center;gap:10px;margin-top:12px}
.btn{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.1);color:#fff;border-radius:12px;padding:9px 12px;cursor:pointer}
.btn.grad{background:linear-gradient(90deg,var(--aqua),#55a9ff);border-color:#156a8b;color:#001018;font-weight:800}
.dots{display:flex;gap:8px}
.dot{width:10px;height:10px;border-radius:999px;border:none;background:rgba(255,255,255,.5);cursor:pointer}
.dot.active{background:#fff}
.hero__glow{position:absolute;filter:blur(36px);opacity:.3}
.hero__glow--a{top:-80px;left:-40px;width:260px;height:260px;background:radial-gradient(circle,#00e5ff 0,#00e5ff00 70%)}
.hero__glow--b{bottom:-80px;right:-40px;width:260px;height:260px;background:radial-gradient(circle,#6ea8ff 0,#00e5ff00 70%)}

/* Section + Odds (kutusuz, chip) */
.section{max-width:1200px;margin:20px auto;padding:0 16px}
.sec-title{color:#dfeeff;margin:0 0 10px;font-size:13px;letter-spacing:1px}
.chips{display:flex;gap:10px;overflow:auto;padding:4px 2px}
.chip{display:inline-flex;align-items:center;gap:8px;padding:10px 12px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#eaf4ff;white-space:nowrap;cursor:pointer}
.chip:hover{background:rgba(0,229,255,.08)}
.chip__tag{font-size:12px;color:#9fdfff}
.chip__text{font-weight:700}

/* Promo Tickets (kupon stili) */
.tickets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
@media(max-width:900px){.tickets{grid-template-columns:1fr}}
.ticket{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-radius:18px;background:linear-gradient(90deg,rgba(255,255,255,.06),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.08);color:#eaf4ff}
.ticket__left{display:flex;flex-direction:column;gap:6px}
.ticket__code{display:flex;align-items:center;gap:8px}
.ticket__code .tag{font-size:12px;color:#9fdfff}
.ticket__code .val{font-weight:900;letter-spacing:.8px}
.ticket__desc{color:#cfe3ff}
.ticket__right{display:flex;align-items:center;gap:10px}
.tt{display:flex;gap:6px}
.btn.outline{background:transparent;border:1px solid rgba(255,255,255,.22)}
.btn.outline:hover{background:rgba(255,255,255,.08)}

/* Footer */
.ftr{margin:24px 0}
.ftr__inner{max-width:1200px;margin:0 auto;padding:12px 16px;color:#a8bfe6;text-align:center}

/* Scrollbar hafif */
::-webkit-scrollbar{height:8px}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:999px}
`;
