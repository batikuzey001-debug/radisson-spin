// web/src/components/Header.tsx
import { useEffect, useMemo, useState } from "react";
import { getHeaderConfig, type HeaderConfig } from "../api/site";

/**
 * Global Header
 * - Logo (CMS)
 * - LIVE sayaç (küçük, dijital)
 * - Sağda: Hızlı Bonus (ghost pill) + Giriş CTA (primary pill)
 * - Altında kayan kırmızı şerit
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
        const ext = data as HeaderConfigExt;
        setCfg(ext);
        const { low, high } = calcBandRange(ext);
        setOnline(randInt(low, high));
      })
      .catch(() => {
        const fb: HeaderConfigExt = { logo_url: "", login_cta_text: "Giriş", login_cta_url: "" };
        setCfg(fb);
        const { low, high } = calcBandRange(fb);
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
          {/* Hızlı Bonus (ghost / köşeli) */}
          <button
            type="button"
            className="pill ghost"
            onClick={(e) => e.preventDefault()}
            title="Hızlı Bonus (demo)"
          >
            <span className="ico" aria-hidden>
              {/* zil – düzgün vektör */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2Z" />
              </svg>
            </span>
            <span className="txt">Hızlı Bonus</span>
            <span className="dot" aria-hidden />
          </button>

          {/* Giriş (primary / köşeli) */}
          <button
            type="button"
            className="pill primary"
            data-clicked={clicked ? "1" : "0"}
            title={cfg?.login_cta_text || "Giriş"}
            onClick={() => {
              if (!cfg?.login_cta_url) return;
              setClicked(true);
              setTimeout(() => setClicked(false), 550);
              window.location.assign(cfg.login_cta_url);
            }}
          >
            <span className="ico" aria-hidden>
              {/* anahtar – vektör */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M21 10a5 5 0 1 0-9.58 2H2v4h4v2h4v-2h2.42A5 5 0 0 0 21 10Zm-5 3a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
              </svg>
            </span>
            <span className="txt">{cfg?.login_cta_text || "Giriş"}</span>
            <span className="glow" aria-hidden />
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
  --digital:'Orbitron', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
*{box-sizing:border-box}

/* Header zemin */
.hdr{background:linear-gradient(180deg,var(--bg),var(--bg2));border-bottom:1px solid rgba(255,255,255,.06)}
.hdr__in{max-width:1200px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.left,.right{display:flex;align-items:center;gap:12px;flex-wrap:nowrap}

/* Logo */
.logo{height:32px;display:block;filter:drop-shadow(0 0 10px rgba(0,229,255,.22))}
@media (max-width:720px){ .logo{height:28px} }

/* LIVE (küçük dijital) */
.liveWrap{display:flex;flex-direction:column;align-items:flex-start;gap:2px}
@media (max-width:820px){ .liveWrap{display:none} }
.liveRow{display:flex;align-items:center;gap:6px}
.liveWord{display:inline-flex;align-items:center;gap:5px;font-weight:800;color:var(--red);font-size:13px;line-height:1}
.dotR{width:6px;height:6px;border-radius:999px;background:var(--red);box-shadow:0 0 8px rgba(255,42,42,.8);animation:blink 1s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}

.roller{
  display:inline-flex;align-items:center;gap:2px;font-weight:800;font-size:13px;color:#fff;
  font-family:var(--digital);
}
.sep{opacity:.7;margin:0 1px}
.grp{display:inline-flex;gap:1px}
.digit{display:inline-block;width:11px;height:13px;overflow:hidden}
.col{display:flex;flex-direction:column;transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.cell{height:13px;line-height:13px;text-align:center;font-size:12px;color:#fff}

/* Kayan kırmızı çizgi */
.liveUnderline{
  width:100%; height:2px; border-radius:2px; overflow:hidden;
  background:linear-gradient(90deg, rgba(255,42,42,0), rgba(255,42,42,1), rgba(255,42,42,0));
  background-size:180% 100%;
  animation:slidebar 2.6s linear infinite;
  box-shadow:0 0 8px rgba(255,42,42,.5);
}
@keyframes slidebar{ 0%{background-position:0% 0} 100%{background-position:180% 0} }

/* ===================== Köşeli PILL Butonlar ===================== */
.pill{
  display:inline-flex; align-items:center; gap:8px;
  height:34px; padding:0 12px;
  border-radius:10px; border:1px solid transparent;
  font-weight:700; font-size:13px; line-height:34px; color:#eaf2ff;
  white-space:nowrap; text-decoration:none; cursor:pointer; position:relative;
}
.pill .ico{font-size:13px}

.pill.ghost{
  background: rgba(255,255,255,.06);
  border-color: rgba(255,255,255,.12);
}
.pill.ghost .dot{
  width:8px;height:8px;border-radius:999px;background:#ff4d6d;
  box-shadow:0 0 0 6px rgba(255,77,109,.18); margin-left:2px;
}

.pill.primary{
  background: linear-gradient(90deg,#00e5ff,#4aa7ff);
  color:#001018;
  border-color:#0f6d8c;
  box-shadow: 0 4px 12px rgba(0,229,255,.22), inset 0 0 0 1px rgba(255,255,255,.18);
}
.pill.primary[data-clicked="1"]{ animation:press .5s cubic-bezier(.2,.7,.2,1) }
@keyframes press{
  0%{ transform:translateY(0) scale(1) }
  40%{ transform:translateY(1px) scale(.98) }
  100%{ transform:translateY(0) scale(1) }
}
`;
