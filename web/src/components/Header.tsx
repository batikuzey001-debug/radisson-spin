// web/src/components/Header.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

/* === Canlı oyuncu sayaç bandı (küçük dalgalanma) === */
function calcBand(hour: number, min: number, max: number){
  const span = Math.max(0, max - min);
  if (hour >= 3 && hour < 6)  return [min, min + Math.max(10, Math.round(span*0.15))];
  if (hour >= 6 && hour < 15) return [min + Math.round(span*0.2), min + Math.round(span*0.55)];
  if (hour >= 15 && hour < 22) return [min + Math.round(span*0.7), max - Math.round(span*0.1)];
  return [max - Math.round(span*0.15), max];
}
function splitThousands(n: number){
  const s = String(Math.max(0, Math.floor(n)));
  const rev = s.split("").reverse();
  const out: string[] = [];
  for(let i=0;i<rev.length;i++){ if(i>0 && i%3===0) out.push("."); out.push(rev[i]); }
  return out.reverse().join("");
}

export default function Header() {
  const navigate = useNavigate();

  // Sayaç (demo): 4800-6800 arası saat dilimine göre dalgalanma
  const [online, setOnline] = useState(0);
  const [dir, setDir] = useState<1|-1>(1);

  useEffect(() => {
    const hour = new Date().getHours();
    const [low, high] = calcBand(hour, 4800, 6800);
    setOnline(low + Math.floor((high - low) * 0.5));
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const hour = new Date().getHours();
      const [low, high] = calcBand(hour, 4800, 6800);
      const target = low + Math.floor(Math.random()*(high-low+1));
      setOnline(n => {
        const diff = target - n;
        const step = Math.max(-120, Math.min(120, Math.round(diff*0.25) + (Math.random()<0.5?-2:2)));
        let next = Math.max(low, Math.min(high, n + step*dir));
        if (Math.abs(diff) < 20) setDir(d => d===1?-1:1);
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [dir]);

  return (
    <header className="hdr">
      <div className="hdr__in">
        {/* ÜST SATIR */}
        <div className="top">
          {/* Sol: Logo */}
          <button className="logoBtn" onClick={() => navigate("/")}>
            <img
              src="https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png"
              alt="Logo"
            />
          </button>

          {/* Orta: LIVE sayaç */}
          <div className="live">
            <span className="dot" />
            <span className="txt">LIVE</span>
            <span className="count">{splitThousands(online)}</span>
          </div>

          {/* Sağ: Hızlı Bonus + Giriş */}
          <div className="actions">
            <button className="chip ghost" title="Hızlı Bonus">
              <BellIcon />
              <span>Hızlı Bonus</span>
            </button>
            <button className="chip primary" title="Giriş" onClick={() => window.location.assign("/")}>
              <LoginIcon />
              <span>Giriş</span>
            </button>
          </div>
        </div>

        {/* ALT SATIR – MENÜ */}
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

/* === Menü Link === */
function MenuLink({ to, icon, label }: { to: string; icon: JSX.Element; label: string }) {
  return (
    <NavLink to={to} className={({isActive}) => "mItem" + (isActive ? " active" : "")}>
      <span className="ico">{icon}</span>
      <span className="lab">{label}</span>
    </NavLink>
  );
}

/* === SVG Ikonlar === */
function BellIcon(){
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2Z"/>
    </svg>
  );
}
function LoginIcon(){
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M10 17l5-5-5-5v3H3v4h7v3z"/>
      <path fill="currentColor" d="M20 3h-7v2h7v14h-7v2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/>
    </svg>
  );
}
function HomeIcon(){
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 3l10 9h-3v9h-6v-6H11v6H5v-9H2l10-9z"/>
    </svg>
  );
}
function WheelIcon(){
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" fill="none" strokeWidth="2"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
      <path d="M12 3v6M21 12h-6M12 21v-6M3 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function TrophyIcon(){
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M17 3H7v2H4a2 2 0 0 0 2 2c0 3.53 2.61 6.43 6 6.92V17H9v2h6v-2h-3v-3.08c3.39-.49 6-3.39 6-6.92a2 2 0 0 0 2-2h-3V3zM6 7a4 4 0 0 1-2-3h2v3zm14-3a4 4 0 0 1-2 3V4h2z"/>
    </svg>
  );
}
function LiveIcon(){
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="14" height="14" rx="2" ry="2" stroke="currentColor" fill="none" strokeWidth="2"/>
      <path d="M17 10l4-3v10l-4-3" fill="currentColor"/>
    </svg>
  );
}
function BriefcaseIcon(){
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M10 4h4a2 2 0 0 1 2 2v1h4v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7h4V6a2 2 0 0 1 2-2Zm0 3V6h4v1h-4Z"/>
    </svg>
  );
}

/* === Stil === */
const css = `
.hdr{
  position:sticky; top:0; z-index:50;
  background:linear-gradient(180deg, rgba(11,18,36,.95), rgba(14,26,51,.92));
  backdrop-filter: blur(8px);
  border-bottom:1px solid rgba(255,255,255,.08);
}
.hdr__in{
  max-width:1200px; margin:0 auto; padding:10px 16px;
  display:flex; flex-direction:column; gap:8px;
}

/* ÜST BAR */
.top{
  display:flex; align-items:center; justify-content:space-between; gap:12px;
}
.logoBtn{
  display:inline-grid; place-items:center; background:transparent; border:none; cursor:pointer; padding:0;
}
.logoBtn img{ height:34px; filter:drop-shadow(0 0 10px rgba(0,229,255,.28)) }
@media (max-width:720px){ .logoBtn img{ height:30px } }

.live{
  display:flex; align-items:center; gap:8px; font-weight:800;
}
.live .dot{
  width:8px; height:8px; border-radius:999px; background:#ff2a2a;
  box-shadow:0 0 10px rgba(255,42,42,.85); animation:blink 1s infinite;
}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}
.live .txt{ color:#ff5a5a; letter-spacing:.4px; font-size:12px }
.live .count{
  color:#fff; font-size:14px; letter-spacing:.4px;
  font-family:"DS-Digital", "Orbitron", ui-monospace, Menlo, monospace;
  text-shadow:0 0 10px rgba(0,229,255,.25);
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
.chip.ghost{
  background:rgba(255,255,255,.06); border-color:rgba(255,255,255,.18);
}

/* ALT MENÜ (header içinde) */
.menu{
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  background:rgba(10,16,30,.55); border:1px solid rgba(255,255,255,.08);
  backdrop-filter:blur(6px);
  border-radius:12px; padding:6px;
}
.mItem{
  display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:10px;
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
