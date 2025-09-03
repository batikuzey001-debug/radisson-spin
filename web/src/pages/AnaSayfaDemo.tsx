// web/src/pages/AnaSayfaDemo.tsx
import { useEffect, useMemo, useState } from "react";

/**
 * HEADER DEMO (only header)
 * Revize: LIVE PLAYERS bloğu daha uyumlu ve tek etiket gibi görünecek.
 * - Logo büyük
 * - Sol: Hızlı Bonus (bildirim)
 * - Orta: LIVE PLAYERS (tek şerit etiket) + animasyonlu sayı (aynı font)
 * - Sağ: Radissonbet Giriş (cursor-click efekti)
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

  // Mock dalgalanma (ileride gerçek API)
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
        {/* Sol: Logo + LIVE PLAYERS */}
        <div className="left">
          <a className="logoWrap" href="/" onClick={(e) => e.preventDefault()}>
            <img className="logo" src={LOGO} alt="Radisson" />
          </a>
          <LivePlayers value={online} />
        </div>

        {/* Sağ: önce Hızlı Bonus, sonra Giriş CTA */}
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

/* -------------- CENTER: LIVE PLAYERS (tek etiket) + DIGIT ROLLER -------------- */
function LivePlayers({ value }: { value: number }) {
  const parts = useMemo(() => splitThousands(value), [value]);
  return (
    <div className="livebar" aria-label="live-players">
      <span className="liveLabel">
        <span className="liveWord">LIVE</span>
        <span className="dot" />
        <span className="playersWord">PLAYERS</span>
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
  let buffer = "";
  for (const ch of grouped) {
    if (ch === ".") {
      if (buffer) parts.push({ kind: "num", value: buffer }), (buffer = "");
      parts.push({ kind: "sep" });
    } else buffer += ch;
  }
  if (buffer) parts.push({ kind: "num", value: buffer });
  return parts;
}

/* -------------- ICONS -------------- */
function MouseClickIcon() {
  return (
    <svg className="mouse" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a5 5 0 0 1 5 5v4H7V7a5 5 0 0 1 5-5Z" fill="currentColor" opacity=".95" />
      <path d="M7 11h10v5a5 5 0 0 1-10 0v-5Z" fill="currentColor" opacity=".6" />
      <path d="M12 6v12" stroke="currentColor" strokeWidth="1.6" opacity=".95" />
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

/* -------------- CSS -------------- */
const css = `
:root{
  --bg:#0b1224; --bg2:#0e1a33; --text:#eaf2ff; --muted:#a9bddb;
  --aqua:#00e5ff; --aqua2:#79e8ff; --red:#ff2a2a;
  --live-font: "Roboto Condensed", "Arial Narrow", "Segoe UI", system-ui, sans-serif;
}
*{box-sizing:border-box}
body{margin:0}
.demo{min-height:40vh;background:linear-gradient(180deg,var(--bg),var(--bg2));}

/* Header */
.hdr{position:relative;background:rgba(8,14,28,.45);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.06)}
.hdr__in{max-width:1200px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.left{display:flex;align-items:center;gap:14px}
.right{display:flex;align-items:center;gap:10px}

/* Logo */
.logoWrap{display:inline-block}
.logo{height:40px;display:block;filter:drop-shadow(0 0 12px rgba(0,229,255,.28))}
@media (max-width:720px){ .logo{height:34px} }

/* Hızlı Bonus */
.btn{display:inline-flex;align-items:center;gap:8px;cursor:pointer;border:1px solid transparent;background:transparent;color:var(--text);padding:8px 12px;border-radius:12px;transition:filter .15s, transform .15s}
.btn:hover{filter:brightness(1.06);transform:translateY(-1px)}
.btn.bonus{color:#dff6ff;border-color:rgba(255,255,255,.18)}
.btn.bonus .notif{display:inline-block;width:9px;height:9px;border-radius:999px;background:#ff4d6d;box-shadow:0 0 0 8px rgba(255,77,109,.18);animation:pulse 1.8s infinite}
@keyframes pulse{0%{transform:scale(.9)}50%{transform:scale(1.15)}100%{transform:scale(.9)}}

/* LIVE PLAYERS (tek etiket) + sayı */
.livebar{
  display:flex; align-items:center; gap:12px;
  font-variant-numeric:tabular-nums;
  font-family:var(--live-font);
}
.liveLabel{
  position:relative; display:flex; align-items:center; gap:10px;
  letter-spacing:.6px; font-weight:900;
}
.liveLabel::after{
  content:""; position:absolute; left:0; right:0; bottom:-2px; height:2px;
  background:linear-gradient(90deg,transparent,var(--red),transparent);
  opacity:.55;
}
.liveWord{color:var(--red)}
.dot{
  width:6px; height:6px; border-radius:999px; background:var(--red);
  box-shadow:0 0 10px rgba(255,42,42,.9); animation:blink 1s infinite;
}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}
.playersWord{color:#e9f1ff; opacity:.92}
.roller{display:inline-flex; align-items:center; gap:6px; color:#fff; margin-left:2px}
.sep{opacity:.6; margin:0 1px}

/* Digit roller */
.grp{display:inline-flex; gap:2px}
.digit{display:inline-block; width:16px; height:20px; overflow:hidden}
.col{display:flex; flex-direction:column; transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.cell{
  height:20px; line-height:20px; text-align:center;
  font-weight:900; letter-spacing:.1px; color:#e8f4ff;
  text-shadow:0 0 10px rgba(0,229,255,.15);
  font-family:var(--live-font);
}

/* Giriş CTA */
.btn.cta{
  color:#001018;
  background:linear-gradient(90deg,var(--aqua),#4aa7ff);
  border-color:#0f6d8c;
  box-shadow:0 4px 18px rgba(0,229,255,.25), inset 0 0 0 1px rgba(255,255,255,.18);
  font-weight:900; letter-spacing:.2px; position:relative; overflow:hidden;
}
.btn.cta.clicked::after{
  content:""; position:absolute; inset:0;
  background:radial-gradient(120px 120px at 50% 50%, rgba(255,255,255,.45), transparent 60%);
  animation:clickflash .45s ease-out forwards;
}
@keyframes clickflash{0%{opacity:.9;transform:scale(.9)}100%{opacity:0;transform:scale(1.2)}}
.mouse{color:#001018}

@media (max-width:880px){ .playersWord{display:none} }
`;
