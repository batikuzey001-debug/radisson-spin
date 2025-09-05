// web/src/components/Header.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

/* ============== Types & Config ============== */
type HeaderConfig = {
  logo_url?: string | null;
  login_cta_text?: string | null;
  login_cta_url?: string | null;
  online_min?: number | string;
  online_max?: number | string;
};

const API = import.meta.env.VITE_API_BASE_URL;

/* ================= Utils ================= */
function toNum(v: unknown, def: number) {
  if (v === null || v === undefined) return def;
  const n = typeof v === "string" ? parseInt(v, 10) : (v as number);
  return Number.isFinite(n) ? (n as number) : def;
}
function splitThousands(n: number) {
  return new Intl.NumberFormat("tr-TR").format(Math.max(0, Math.floor(n)));
}

/* ====== Animated digits (dijital saat stili; kutusuz) ====== */
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
      <span className="rail" style={{ transform: `translateY(-${target * 10}%)` }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="cell">{i}</span>
        ))}
      </span>
    </span>
  );
}

/* ================= Header ================= */
export default function Header() {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<HeaderConfig | null>(null);
  const [online, setOnline] = useState<number>(4500);

  // Config – LOGO /api/site/header
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch(`${API}/api/site/header`);
        if (!r.ok) throw new Error(String(r.status));
        const js: HeaderConfig = await r.json();
        if (!live) return;
        setCfg(js);

        const min = toNum(js.online_min, 4800);
        const max = toNum(js.online_max, 6800);
        setOnline(Math.round((min + max) / 2));
      } catch {
        /* fallback */
      }
    })();
    return () => { live = false; };
  }, []);

  // Küçük dalgalanma (5 sn)
  useEffect(() => {
    const t = setInterval(() => {
      setOnline((v) => v + Math.floor(Math.random() * 3)); // 0..2
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="hdr">
      <div className="hdr__in">
        {/* Üst bar */}
        <div className="top">
          <div className="left">
            {/* Logo (sabit yükseklik) */}
            <button className="logoBtn" onClick={() => navigate("/")} title="Ana Sayfa">
              <img
                src={
                  (cfg?.logo_url || "").trim() ||
                  "https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png"
                }
                alt="Logo"
              />
            </button>

            {/* LIVE — kırmızı; nokta kırmızı; KUTUSUZ dijital sayı */}
            <div className="liveInline" aria-label="Canlı oyuncu">
              <span className="pulseDot" />
              <span className="liveWord">LIVE</span>
              <AnimatedDigits value={online} />
            </div>
          </div>

          {/* Sağ aksiyonlar */}
          <div className="actions">
            <button className="chip ghost" title="Hızlı Bonus">
              <BellIcon />
              <span>Hızlı Bonus</span>
              <span className="notif" />
            </button>

            <button
              className="chip primary"
              title={cfg?.login_cta_text || "Giriş"}
              onClick={() => {
                const href = (cfg?.login_cta_url || "/").trim();
                if (href) window.location.assign(href);
              }}
            >
              <UserIcon />
              <span>{cfg?.login_cta_text || "Giriş"}</span>
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

/* ================= MenuLink ================= */
function MenuLink({ to, icon, label }: { to: string; icon: JSX.Element; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => "mItem" + (isActive ? " active" : "")}>
      <span className="ico">{icon}</span>
      <span className="txt">{label}</span>
    </NavLink>
  );
}

/* ================= Icons ================= */
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
function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M4 22a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

/* ================= Styles ================= */
const css = `
.hdr{ position:sticky; top:0; z-index:30; background:transparent }
.hdr__in{ padding: 10px 14px 0 }

/* Üst bar */
.top{
  height:var(--topH, 52px);
  display:flex; align-items:center; justify-content:space-between;
}
.left{ display:flex; align-items:center; gap:14px }

/* Logo */
.logoBtn{ display:inline-grid; place-items:center; background:transparent; border:none; cursor:pointer; padding:0 }
.logoBtn img{ height:30px; width:auto; display:block; object-fit:contain; flex:0 0 auto }

/* LIVE — inline, çerçevesiz */
.liveInline{
  display:flex; align-items:center; gap:10px;
}
.pulseDot{
  width:10px; height:10px; border-radius:50%;
  background:#ff2a2a; box-shadow:0 0 10px rgba(255,42,42,.9), 0 0 18px rgba(255,42,42,.65);
  position:relative;
}
.pulseDot::after{
  content:""; position:absolute; inset:-6px; border-radius:50%;
  border:2px solid rgba(255,42,42,.35); animation:pulse 1.6s infinite;
}
.liveWord{
  color:#ff4d4d; font-weight:900; letter-spacing:1.4px; text-transform:uppercase;
  text-shadow:0 0 8px rgba(255,42,42,.35);
  font-size:12px;
}

/* Dijital sayı — kutusuz */
.digits{ display:inline-flex; gap:1px; font-weight:900; color:#ffffff; font-size:14px; letter-spacing:.4px; text-shadow:0 0 10px rgba(0,229,255,.25) }
.sep{ margin:0 2px; opacity:.75 }
.digit{ width:12px; height:16px; overflow:hidden; display:inline-block }
.rail{ display:flex; flex-direction:column; transition: transform .55s cubic-bezier(.18,.7,.2,1) }
.cell{ height:16px; line-height:16px; text-align:center; font-size:12px; color:#e9f6ff }

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
