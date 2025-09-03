// web/src/pages/AnaSayfaDemo.tsx
import { useEffect, useMemo, useState } from "react";

/**
 * HEADER DEMO (TV tarzı — logo + LIVE + sayı)
 * İstekler:
 * - LIVE yazısı kırmızı, logonun SAĞINDA
 * - PLAYERS kaldırıldı
 * - Sayı fontu LIVE’a benzer (Bebas Neue, kalın/dar)
 * - Digit-roll animasyonu
 * - Altında kırmızı neon şerit ve bu şerit akıyor (kayma animasyonu)
 * - Sağda: Hızlı Bonus (bildirim) + Radissonbet Giriş (klik efekti)
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
  const [clicked, setClicked] = useState(false);

  // Mock dalgalanma
  useEffect(() => {
    const t = setInterval(() => {
      setOnline((n) => {
        const delta = (4 + Math.floor(Math.random() * 12)) * dir;
        const next = Math.max(4800, Math.min(6800, n + delta));
        if (next === 4800 || next === 6800) setDir((d) => (d === 1 ? -1 : 1));
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [dir]);

  return (
    <header className="hdr">
      <div className="hdr__in">
        {/* Sol blok: Logo + LIVE strip (logo sağında) */}
        <div className="left">
          <a className="logoWrap" href="/" onClick={(e) => e.preventDefault()}>
            <img className="logo" src={LOGO} alt="Radisson" />
          </a>
          <LiveStrip value={online} />
        </div>

        {/* Sağ blok: Hızlı Bonus + Giriş */}
        <div className="right">
          <button className="btn bonus" onClick={(e) => e.preventDefault()} title="Hızlı Bonus (demo)">
            <BellIcon />
            <span>Hızlı Bonus</span>
            <span className="notif" aria-hidden />
          </button>

          <button
            className={`btn cta ${clicked ? "clicked" : ""}`}
            onClick={() => {
              setClicked(true);
              setTimeout(() => setClicked(false), 600);
              window.location.assign("/");
            }}
            title="Radissonbet Giriş"
          >
            <MouseClickIcon />
            <span>Radissonbet Giriş</span>
          </button>
        </div>
      </div>
    </header>
  );
}

/* -------- LIVE (kırmızı) + dijital sayı + kayan neon alt şerit -------- */
function LiveStrip({ value }: { value: number }) {
  const parts = useMemo(() => splitThousands(value), [value]);
  return (
    <div className="liveWrap" aria-label="live">
      <div className="liveRow">
        <span className="liveWord">
          <span className="dot" />
          LIVE
        </span>
        <span className="roller">
          {parts.map((p, i) =>
            p.kind === "sep" ? (
              <span key={`sep-${i}`} className="sep">
                .
              </span>
            ) : (
              <DigitGroup key={`grp-${i}`} digits={p.value} />
            )
          )}
        </span>
      </div>
      <div className="liveUnderline" aria-hidden />
    </div>
  );
}

function DigitGroup({ digits }: { digits: string }) {
  return (
    <span className="grp">
      {digits.split("").map((d, i) => (
        <Digit key={i} target={d} />
      ))}
    </span>
  );
}

function Digit({ target }: { target: string }) {
  const t = Math.max(0, Math.min(9, parseInt(target, 10)));
  return (
    <span className="digit">
      <span className="col" style={{ transform: `translateY(-${t * 10}%)` }}>
        {Array.from({ length: 10 }).map((_, n) => (
          <span key={n} className="cell">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

function splitThousands(n: number): Array<{ kind: "num"; value: string } | { kind: "sep" }> {
  const s = n.toString();
  const rev = s.split("").reverse();
  const out: string[] = [];
  for (let i = 0; i < rev.length; i++) {
    if (i > 0 && i % 3 === 0) out.push(".");
    out.push(rev[i]);
  }
  const grouped = out.reverse().join("");
  const parts: Array<{ kind: "num"; value: string } | { kind: "sep" }> = [];
  let buf = "";
  for (const ch of grouped) {
    if (ch === ".") {
      if (buf) parts.push({ kind: "num", value: buf }), (buf = "");
      parts.push({ kind: "sep" });
    } else buf += ch;
  }
  if (buf) parts.push({ kind: "num", value: buf });
  return parts;
}

/* -------- ICONS -------- */
function MouseClickIcon() {
  return (
    <svg className="mouse" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a5 5 0 0 1 5 5v4H7V7a5 5 0 0 1 5-5Z" fill="currentColor" />
      <path d="M7 11h10v5a5 5 0 0 1-10 0v-5Z" fill="currentColor" opacity=".7" />
      <path d="M12 6v12" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5a6 6 0 0 0-12 0v5l-2 2v1h16v-1l-2-2Z" fill="currentColor" />
    </svg>
  );
}

/* -------- CSS -------- */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue:wght@400..700&display=swap');

:root{
  --bg:#0b1224; --bg2:#0e1a33; --text:#eaf2ff;
  --aqua:#00e5ff; --red:#ff2a2a;
  --tv:'Bebas Neue', Impact, 'Helvetica Neue Condensed', system-ui, sans-serif;
}
*{box-sizing:border-box}
body{margin:0}
.demo{min-height:40vh;background:linear-gradient(180deg,var(--bg),var(--bg2));}

/* Header */
.hdr{background:rgba(8,14,28,.5);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.06)}
.hdr__in{max-width:1200px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.left{display:flex;align-items:center;gap:16px}
.right{display:flex;align-items:center;gap:10px}

/* Logo */
.logo{height:44px;display:block;filter:drop-shadow(0 0 12px rgba(0,229,255,.28))}
@media (max-width:720px){ .logo{height:36px} }

/* LIVE strip (logo sağı) */
.liveWrap{display:flex;flex-direction:column;align-items:flex-start;gap:6px}
.liveRow{display:flex;align-items:center;gap:12px}
.liveWord{
  display:inline-flex;align-items:center;gap:8px;
  font-family:var(--tv); font-weight:900; letter-spacing:1px;
  color:var(--red); font-size:26px; line-height:1;
}
.dot{width:10px;height:10px;border-radius:999px;background:var(--red);box-shadow:0 0 12px rgba(255,42,42,.85);animation:blink 1s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}

.roller{
  display:inline-flex;align-items:center;gap:6px;
  font-family:var(--tv); font-weight:900; font-size:26px; color:#fff;
}
.sep{opacity:.75;margin:0 1px}

/* Digit roller */
.grp{display:inline-flex;gap:2px}
.digit{display:inline-block;width:20px;height:26px;overflow:hidden}
.col{display:flex;flex-direction:column;transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.cell{height:26px;line-height:26px;text-align:center}

/* Kayan neon alt şerit */
.liveUnderline{
  width:100%; height:3px; border-radius:2px;
  background:linear-gradient(90deg, rgba(255,42,42,0), rgba(255,42,42,1), rgba(255,42,42,0));
  background-size:200% 100%;
  animation:slidebar 3s linear infinite;
  box-shadow:0 0 14px rgba(255,42,42,.6);
}
@keyframes slidebar{
  0%{background-position:0% 0}
  100%{background-position:200% 0}
}

/* Hızlı Bonus */
.btn{display:inline-flex;align-items:center;gap:8px;cursor:pointer;border:1px solid transparent;background:transparent;color:var(--text);padding:8px 12px;border-radius:12px;transition:.15s}
.btn:hover{filter:brightness(1.06);transform:translateY(-1px)}
.btn.bonus{color:#fff;border-color:rgba(255,255,255,.18)}
.btn.bonus .notif{display:inline-block;width:10px;height:10px;border-radius:999px;background:#ff4d6d;box-shadow:0 0 0 8px rgba(255,77,109,.18);animation:pulse 1.8s infinite}
@keyframes pulse{0%{transform:scale(.9)}50%{transform:scale(1.15)}100%{transform:scale(.9)}}

/* Giriş CTA */
.btn.cta{
  color:#001018;background:linear-gradient(90deg,var(--aqua),#4aa7ff);
  border-color:#0f6d8c;box-shadow:0 4px 18px rgba(0,229,255,.25),inset 0 0 0 1px rgba(255,255,255,.18);
  font-weight:900;letter-spacing:.3px;position:relative;overflow:hidden
}
.btn.cta.clicked::after{
  content:"";position:absolute;inset:0;
  background:radial-gradient(120px 120px at 50% 50%,rgba(255,255,255,.45),transparent 60%);
  animation:clickflash .45s ease-out forwards
}
@keyframes clickflash{0%{opacity:.9;transform:scale(.9)}100%{opacity:0;transform:scale(1.2)}}
.mouse{color:#001018}
`;
