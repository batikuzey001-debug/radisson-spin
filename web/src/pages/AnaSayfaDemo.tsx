// web/src/pages/AnaSayfaDemo.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * HEADER DEMO (only header)
 * İsteklere göre:
 * - Logo: daha büyük, yazı yok (yanındaki metin kaldırıldı)
 * - Sol: “Hızlı Bonus” (daha dikkat çekici bildirim)
 * - Orta: TV tarzı LIVE (kırmızı, çerçevesiz) + PLAYERS + animasyonlu sayı (digit roller)
 * - Sağ: “Radissonbet Giriş” CTA (ikonlu, belirgin)
 * - Kutusuz/minimal çizgiler, koyu lacivert + aqua vurgular
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

  // Mock dalgalanma (ileride gerçek API ile değişecek)
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
        {/* Sol: Logo + Hızlı Bonus */}
        <div className="left">
          <a className="logoWrap" href="/" onClick={(e) => e.preventDefault()}>
            <img className="logo" src={LOGO} alt="Radisson" />
          </a>

          <button
            className="btn bonus"
            onClick={(e) => {
              e.preventDefault();
            }}
            title="Hızlı Bonus (demo)"
          >
            <BellIcon />
            <span>Hızlı Bonus</span>
            <span className="notif" aria-hidden />
          </button>
        </div>

        {/* Orta: LIVE + PLAYERS + animasyonlu sayı */}
        <LiveCenter value={online} />

        {/* Sağ: Giriş CTA */}
        <button
          className="btn cta"
          onClick={() => {
            // DEMO yönlendirme – entegrasyonda gerçek link
            window.location.assign("/");
          }}
          title="Radissonbet Giriş"
        >
          <MouseClickIcon />
          <span>Radissonbet Giriş</span>
        </button>
      </div>
    </header>
  );
}

/* ---------------- CENTER: LIVE + PLAYERS + DIGIT ROLLER ---------------- */
function LiveCenter({ value }: { value: number }) {
  const groups = useMemo(() => splitThousands(value), [value]);
  return (
    <div className="livebar" aria-label="live-players">
      <span className="liveTxt">
        <span className="dot" />
        LIVE
      </span>
      <span className="players">PLAYERS</span>

      <span className="roller">
        {groups.map((g, gi) =>
          g.kind === "sep" ? (
            <span key={`sep-${gi}`} className="sep">
              .
            </span>
          ) : (
            <DigitGroup key={`grp-${gi}`} digits={g.value} />
          )
        )}
      </span>
    </div>
  );
}

// Bir grup (ör: "5", "482") için dikey dönen digit sütunları
function DigitGroup({ digits }: { digits: string }) {
  return (
    <span className="grp">
      {digits.split("").map((d, i) => (
        <Digit key={i} target={d} />
      ))}
    </span>
  );
}

// 0-9 sütunu; hedef rakama translateY ile kayar
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
  // Türkçe grup: 1.234.567
  const rev = s.split("").reverse();
  const out: string[] = [];
  for (let i = 0; i < rev.length; i++) {
    if (i > 0 && i % 3 === 0) out.push(".");
    out.push(rev[i]);
  }
  const grouped = out.reverse().join("");
  // segmentlere ayır (gruplar ve ayraçlar)
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

/* ---------------- ICONS ---------------- */
function MouseClickIcon() {
  return (
    <svg className="mouse" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a5 5 0 0 1 5 5v4H7V7a5 5 0 0 1 5-5Z" fill="currentColor" opacity=".9" />
      <path d="M7 11h10v5a5 5 0 0 1-10 0v-5Z" fill="currentColor" opacity=".55" />
      <path d="M12 6v12" stroke="currentColor" strokeWidth="1.6" opacity=".9" />
      <path d="M18.5 4.5l2-2M19.5 8h2.5M17 2v-2" stroke="currentColor" strokeWidth="1.4" opacity=".8" />
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

/* ---------------- CSS ---------------- */
const css = `
:root{
  --bg:#0b1224; --bg2:#0e1a33; --text:#eaf2ff; --muted:#a9bddb;
  --aqua:#00e5ff; --aqua2:#79e8ff; --red:#ff0033;
}
*{box-sizing:border-box}
body{margin:0}
.demo{min-height:40vh;background:linear-gradient(180deg,var(--bg),var(--bg2));}

/* Header */
.hdr{position:relative;background:rgba(8,14,28,.45);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.06)}
.hdr__in{max-width:1200px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;gap:12px}
.left{display:flex;align-items:center;gap:12px}

/* Logo (daha büyük, önde) */
.logoWrap{display:inline-block}
.logo{height:36px;display:block;filter:drop-shadow(0 0 12px rgba(0,229,255,.28))}

/* Hızlı Bonus (solda) */
.btn{display:inline-flex;align-items:center;gap:8px;cursor:pointer;border:1px solid transparent;background:transparent;color:var(--text);padding:8px 12px;border-radius:12px;transition:filter .15s, transform .15s}
.btn:hover{filter:brightness(1.06);transform:translateY(-1px)}
.btn.bonus{color:#dff6ff;border-color:rgba(255,255,255,.18)}
.btn.bonus .notif{display:inline-block;width:9px;height:9px;border-radius:999px;background:#ff4d6d;box-shadow:0 0 0 8px rgba(255,77,109,.18);animation:pulse 1.8s infinite}
@keyframes pulse{0%{transform:scale(.9)}50%{transform:scale(1.15)}100%{transform:scale(.9)}}

/* Orta: LIVE + PLAYERS + sayı */
.hdr__in{justify-content:space-between}
.livebar{display:flex;align-items:baseline;gap:10px;margin:0 8px;font-variant-numeric:tabular-nums}
.liveTxt{display:inline-flex;align-items:center;gap:6px;color:#ff2a2a;font-weight:900;letter-spacing:.6px}
.liveTxt .dot{width:8px;height:8px;border-radius:999px;background:#ff2a2a;box-shadow:0 0 10px rgba(255,42,42,.9);animation:blink 1s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
.players{color:#b9cbe6;letter-spacing:.4px;font-weight:700}
.roller{display:inline-flex;align-items:center;gap:6px;color:#fff}
.sep{opacity:.6;margin:0 2px}

/* Digit roller */
.grp{display:inline-flex;gap:2px}
.digit{display:inline-block;width:14px;height:18px;overflow:hidden;border-radius:4px}
.col{display:flex;flex-direction:column;transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.cell{height:18px;line-height:18px;text-align:center;font-weight:800;letter-spacing:.2px;color:#e8f4ff;text-shadow:0 0 10px rgba(0,229,255,.15)}

/* Sağ: Giriş CTA */
.btn.cta{color:#001018;background:linear-gradient(90deg,var(--aqua),#4aa7ff);border-color:#0f6d8c;box-shadow:0 4px 18px rgba(0,229,255,.25), inset 0 0 0 1px rgba(255,255,255,.18);font-weight:800;letter-spacing:.2px}
.mouse{color:#001018}

@media (max-width:840px){
  .players{display:none}
}
@media (max-width:720px){
  .livebar{gap:8px}
  .logo{height:32px}
}
`;
