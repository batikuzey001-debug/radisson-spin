// web/src/components/Header.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

/* ================== Types & Config ================== */
type HeaderConfig = {
  logo_url?: string | null;
  live_base?: number; // opsiyonel: backend canlı başlangıç değeri
};

const API = import.meta.env.VITE_API_BASE_URL;

/* ================== Utils ================== */
function toNum(v: unknown, def: number) {
  if (v === null || v === undefined) return def;
  const n = typeof v === "string" ? parseInt(v, 10) : (v as number);
  return Number.isFinite(n) ? (n as number) : def;
}
function splitThousands(n: number) {
  return new Intl.NumberFormat("tr-TR").format(Math.max(0, Math.floor(n)));
}

/* ================== Animated digits (tek sayı gösterimi) ================== */
function AnimatedDigits({ value }: { value: number }) {
  const str = useMemo(() => splitThousands(value), [value]);
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
    <span className="digit" aria-hidden>
      <span
        className="rail"
        style={{ transform: `translateY(-${target * 10}%)` }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="cell">{i}</span>
        ))}
      </span>
    </span>
  );
}

/* ================== Header ================== */
export default function Header() {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<HeaderConfig | null>(null);
  const [online, setOnline] = useState<number>(4271);

  /* --- Config yükle (bozulursa fallback) --- */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/api/site`);
        if (r.ok) {
          const js = await r.json();
          setCfg({
            logo_url: js?.logo_url ?? js?.header_logo ?? null,
            live_base: toNum(js?.live_base, online),
          });
          if (toNum(js?.live_base, -1) > 0) setOnline(toNum(js?.live_base, online));
        }
      } catch {
        /* sessiz fallback */
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- Küçük dalgalanma: her 5sn ±(0..3) artış; gece saatlerinde daha sakin --- */
  useEffect(() => {
    const t = setInterval(() => {
      const hour = new Date().getHours();
      const maxJitter = hour >= 1 && hour <= 7 ? 1 : 3;
      const inc = Math.floor(Math.random() * (maxJitter + 1)); // 0..maxJitter
      setOnline(v => v + inc);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="hdr">
      <div className="hdr__in">
        {/* Üst bar */}
        <div className="top">
          <div className="left">
            {/* Logo */}
            <button className="logoBtn" onClick={() => navigate("/")} title="Ana Sayfa">
              <img
                src={
                  cfg?.logo_url ||
                  "https://dummyimage.com/120x30/0ea5e9/ffffff&text=SPORTOTO"
                }
                alt="Logo"
              />
            </button>

            {/* LIVE — tek sayı (DUPLICATE YOK) */}
            <div className="livePill" aria-label="Canlı kullanıcı">
              <span className="pulseDot" />
              <span className="liveWord">
                <LiveIcon />
                LIVE
              </span>
              <AnimatedDigits value={online} />
            </div>
          </div>

          {/* Sağ aksiyonlar */}
          <div className="actions">
            <button className="chip ghost" title="Bildirimler">
              <BellIcon />
              <span className="notif" />
            </button>
            <button className="chip ghost" title="Yardım">
              <HelpIcon />
            </button>
            <button className="chip primary" title="Giriş / Üye Ol">
              <UserIcon />
              Giriş Yap
            </button>
          </div>
        </div>

        {/* Menü */}
        <nav className="menu">
          <MenuLink to="/" icon={<HomeIcon />} label="Ana Sayfa" />
          <MenuLink to="/cark" icon={<WheelIcon />} label="Çark" />
          <MenuLink to="/turnuvalar" icon={<TrophyIcon />} label="Turnuvalar" />
          <MenuLink to="/etkinlikler" icon={<TicketIcon />} label="Etkinlikler" />
          <MenuLink to="/promos" icon={<GiftIcon />} label="Promosyonlar" />
        </nav>
      </div>

      <style>{css}</style>
    </header>
  );
}

/* ================== MenuLink ================== */
function MenuLink({ to, icon, label }: { to: string; icon: JSX.Element; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => "mItem" + (isActive ? " active" : "")}>
      <span className="ico">{icon}</span>
      <span className="txt">{label}</span>
    </NavLink>
  );
}

/* ================== Icon Set (temiz, premium) ================== */
function LiveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 12a9 9 0 0 1 18 0" stroke="currentColor" strokeOpacity=".75" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M3 11.5 12 4l9 7.5V20a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2v-8.5Z" fill="currentColor"/>
    </svg>
  );
}
function WheelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
      <path d="M12 3v6M21 12h-6M12 21v-6M3 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function TrophyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M5 4h14v2a5 5 0 0 1-5 5H10A5 5 0 0 1 5 6V4Z" fill="currentColor"/>
      <path d="M7 20h10M9 20v-3h6v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M5 6H3a4 4 0 0 0 4 4M19 6h2a4 4 0 0 1-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function TicketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 2-2V8Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M9 7v10" stroke="currentColor" strokeWidth="2" strokeDasharray="2 3" />
    </svg>
  );
}
function GiftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M3 11h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M12 11v11M3 7h18v4H3z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M12 7c-2 0-3-1-3-2s1-2 3-2 3 1 3 2-1 2-3 2Z" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path d="M6 8a6 6 0 0 1 12 0v5l2 3H4l2-3V8Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M9 19a3 3 0 0 0 6 0" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}
function HelpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.9.4-1.4 1-1.4 1.7V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1" fill="currentColor"/>
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M4 22a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

/* ================== Styles ================== */
const css = `
.hdr{ position:sticky; top:0; z-index:30; background:transparent }
.hdr__in{
  backdrop-filter: saturate(1.1);
  padding: 10px 14px 0;
}

/* Üst bar */
.top{
  height:var(--topH, 52px);
  display:flex; align-items:center; justify-content:space-between;
}
.left{ display:flex; align-items:center; gap:14px }

.logoBtn{ display:inline-grid; place-items:center; background:transparent; border:none; cursor:pointer; padding:0 }
.logoBtn img{ height:30px; display:block; filter:drop-shadow(0 0 10px rgba(0,229,255,.3)) }

/* === LIVE PILL (tek sayı) === */
.livePill{
  display:flex; align-items:center; gap:10px;
  padding: 6px 10px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255,46,68,.15), rgba(255,46,68,.06));
  outline: 1px solid rgba(255,46,68,.28);
  box-shadow: 0 6px 16px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.04);
}
.pulseDot{
  width:10px; height:10px; border-radius:50%;
  background:#ff2a2a;
  box-shadow:0 0 10px rgba(255,42,42,.9), 0 0 18px rgba(255,42,42,.65);
  position:relative;
}
.pulseDot::after{
  content:""; position:absolute; inset:-6px; border-radius:50%;
  border:2px solid rgba(255,42,42,.35); animation:pulse 1.6s infinite;
}
.liveWord{
  display:flex; align-items:center; gap:6px;
  color:#ff4d4d; font-weight:900; letter-spacing:1.4px; text-transform:uppercase;
  text-shadow:0 0 8px rgba(255,42,42,.35);
  font-size:12px;
}
.digits{
  font-weight:900; color:#ffffff; font-size:14px; letter-spacing:.4px;
  text-shadow:0 0 10px rgba(0,229,255,.25);
  display:inline-flex; gap:1px;
}
.sep{ margin:0 2px; opacity:.75 }
.digit{
  width:12px; height:16px; overflow:hidden; display:inline-block;
  background:rgba(255,255,255,.06); border-radius:3px;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);
}
.rail{
  display:flex; flex-direction:column;
  transition: transform .55s cubic-bezier(.18,.7,.2,1);
}
.cell{
  height:16px; line-height:16px; text-align:center; font-size:12px;
  color:#e9f6ff; text-shadow:0 0 6px rgba(0,229,255,.35);
}

/* Sağ aksiyonlar */
.actions{ display:flex; gap:10px }
.chip{
  display:flex; align-items:center; gap:6px;
  height:30px; padding:0 10px; border-radius:8px;
  font-size:12px; font-weight:800; letter-spacing:.2px;
  color:#cfe3ff; background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.08);
}
.chip svg{ width:14px; height:14px }
.chip:hover{ filter:brightness(1.06) }
.chip.ghost{ position:relative }
.chip.ghost .notif{
  position:absolute; top:4px; right:4px; width:8px; height:8px; border-radius:50%;
  background:#ff4d6d; box-shadow:0 0 8px rgba(255,77,109,.6);
}
.chip.primary{
  background:linear-gradient(90deg,#00e5ff,#4aa7ff); color:#001018; border-color:#0f6d8c;
  box-shadow:0 4px 12px rgba(0,229,255,.28);
}

/* Menü */
.menu{
  height:var(--menuH, 44px);
  display:flex; align-items:center; gap:8px;
  padding: 6px 0 10px;
}
.mItem{
  display:inline-flex; align-items:center; gap:8px;
  height:34px; padding:0 12px; border-radius:10px;
  background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.06);
  font-size:13px; font-weight:700; color:#cfe3ff; text-decoration:none;
}
.mItem .ico{ display:grid; place-items:center }
.mItem.active{ background:linear-gradient(90deg,#00e5ff,#4aa7ff); color:#001018; }

@keyframes pulse {
  0% { transform: scale(0.8); opacity:.7 }
  70% { transform: scale(1.25); opacity:0 }
  100% { transform: scale(1.25); opacity:0 }
}
`;
