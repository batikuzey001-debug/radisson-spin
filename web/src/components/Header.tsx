// web/src/components/Header.tsx
import { useEffect, useMemo, useState } from "react";
import { getHeaderConfig, type HeaderConfig } from "../api/site";

/**
 * Global Header (UI revamp only)
 * - Link/işlevler KORUNDU (getHeaderConfig, login yönlendirme)
 * - Hızlı Bonus: köşeli premium "chip" + gelişmiş bildirim (pulse + ring)
 * - Radisson Giriş: köşeli “primary” buton, çok katmanlı premium görünüm
 * - LIVE: dijital saat fontu (mümkün olan local font aileleriyle)
 */

type HeaderConfigExt = HeaderConfig & {
  online_min?: number | string;
  online_max?: number | string;
};

export default function Header() {
  const [cfg, setCfg] = useState<HeaderConfigExt | null>(null);
  const [online, setOnline] = useState<number>(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [clicked, setClicked] = useState(false);

  // CMS'den ayar
  useEffect(() => {
    getHeaderConfig()
      .then((data) => {
        setCfg(data as HeaderConfigExt);
        const { low, high } = calcBandRange(data);
        setOnline(randInt(low, high));
      })
      .catch(() => {
        const fallback: HeaderConfigExt = { logo_url: "", login_cta_text: "Giriş", login_cta_url: "" };
        setCfg(fallback);
        const { low, high } = calcBandRange(fallback);
        setOnline(randInt(low, high));
      });
  }, []);

  // 4 sn'de bir dalgalanma
  useEffect(() => {
    const t = setInterval(() => {
      const { low, high } = calcBandRange(cfg);
      const target = randInt(low, high);
      setOnline((n) => {
        const diff = target - n;
        const step = clamp(Math.round(diff * 0.25) + jitter(2), -120, 120);
        let next = n + step * dir;
        next = Math.max(low, Math.min(high, next));
        if (Math.abs(diff) < 20) setDir((d) => (d === 1 ? -1 : 1));
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, dir]);

  return (
    <header className="hdr">
      <div className="hdr__in">
        {/* Sol: Logo + LIVE */}
        <div className="left">
          {cfg?.logo_url ? (
            <a className="logoWrap" href="/" onClick={(e) => e.preventDefault()}>
              <img className="logo" src={cfg.logo_url} alt="Logo" />
            </a>
          ) : null}
          <LiveStrip value={online} />
        </div>

        {/* Sağ: Hızlı Bonus + Giriş */}
        <div className="right">
          {/* Hızlı Bonus (köşeli chip) */}
          <button
            className="chip ghost"
            onClick={(e) => e.preventDefault()}
            title="Hızlı Bonus (demo)"
          >
            <span className="chip__ledge" aria-hidden />
            <span className="chip__ico" aria-hidden>🔔</span>
            <span className="chip__txt">Hızlı Bonus</span>
            <span className="chip__badge" aria-hidden>
              <span className="pulse" />
              <span className="ring" />
            </span>
          </button>

          {/* Radisson Giriş (primary, premium) */}
          <button
            className="chip primary"
            onClick={() => {
              if (!cfg?.login_cta_url) return;
              setClicked(true);
              setTimeout(() => setClicked(false), 550);
              window.location.assign(cfg.login_cta_url);
            }}
            data-clicked={clicked ? "1" : "0"}
            title={cfg?.login_cta_text || "Giriş"}
          >
            <span className="chip__glow" aria-hidden />
            <span className="chip__ico" aria-hidden>🟢</span>
            <span className="chip__txt">{cfg?.login_cta_text || "Giriş"}</span>
          </button>
        </div>
      </div>

      <style>{css}</style>
    </header>
  );
}

/* ----------------- LIVE (kırmızı) + dijital sayı + kayan neon şerit ----------------- */
function LiveStrip({ value }: { value: number }) {
  const parts = useMemo(() => splitThousands(value), [value]);
  return (
    <div className="liveWrap" aria-label="live">
      <div className="liveRow">
        <span className="liveWord">
          <span className="dotR" />
          LIVE
        </span>
        <span className="roller">
          {parts.map((p, i) =>
            p.kind === "sep" ? (
              <span key={`sep-${i}`} className="sep">.</span>
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
          <span key={n} className="cell">{n}</span>
        ))}
      </span>
    </span>
  );
}

/* ----------------- Helpers ----------------- */
function calcBandRange(cfg?: HeaderConfigExt | null): { low: number; high: number } {
  const min = toNum(cfg?.online_min, 4800);
  const max = toNum(cfg?.online_max, 6800);
  const span = Math.max(0, max - min);

  const hour = new Date().getHours();
  if (hour >= 3 && hour < 6) return { low: min, high: min + Math.max(10, Math.round(span * 0.15)) };
  if (hour >= 6 && hour < 15) return { low: min + Math.round(span * 0.2), high: min + Math.round(span * 0.55) };
  if (hour >= 15 && hour < 22) return { low: min + Math.round(span * 0.7), high: max - Math.round(span * 0.1) };
  return { low: max - Math.round(span * 0.15), high: max };
}
function toNum(v: unknown, def: number): number {
  if (v === null || v === undefined) return def;
  const n = typeof v === "string" ? parseInt(v, 10) : (v as number);
  return Number.isFinite(n) ? n : def;
}
function randInt(a: number, b: number) {
  return Math.floor(a + Math.random() * Math.max(1, b - a + 1));
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function jitter(n: number) {
  return Math.floor((Math.random() - 0.5) * (n * 2 + 1));
}
function splitThousands(n: number): Array<{ kind: "num"; value: string } | { kind: "sep" }> {
  const s = String(Math.max(0, Math.floor(n)));
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

/* ----------------- CSS ----------------- */
const css = `
:root{
  --bg:#0b1224; --bg2:#0e1a33; --text:#eaf2ff; --aqua:#00e5ff; --red:#ff2a2a;
  --gold:#ffd36a; --gold2:#f0b73a; --ink:#001018;
}
/* Header zemin */
.hdr{background:linear-gradient(180deg,var(--bg),var(--bg2));border-bottom:1px solid rgba(255,255,255,.06)}
.hdr__in{max-width:1200px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.left,.right{display:flex;align-items:center;gap:12px;flex-wrap:nowrap}

/* Logo */
.logo{height:32px;display:block;filter:drop-shadow(0 0 10px rgba(0,229,255,.22))}
@media (max-width:720px){ .logo{height:28px} }

/* LIVE (dijital font ailesi) */
.liveWrap{display:flex;flex-direction:column;align-items:flex-start;gap:2px}
@media (max-width:820px){ .liveWrap{display:none} }
.liveRow{display:flex;align-items:center;gap:6px}
.liveWord{display:inline-flex;align-items:center;gap:5px;font-weight:800;color:var(--red);font-size:13px;line-height:1;letter-spacing:.4px}
.dotR{width:6px;height:6px;border-radius:999px;background:var(--red);box-shadow:0 0 8px rgba(255,42,42,.8);animation:blink 1s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}
.roller{
  display:inline-flex;align-items:center;gap:2px;font-weight:800;font-size:13px;color:#fff;
  font-family: "DS-Digital","Digital-7","Orbitron","Share Tech Mono","Courier New",monospace;
  letter-spacing:.4px;
}
.sep{opacity:.7;margin:0 1px}
.grp{display:inline-flex;gap:1px}
.digit{display:inline-block;width:12px;height:14px;overflow:hidden}
.col{display:flex;flex-direction:column;transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.cell{
  height:14px;line-height:14px;text-align:center;font-size:12px;color:#e9f6ff;
  text-shadow:0 0 6px rgba(0,229,255,.35);
}

/* Kayan kırmızı çizgi (aktif) */
.liveUnderline{
  width:100%; height:2px; border-radius:2px; overflow:hidden;
  background:linear-gradient(90deg, rgba(255,42,42,0), rgba(255,42,42,1), rgba(255,42,42,0));
  background-size:180% 100%;
  animation:slidebar 2.6s linear infinite;
  box-shadow:0 0 8px rgba(255,42,42,.5);
}
@keyframes slidebar{ 0%{background-position:0% 0} 100%{background-position:180% 0} }

/* ===================== Premium Köşeli Chip Butonlar ===================== */
.chip{
  --h:36px;
  display:inline-flex; align-items:center; gap:10px;
  height:var(--h); padding:0 14px;
  border-radius:12px; border:1px solid rgba(255,255,255,.12);
  font-weight:800; font-size:13px; line-height:var(--h); color:#eaf2ff;
  white-space:nowrap; text-decoration:none; cursor:pointer; position:relative;
  isolation:isolate; transform:translateZ(0);
}
.chip:after{ /* üst parlama çizgisi */
  content:""; position:absolute; inset:0; border-radius:12px;
  background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,0) 40%);
  pointer-events:none; mix-blend:screen; opacity:.6;
}
.chip .chip__ico{font-size:13px; display:inline-grid; place-items:center}

/* GHOST (Hızlı Bonus) */
.chip.ghost{
  background:
    linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04)),
    linear-gradient(90deg, rgba(255,255,255,.08), rgba(255,255,255,0));
  backdrop-filter: blur(6px);
  border-color: rgba(255,255,255,.18);
  box-shadow:
    inset 0 0 0 0.5px rgba(255,255,255,.2),
    0 6px 16px rgba(0,0,0,.25);
}
.chip.ghost:hover{ filter:brightness(1.08) }
.chip__ledge{ /* sol ince ledge: premium detay */
  width:2px; height:60%; border-radius:2px; background:linear-gradient(180deg,#ff6584,#ffc0cb);
  box-shadow:0 0 10px rgba(255,101,132,.6), 0 0 20px rgba(255,101,132,.35);
}
.chip__badge{
  position:relative; width:10px; height:10px; flex:0 0 10px;
}
.chip__badge .pulse{
  position:absolute; inset:0; border-radius:999px; background:#ff4d6d;
  box-shadow:0 0 12px rgba(255,77,109,.8);
  animation:pulse 1.4s ease-in-out infinite;
}
.chip__badge .ring{
  position:absolute; inset:-8px; border-radius:999px; border:2px solid rgba(255,77,109,.25);
  animation:ring 1.4s ease-out infinite;
}
@keyframes pulse{
  0%,100%{transform:scale(1); opacity:1} 50%{transform:scale(.8); opacity:.6}
}
@keyframes ring{
  0%{transform:scale(.6); opacity:.6} 100%{transform:scale(1.2); opacity:0}
}

/* PRIMARY (Radisson Giriş) */
.chip.primary{
  background
