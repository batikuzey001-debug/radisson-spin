// web/src/components/EventsGrid.tsx
import { useEffect, useMemo, useState } from "react";

/** API veri tipi (events/active) – prize_amount dahil */
type EventCard = {
  id: number | string;
  title: string;
  image_url: string;
  category?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  state: "active" | "upcoming";
  seconds_left?: number | null;
  seconds_to_start?: number | null;
  accent_color?: string | null;
  bg_color?: string | null;
  priority?: number | null;
  is_pinned?: boolean;
  prize_amount?: number | null;
};

const API = import.meta.env.VITE_API_BASE_URL;

/* --- Kategori -> renk/etiket eşleşmesi --- */
const CAT: Record<string, { theme: "theme-emerald" | "theme-red" | "theme-gold" | "theme-aqua" | "theme-purple"; label: string }> = {
  "sports":      { theme: "theme-emerald", label: "SPOR" },
  "live-casino": { theme: "theme-red",     label: "CANLI" },
  "slots":       { theme: "theme-gold",    label: "SLOT" },
  "all":         { theme: "theme-aqua",    label: "HEPSİ" },
  "other":       { theme: "theme-purple",  label: "ÖZEL" },
};

function themeOf(ev: EventCard) {
  const key = (ev.category || "other").toLowerCase();
  const m = CAT[key] || CAT["other"];
  return m;
}

/* Basit tarih yazımı */
function fmtDate(dt?: string | null) {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    return d.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch { return dt || ""; }
}

/* TL */
const fmtTL = (n: number) =>
  new Intl.NumberFormat("tr-TR").format(Math.max(0, Math.floor(n))) + " ₺";

/* Saniyeyi HH:MM:SS */
const fmtHHMMSS = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  const hh = Math.floor(t / 3600);
  const mm = Math.floor((t % 3600) / 60);
  const ss = t % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
};

export default function EventsGrid() {
  const [items, setItems] = useState<EventCard[]>([]);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0); // WHY: sayaç yazısını her saniye güncelle

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch(`${API}/api/events/active?limit=12&include_future=1`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const js = (await r.json()) as EventCard[];
        if (live) setItems(Array.isArray(js) ? js : []);
        setErr("");
      } catch (e: any) {
        setErr(e?.message || "Etkinlikler yüklenemedi");
        if (live) setItems([]);
      }
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [items.length]);

  const rows = useMemo(() => items, [items, tick]); // WHY: saniyelik re-render

  if (err && !rows.length) {
    return (
      <div className="eventsWrap">
        <div className="msg">{err}</div>
        <style>{css}</style>
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="eventsWrap">
        <div className="msg muted">Şu an listelenecek etkinlik yok.</div>
        <style>{css}</style>
      </div>
    );
  }

  return (
    <section className="eventsWrap" aria-label="Etkinlikler">
      <div className="ec-wrap">
        {rows.map((ev) => {
          const { theme, label: catLabel } = themeOf(ev);

          // Rozet ve alt satır
          const isLive = ev.state === "active" && (ev.seconds_left ?? 1) > 0;
          const chipText = isLive ? "AKTİF" : "BEKLEMEDE";

          let subTxt = "";
          if (!isLive) {
            if (ev.seconds_to_start != null && ev.seconds_to_start > 0) {
              subTxt = `Başlamasına: ${fmtHHMMSS(ev.seconds_to_start)}`;
            } else if (ev.start_at) {
              subTxt = `Başlangıç: ${fmtDate(ev.start_at)}`;
            }
          }

          const amountText = typeof ev.prize_amount === "number" ? fmtTL(ev.prize_amount) : null;

          return (
            <article key={ev.id} className={`ec-card ${theme}`}>
              {/* Sol neon şerit */}
              <span className="ec-led" aria-hidden />

              {/* Üst görsel */}
              <div className="ec-media">
                <span className="ec-topneon" />
                {ev.image_url ? <img src={ev.image_url} alt="" /> : <div style={{height:"100%"}} />}
                {/* TV rozeti */}
                <span className="ec-chip" style={{ color: isLive ? "#22d35a" : "#f59e0b" }}>
                  <span className="dot" />{chipText}
                </span>
                {/* Ribbon */}
                <span className="ec-ribbon">{catLabel}</span>
              </div>

              {/* Body */}
              <div className="ec-body">
                <h3 className="ec-title" title={ev.title}>{ev.title}</h3>
                {/* Ödül */}
                {amountText && <div className="ec-prize" title={amountText}>{amountText}</div>}
                {/* Alt bilgi */}
                {subTxt && <p className="ec-desc">{subTxt}</p>}
                {/* Büyük CTA (bağlantı yoksa buton gibi davranır) */}
                <a
                  className="ec-cta"
                  href="#"
                  onClick={(e)=>e.preventDefault()}
                  role="button"
                >
                  Katıl
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <style>{css}</style>
    </section>
  );
}

/* ===================== CSS (ec- tasarım, SOL HİZALI) ===================== */
const css = `
:root{ --txt:#f0f4ff; --bg1:#0f162b; --bg2:#0a1224;
  --red-1:#ff3b3b; --red-2:#ff6b6b;
  --gold-1:#f7c948; --gold-2:#f59e0b;
  --emer-1:#34d399; --emer-2:#10b981;
  --purp-1:#c084fc; --purp-2:#a855f7;
  --aqua-1:#06d6ff; --aqua-2:#118ab2;
}

/* KAPSAYICI */
.eventsWrap{ margin:18px 0 }
.msg{ padding:16px; border:1px solid rgba(255,255,255,.10); border-radius:12px; background:rgba(255,255,255,.03); color:#eaf2ff }
.msg.muted{ color:#9fb1cc }

/* SOL HİZALI GRID (flex-wrap) */
.ec-wrap{
  display:flex; flex-wrap:wrap; gap:20px;
  justify-content:flex-start; align-content:flex-start;
  font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
}

/* Kart */
.ec-card{
  width:300px;border-radius:18px;overflow:hidden;position:relative;
  background:linear-gradient(180deg,var(--bg1),var(--bg2));
  box-shadow:0 12px 28px rgba(0,0,0,.45);
  transition:transform .22s ease, box-shadow .22s ease
}
.ec-card:hover{transform:translateY(-4px);box-shadow:0 18px 38px rgba(0,0,0,.65),0 0 24px var(--t1)}

.theme-red    { --t1:var(--red-1);  --t2:var(--red-2); }
.theme-gold   { --t1:var(--gold-1); --t2:var(--gold-2); }
.theme-emerald{ --t1:var(--emer-1); --t2:var(--emer-2); }
.theme-purple { --t1:var(--purp-1); --t2:var(--purp-2); }
.theme-aqua   { --t1:var(--aqua-1); --t2:var(--aqua-2); }

/* Sol neon şerit */
.ec-led{position:absolute;left:0;top:0;bottom:0;width:8px;z-index:6;
  background:linear-gradient(180deg,var(--t1),var(--t2));
  box-shadow:0 0 22px var(--t1),0 0 44px var(--t2);
  animation:ec-pulse 1.4s infinite alternate}
@keyframes ec-pulse{from{opacity:.75;box-shadow:0 0 14px var(--t1)}to{opacity:1;box-shadow:0 0 32px var(--t2)}}

/* Üst görsel */
.ec-media{position:relative;aspect-ratio:16/9;background:#0d1428;overflow:hidden}
.ec-media img{width:100%;height:100%;object-fit:cover;display:block;position:relative;z-index:1}
.ec-media::after{content:"";position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,transparent 55%,rgba(10,15,28,.85))}
.ec-topneon{position:absolute;z-index:3;left:-40%;top:0;height:6px;width:180%;
  background:linear-gradient(90deg,var(--t1),var(--t2),var(--t1));
  box-shadow:0 0 18px var(--t1),0 0 36px var(--t2);
  animation:ec-bar-move 4s linear infinite}
@keyframes ec-bar-move{from{transform:translateX(0)}to{transform:translateX(-25%)}}

/* Durum chip */
.ec-chip{position:absolute;left:12px;top:12px;z-index:5;
  padding:7px 11px;border-radius:12px;background:#0b1120cc;backdrop-filter:blur(4px);
  font-weight:900;font-size:11px;text-transform:uppercase;color:#22d35a;border:1px solid rgba(255,255,255,.14);
  display:inline-flex;gap:6px;align-items:center}
.ec-chip .dot{width:10px;height:10px;border-radius:50%;background:currentColor;box-shadow:0 0 10px currentColor}

/* Ribbon */
.ec-ribbon{position:absolute;right:-44px;top:14px;transform:rotate(45deg);
  width:150px;padding:5px 0;text-align:center;z-index:5;
  color:#0b0d13;font-weight:900;font-size:12px;text-transform:uppercase;
  background:linear-gradient(90deg,var(--t1),var(--t2));
  box-shadow:0 0 20px var(--t1),0 0 40px var(--t2)}

/* Body */
.ec-body{padding:12px 14px 16px;color:var(--txt);text-align:center}
.ec-title{margin:2px 0 8px;font-weight:800;font-size:16px}

/* Ödül — yanıp sönen glow */
.ec-prize{
  margin:6px 0 8px;font-family:Rajdhani,system-ui;font-weight:900;font-size:28px;
  background:linear-gradient(90deg,var(--t1),var(--t2));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  animation:glowPulse 1.6s infinite alternate
}
@keyframes glowPulse{from{text-shadow:0 0 14px var(--t1)}to{text-shadow:0 0 30px var(--t2)}}

/* Alt bilgi */
.ec-desc{margin:0 auto 10px;max-width:90%;color:#cfe0ff;font-size:13.5px;line-height:1.4}

/* Büyük CTA */
.ec-cta{
  display:block;width:100%;margin-top:6px;padding:14px 0;border-radius:14px;
  font-weight:900;font-size:15px;text-transform:uppercase;color:#0b0d13;text-decoration:none;
  background:linear-gradient(90deg,var(--t1),var(--t2));
  box-shadow:0 0 20px var(--t1),0 0 40px var(--t2)
}

/* Responsive */
@media (max-width:900px){.ec-card{width:46%}}
@media (max-width:560px){.ec-card{width:100%;max-width:360px}}
`;
