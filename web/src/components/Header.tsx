// web/src/components/Header.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getHeaderConfig, type HeaderConfig } from "../api/site";

/**
 * Header – V2 (tasarım fix)
 *  - Önceki tasarıma yakın “temiz pill” butonlar
 *  - Yükseklik, hizalama ve boşluklar düzeltildi
 *  - Logo tıklandığında anasayfa
 *  - Küçük ekranda LIVE sayaç gizlenir (kırılmayı önler)
 */

type HeaderConfigExt = HeaderConfig & {
  online_min?: number | string;
  online_max?: number | string;
};

export default function Header() {
  const [cfg, setCfg] = useState<HeaderConfigExt | null>(null);
  const [online, setOnline] = useState<number>(0);
  const [dir, setDir] = useState<1 | -1>(1);

  useEffect(() => {
    getHeaderConfig()
      .then((data) => {
        setCfg(data as HeaderConfigExt);
        const { low, high } = calcBandRange(data);
        setOnline(randInt(low, high));
      })
      .catch(() => {
        const fallback: HeaderConfigExt = { logo_url: "", login_cta_text: "Radissonbet Giriş", login_cta_url: "" };
        setCfg(fallback);
        const { low, high } = calcBandRange(fallback);
        setOnline(randInt(low, high));
      });
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const { low, high } = calcBandRange(cfg);
      const target = randInt(low, high);
      setOnline((n) => {
        const diff = target - n;
        const step = Math.max(-120, Math.min(120, Math.round(diff * 0.25)));
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
        <div className="left">
          {cfg?.logo_url ? (
            <Link className="logoWrap" to="/" aria-label="Anasayfa">
              <img className="logo" src={cfg.logo_url} alt="Logo" />
            </Link>
          ) : null}
          <LiveStrip value={online} />
        </div>

        <div className="right">
          <button className="pill ghost" onClick={(e) => e.preventDefault()} title="Hızlı Bonus">
            <span className="ico" aria-hidden>🔔</span>
            <span>Hızlı Bonus</span>
            <span className="dot" />
          </button>

          <a
            className="pill primary"
            href={cfg?.login_cta_url || "#"}
            onClick={(e) => !cfg?.login_cta_url && e.preventDefault()}
            title={cfg?.login_cta_text || "Giriş"}
          >
            <span className="ico" aria-hidden>🟢</span>
            <span>{cfg?.login_cta_text || "Radissonbet Giriş"}</span>
          </a>
        </div>
      </div>

      <style>{css}</style>
    </header>
  );
}

/* ----------------- LIVE sayaç ----------------- */
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

/* ----------------- helpers ----------------- */
function calcBandRange(cfg?: HeaderConfigExt | null): { low: number; high: number } {
  const min = toNum(cfg?.online_min, 4800);
  const max = toNum(cfg?.online_max, 6800);
  const span = Math.max(0, max - min);
  const h = new Date().getHours();
  if (h >= 3 && h < 6) return { low: min, high: min + Math.max(10, Math.round(span * 0.15)) };
  if (h >= 6 && h < 15) return { low: min + Math.round(span * 0.2), high: min + Math.round(span * 0.55) };
  if (h >= 15 && h < 22) return { low: min + Math.round(span * 0.7), high: max - Math.round(span * 0.1) };
  return { low: max - Math.round(span * 0.15), high: max };
}
function toNum(v: unknown, def: number) {
  if (v === null || v === undefined) return def;
  const n = typeof v === "string" ? parseInt(v, 10) : (v as number);
  return Number.isFinite(n) ? n : def;
}
function randInt(a: number, b: number) {
  return Math.floor(a + Math.random() * Math.max(1, b - a + 1));
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
}
*{box-sizing:border-box}

/* Header sabit yükseklik – hizalama düzgün */
.hdr{
  position: sticky; top: 0; z-index: 60;
  background: linear-gradient(180deg, var(--bg), var(--bg2));
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.hdr__in{
  max-width:1200px; margin:0 auto;
  padding:10px 16px;
  display:flex; align-items:center; justify-content:space-between;
  gap:12px; min-height:56px;
}
.left,.right{display:flex;align-items:center;gap:12px;flex-wrap:nowrap}

/* Logo */
.logo{height:34px;display:block;filter:drop-shadow(0 0 10px rgba(0,229,255,.22))}
@media (max-width:720px){ .logo{height:30px} }

/* LIVE – küçük ekranlarda gizle */
.liveWrap{display:flex;flex-direction:column;align-items:flex-start;gap:2px}
@media (max-width:820px){ .liveWrap{display:none} }
.liveRow{display:flex;align-items:center;gap:8px}
.liveWord{display:inline-flex;align-items:center;gap:6px;font-weight:800;color:var(--red);font-size:14px}
.dotR{width:7px;height:7px;border-radius:999px;background:var(--red);box-shadow:0 0 8px rgba(255,42,42,.8);animation:blink 1s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}
.roller{display:inline-flex;align-items:center;gap:3px;font-weight:800;font-size:14px;color:#fff}
.sep{opacity:.7;margin:0 1px}
.grp{display:inline-flex;gap:1px}
.digit{display:inline-block;width:12px;height:14px;overflow:hidden}
.col{display:flex;flex-direction:column;transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.cell{height:14px;line-height:14px;text-align:center;font-size:12px;color:#fff}
.liveUnderline{width:100%;height:1.5px;border-radius:2px;background:linear-gradient(90deg,rgba(255,42,42,0),rgba(255,42,42,1),rgba(255,42,42,0));background-size:180% 100%;animation:slidebar 2.8s linear infinite;box-shadow:0 0 8px rgba(255,42,42,.45)}
@keyframes slidebar{0%{background-position:0% 0}100%{background-position:180% 0}}

/* PILL butonlar (tasarıma yakın) */
.pill{
  display:inline-flex; align-items:center; gap:8px;
  padding:8px 12px; height:36px;
  border-radius:999px; border:1px solid transparent;
  text-decoration:none; cursor:pointer; white-space:nowrap;
  font-weight:700; font-size:14px;
}
.pill .ico{font-size:14px; opacity:.9}

/* Ghost (Hızlı Bonus) */
.pill.ghost{
  background: rgba(255,255,255,.06);
  border-color: rgba(255,255,255,.10);
  color:#eaf2ff;
  box-shadow: 0 4px 10px rgba(0,0,0,.25);
  transition: filter .15s, transform .15s;
}
.pill.ghost:hover{ filter:brightness(1.08); transform:translateY(-1px) }
.pill .dot{
  width:8px;height:8px;border-radius:999px;background:#ff4d6d;
  box-shadow:0 0 0 6px rgba(255,77,109,.18); margin-left:2px;
}

/* Primary (Giriş) */
.pill.primary{
  background: linear-gradient(90deg,#00e5ff,#4aa7ff);
  color:#001018;
  border-color:#0f6d8c;
  box-shadow: 0 6px 18px rgba(0,229,255,.22), inset 0 0 0 1px rgba(255,255,255,.18);
  transition: filter .15s, transform .15s;
}
.pill.primary:hover{ filter:brightness(1.05); transform:translateY(-1px) }
`;
