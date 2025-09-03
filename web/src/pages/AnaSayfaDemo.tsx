// web/src/pages/AnaSayfaDemo.tsx
import { useEffect, useState } from "react";

/**
 * Header DEMO (only header, modern & minimal)
 * - Dark navy + aqua accents, no heavy boxes
 * - Left: logo + brand
 * - Center: TV-style LIVE badge + online counter (mock)
 * - Right: primary “Radissonbet Giriş” (cursor-click icon), secondary “Hızlı Bonus”
 * - Pure mockup; wire real links later
 */

const LOGO =
  "https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png";

export default function AnaSayfaDemo() {
  return (
    <div className="demo">
      <Header />
      <style>{css}</style>
    </div>
  );
}

function Header() {
  const [online, setOnline] = useState<number>(() => 5200 + Math.floor(Math.random() * 300));
  const [dir, setDir] = useState<1 | -1>(1);

  // Mock dalgalanma: TV canlı yayın hissi, sayılar tabular (sıçrama yapmaz)
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
      <div className="hdr__in">
        {/* Left: logo + brand */}
        <a className="brand" href="/" onClick={(e) => e.preventDefault()}>
          <img className="logo" src={LOGO} alt="Radisson Spin" />
          <span className="brand__txt">Radisson Spin</span>
        </a>

        {/* Center: TV-style LIVE + counter */}
        <div className="livebar" aria-label="canlı durum">
          <span className="livebug">
            <span className="dot" />
            LIVE
          </span>
          <span className="sep">•</span>
          <span className="count" title="Şu an çevrim içi (mock)">
            {new Intl.NumberFormat("tr-TR").format(online)} <span className="muted">çevrim içi</span>
          </span>
        </div>

        {/* Right: actions */}
        <div className="actions">
          <button
            className="btn primary"
            onClick={() => {
              // DEMO: gerçek linki entegrasyonda vereceğiz
              window.location.assign("/");
            }}
          >
            <MouseClickIcon />
            <span>Radissonbet Giriş</span>
          </button>

          <button
            className="btn ghost"
            onClick={(e) => {
              e.preventDefault();
            }}
            title="Hızlı Bonus (demo)"
          >
            Hızlı Bonus
            <span className="notif" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}

function MouseClickIcon() {
  // Minimal “mouse click” simgesi + küçük klik ray'leri
  return (
    <svg
      className="mouse"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 2a5 5 0 0 1 5 5v4H7V7a5 5 0 0 1 5-5Z"
        fill="currentColor"
        opacity=".9"
      />
      <path
        d="M7 11h10v5a5 5 0 0 1-10 0v-5Z"
        fill="currentColor"
        opacity=".65"
      />
      <path d="M12 6v12" stroke="currentColor" strokeWidth="1.5" opacity=".9" />
      <path d="M18.5 4.5l2-2M19.5 8h2.5M17 2v-2" stroke="currentColor" strokeWidth="1.5" opacity=".7" />
    </svg>
  );
}

/* ===== CSS (scoped) ===== */
const css = `
:root{
  --bg:#0b1224; --bg2:#0e1a33; --text:#eaf2ff; --muted:#a9bddb;
  --aqua:#00e5ff; --aqua2:#7fdfff;
}
*{box-sizing:border-box}
body{margin:0}
.demo{min-height:40vh;background:linear-gradient(180deg,var(--bg),var(--bg2));}

/* HEADER */
.hdr{
  position:relative;
  backdrop-filter:blur(10px);
  background:rgba(8,14,28,.5);
  border-bottom:1px solid rgba(255,255,255,.06);
}
.hdr__in{
  max-width:1200px; margin:0 auto;
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 16px; gap:12px;
}

/* Brand */
.brand{display:flex;align-items:center;gap:10px;text-decoration:none}
.logo{height:28px;display:block;filter:drop-shadow(0 0 10px rgba(0,229,255,.25))}
.brand__txt{
  font-weight:900; letter-spacing:.3px; line-height:1;
  background:linear-gradient(90deg,#dff7ff,#7ad7ff);
  -webkit-background-clip:text; background-clip:text; color:transparent;
}

/* Live bar (TV look) */
.livebar{
  display:flex; align-items:center; gap:10px; color:var(--text);
  font-variant-numeric: tabular-nums;
}
.livebug{
  display:inline-flex; align-items:center; gap:6px;
  padding:2px 8px; border-radius:6px;
  background:#e10600; color:#fff; font-weight:900; letter-spacing:.6px; font-size:12px;
  box-shadow:0 0 0 1px rgba(255,255,255,.15) inset, 0 4px 12px rgba(225,6,0,.35);
}
.livebug .dot{
  width:8px; height:8px; border-radius:999px; background:#fff;
  box-shadow:0 0 12px rgba(255,255,255,.9);
  animation:pulse 1.4s infinite;
}
@keyframes pulse{0%{transform:scale(.9)}50%{transform:scale(1.15)}100%{transform:scale(.9)}}
.sep{opacity:.5}
.count .muted{color:var(--muted)}

/* Actions */
.actions{display:flex; align-items:center; gap:10px}
.btn{
  display:inline-flex; align-items:center; gap:8px; cursor:pointer;
  border:1px solid transparent; background:transparent; color:var(--text);
  padding:8px 12px; border-radius:12px; transition:filter .15s, transform .15s;
}
.btn:hover{filter:brightness(1.06); transform:translateY(-1px)}
.btn.primary{
  color:#001018;
  background:linear-gradient(90deg,var(--aqua),#4aa7ff);
  border-color:#0f6d8c;
  box-shadow:0 4px 18px rgba(0,229,255,.25), inset 0 0 0 1px rgba(255,255,255,.18);
  font-weight:800; letter-spacing:.2px;
}
.btn.primary .mouse{display:block}
.btn.ghost{
  color:#d7e8ff; background:transparent; border-color:rgba(255,255,255,.18);
}
.btn.ghost:hover{background:rgba(255,255,255,.06)}
.notif{
  display:inline-block; width:8px; height:8px; margin-left:6px;
  border-radius:999px; background:#ff4d6d; box-shadow:0 0 0 6px rgba(255,77,109,.18);
}
.mouse{color:#001018}

@media (max-width:780px){
  .hdr__in{padding:10px 12px}
  .livebar{display:none} /* mobilde sadeleştir */
}
`;
