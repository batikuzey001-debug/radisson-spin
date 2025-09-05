// web/src/components/Header.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";

/* ===== Types & Config ===== */
type HeaderConfig = {
  logo_url?: string;
  login_cta_text?: string;
  login_cta_url?: string;
  online_min?: number | string;
  online_max?: number | string;
};
const API = import.meta.env.VITE_API_BASE_URL;

/* ===== Helpers ===== */
function toNum(v: unknown, def: number) {
  if (v === null || v === undefined) return def;
  const n = typeof v === "string" ? parseInt(v, 10) : (v as number);
  return Number.isFinite(n) ? n : def;
}
function calcBand(hour: number, min: number, max: number) {
  const span = Math.max(0, max - min);
  if (hour >= 3 && hour < 6)  return [min, min + Math.max(10, Math.round(span * 0.15))] as const;
  if (hour >= 6 && hour < 15) return [min + Math.round(span * 0.2), min + Math.round(span * 0.55)] as const;
  if (hour >= 15 && hour < 22) return [min + Math.round(span * 0.7), max - Math.round(span * 0.1)] as const;
  return [max - Math.round(span * 0.15), max] as const;
}
function splitThousands(n: number) {
  const s = String(Math.max(0, Math.floor(n)));
  const rev = s.split("").reverse();
  const out: string[] = [];
  for (let i = 0; i < rev.length; i++) { if (i > 0 && i % 3 === 0) out.push("."); out.push(rev[i]); }
  return out.reverse().join("");
}

/* ===== Animated digits (roll effect) ===== */
function AnimatedDigits({ value }: { value: number }) {
  const str = useMemo(() => splitThousands(value), [value]);
  // Split into groups: digits and separators
  return (
    <span className="digits">
      {str.split("").map((ch, i) =>
        ch === "." ? (
          <span key={`sep-${i}`} className="sep">.</span>
        ) : (
          <Digit key={`d-${i}`} d={ch} />
        )
      )}
    </span>
  );
}
function Digit({ d }: { d: string }) {
  const target = Math.max(0, Math.min(9, parseInt(d, 10)));
  return (
    <span className="digit">
      <span className="rail" style={{ transform: `translateY(-${target * 10}%)` }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="cell">{i}</span>
        ))}
      </span>
    </span>
  );
}

/* ===== Header (Premium Bar, logo + LIVE sağında) ===== */
export default function Header() {
  const navigate = useNavigate();

  const [cfg, setCfg] = useState<HeaderConfig | null>(null);
  const [online, setOnline] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);

  // CMS
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch(`${API}/api/site/header`);
        const js: HeaderConfig = r.ok ? await r.json() : {};
        if (!live) return;
        setCfg(js);
        const min = toNum(js.online_min, 4800);
        const max = toNum(js.online_max, 6800);
        const hour = new Date().getHours();
        const [low, high] = calcBand(hour, min, max);
        setOnline(low + Math.floor((high - low) * 0.5));
      } catch {
        const hour = new Date().getHours();
        const [low, high] = calcBand(hour, 4800, 6800);
        setOnline(low + Math.floor((high - low) * 0.5));
      }
    })();
    return () => { live = false; };
  }, []);

  // Smooth oscillation
  useEffect(() => {
    const t = setInterval(() => {
      const hour = new Date().getHours();
      const min = toNum(cfg?.online_min, 4800);
      const max = toNum(cfg?.online_max, 6800);
      const [low, high] = calcBand(hour, min, max);
      const target = low + Math.floor(Math.random() * (high - low + 1));
      setOnline(n => {
        const diff = target - n;
        const step = Math.max(-120, Math.min(120, Math.round(diff * 0.25) + (Math.random() < 0.5 ? -2 : 2)));
        let next = Math.max(low, Math.min(high, n + step * dir));
        if (Math.abs(diff) < 20) setDir(d => (d === 1 ? -1 : 1));
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [cfg, dir]);

  return (
    <header className="hdr">
      <div className="hdr__in">
        {/* TOP BAR (Sabit yükseklik) */}
        <div className="top">
          <div className="left">
            {/* Logo -> Ana sayfa */}
            <button className="logoBtn" onClick={() => navigate("/")} title="Ana Sayfa">
              <img
                src={cfg?.logo_url || "https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png"}
                alt="Logo"
              />
            </button>

            {/* LIVE Sayaç (logo sağında) */}
            <div className="live">
              <span className="dot" />
              <span className="txt">LIVE</span>
              <AnimatedDigits value={online} />
            </div>
          </div>

          {/* Sağ Aksiyonlar */}
          <div className="actions">
            <button className="chip ghost" title="Hızlı Bonus">
              <BellIcon />
              <span>Hızlı Bonus</span>
            </button>
            <button
              className="chip primary"
              title={cfg?.login_cta_text || "Giriş"}
              onClick={() => {
                const href = (cfg?.login_cta_url || "/").trim();
                if (href) window.location.assign(href);
              }}
            >
              <LoginIcon />
              <span>{cfg?.login_cta_text || "Giriş"}</span>
            </button>
          </div>
        </div>

        {/* MENU BAR (Sabit yükseklik) */}
        <nav className="menu">
          <MenuLink to="/" icon={<HomeIcon />} label="Ana Sayfa" />
          <MenuLink to="/cark" icon={<WheelIcon />} label="Çark" />
          <MenuLink to="/turnuvalar" icon={<TrophyIcon />} label="Turnuvalar" />
          <MenuLink to="/canli-bulten" icon={<LiveIcon />} label="Canlı Bülten" />
          <MenuLink to="/deal-or-no-deal" icon={<BriefcaseIcon />} label="Deal or No Deal" />
        </nav>
      </div>

      <style>{css}</style>
    </header>
  );
}

/* ===== Menü Link ===== */
function MenuLink({ to, icon, label }: { to: string; icon: JSX.Element; label: string }) {
  return (
    <NavLink to={to} className={({isActive}) => "mItem" + (isActive ? " active" : "")}>
      <span className="ico">{icon}</span>
      <span className="lab">{label}</span>
    </NavLink>
  );
}

/* ===== SVG Ikonlar ===== */
function BellIcon(){
  return (<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2Z"/>
  </svg>);
}
function LoginIcon(){
  return (<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M10 17l5-5-5-5v3H3v4h7v3z"/><path fill="currentColor" d="M20 3h-7v2h7v14h-7v2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/>
  </svg>);
}
function HomeIcon(){
  return (<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M12 3l10 9h-3v9h-6v-6H11v6H5v-9H2l10-9z"/>
  </svg>);
}
function WheelIcon(){
  return (<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" fill="none" strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <path d="M12 3v6M21 12h-6M12 21v-6M3 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>);
}
function TrophyIcon(){
  return (<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M17 3H7v2H4a2 2 0 0 0 2 2c0 3.53 2.61 6.43 6 6.92V17H9v2h6v-2h-3v-3.08c3.39-.49 6-3.39 6-6.92a2 2 0 0 0 2-2h-3V3zM6 7a4 4 0 0 1-2-3h2v3zm14-3a4 4 0 0 1-2 3V4h2z"/>
  </svg>);
}
function LiveIcon(){
  return (<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="5" width="14" height="14" rx="2" ry="2" stroke="currentColor" fill="none" strokeWidth="2"/>
    <path d="M17 10l4-3v10l-4-3" fill="currentColor"/>
  </svg>);
}
function BriefcaseIcon(){
  return (<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M10 4h4a2 2 0 0 1 2 2v1h4v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7h4V6a2 2 0 0 1 2-2Zm0 3V6h4v1h-4Z"/>
  </svg>);
}

/* ===== Styles (Sabit yükseklikli premium bar + menu) ===== */
const css = `
:root{ --topH:72px; --menuH:48px }

/* header zemin */
.hdr{
  position:sticky; top:0; z-index:50;
  background:linear-gradient(180deg, rgba(11,18,36,.95), rgba(14,26,51,.92));
  backdrop-filter: blur(8px);
  border-bottom:1px solid rgba(255,255,255,.08);
}
/* iç konteyner */
.hdr__in{
  max-width:1200px; margin:0 auto; padding:0 16px 10px;   /* alt padding menü altına nefes */
  display:flex; flex-direction:column; gap:6px;
}

/* TOP BAR (Sabit yükseklik) */
.top{
  height:var(--topH);
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  border-bottom:1px solid rgba(255,255,255,.06);
}
.left{ display:flex; align-items:center; gap:12px; min-width:0 }
.logoBtn{
  display:inline-grid; place-items:center; background:transparent; border:none; cursor:pointer; padding:0;
  height:100%;
}
.logoBtn img{ height:32px; filter:drop-shadow(0 0 10px rgba(0,229,255,.28)); display:block }
@media (max-width:720px){ .logoBtn img{ height:28px } }

/* LIVE: logo sağında, küçük ama belirgin */
.live{ display:flex; align-items:center; gap:8px; font-weight:800; min-width:0 }
.live .dot{
  width:8px; height:8px; border-radius:999px; background:#ff2a2a;
  box-shadow:0 0 10px rgba(255,42,42,.85); animation:blink 1s infinite;
}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}
.live .txt{ color:#ff5a5a; letter-spacing:.4px; font-size:12px }
.digits{ display:inline-flex; align-items:center; gap:1px; font-weight:900; color:#fff }
.sep{ opacity:.75; margin:0 2px }
.digit{
  width:12px; height:14px; overflow:hidden; display:inline-block;
  background:rgba(255,255,255,.04); border-radius:3px;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);
}
.rail{
  display:flex; flex-direction:column;
  transition: transform .6s cubic-bezier(.2,.7,.2,1);
}
.cell{
  height:14px; line-height:14px; text-align:center; font-size:12px;
  color:#e9f6ff; text-shadow:0 0 6px rgba(0,229,255,.35);
}

.actions{ display:flex; align-items:center; gap:10px }
.chip{
  display:inline-flex; align-items:center; gap:8px; height:36px; padding:0 12px;
  border-radius:999px; border:1px solid rgba(255,255,255,.12); cursor:pointer;
  background:rgba(255,255,255,.06); color:#eaf2ff; font-weight:800;
}
.chip svg{ display:block }
.chip:hover{ filter:brightness(1.06) }
.chip.primary{
  background:linear-gradient(90deg,#00e5ff,#4aa7ff); color:#001018; border-color:#0f6d8c;
  box-shadow:0 6px 18px rgba(0,229,255,.28), inset 0 0 0 1px rgba(255,255,255,.2);
}
.chip.ghost{ background:rgba(255,255,255,.06); border-color:rgba(255,255,255,.18) }

/* MENU BAR (Sabit yükseklik) */
.menu{
  height:var(--menuH);
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  background:rgba(10,16,30,.55); border:1px solid rgba(255,255,255,.08);
  backdrop-filter:blur(6px);
  border-radius:12px; padding:6px; margin-top:6px;
}
.mItem{
  height:36px;
  display:inline-flex; align-items:center; gap:8px; padding:0 12px; border-radius:10px;
  color:#cfe3ff; text-decoration:none; border:1px solid transparent; font-weight:700;
}
.mItem .ico{ display:inline-grid; place-items:center }
.mItem:hover{ background:rgba(255,255,255,.06); color:#fff }
.mItem.active{
  color:#001018; background:linear-gradient(90deg,#00e5ff,#4aa7ff);
  border-color:#0f6d8c; box-shadow:0 0 12px rgba(0,229,255,.28) inset;
}

@media (max-width:720px){
  .live{ display:none } /* küçük ekranda sayaç gizlenir */
  .menu{ overflow:auto; white-space:nowrap }
}
`;
