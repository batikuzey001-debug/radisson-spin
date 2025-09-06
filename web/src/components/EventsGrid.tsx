// web/src/components/EventsGrid.tsx
import { useEffect, useMemo, useState } from "react";

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
  prize_amount?: number | null;
};

const API = import.meta.env.VITE_API_BASE_URL;

const fmtTL = (n: number) =>
  new Intl.NumberFormat("tr-TR").format(Math.max(0, Math.floor(n))) + " ₺";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso || ""; }
};

export default function EventsGrid() {
  const [items, setItems] = useState<EventCard[]>([]);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);

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
    const t = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, [items.length]);

  const rows = useMemo(() => items, [items, tick]);

  return (
    <section className="evWrap">
      <div className="evHead">
        <h2><span className="tag">⚽</span> Etkinlikler</h2>
        <div className="headGlow" aria-hidden />
        {err && !rows.length && <span className="muted">{err}</span>}
        {!err && !rows.length && <span className="muted">Şu an gösterilecek etkinlik yok.</span>}
      </div>

      {rows.length > 0 && (
        <div className="evList">
          {rows.map(ev => {
            const isUpcoming = ev.state === "upcoming";
            const sLeft = Math.max(0, Math.floor(ev.seconds_to_start ?? 0));
            const counterClass = isUpcoming
              ? (sLeft < 3600 ? "red" : "yellow")
              : "on";

            const display = isUpcoming && sLeft > 0
              ? fmtT(sLeft)
              : (ev.prize_amount ? fmtTL(ev.prize_amount) : "AKTİF");

            const meta = isUpcoming
              ? (sLeft > 0 ? `Başlamasına: ${fmtT(sLeft)}` : `Başlangıç: ${fmtDate(ev.start_at)}`)
              : (ev.end_at ? `Bitiş: ${fmtDate(ev.end_at)}` : "");

            return (
              <article key={ev.id} className="evCard">
                <span className="stripe" aria-hidden />
                <header className="evMedia" style={{ ["--img" as any]: `url('${ev.image_url || ""}')` }} />
                <div className="evBody">
                  <h3 className="evTitle" title={ev.title}>{ev.title}</h3>
                  <div className="evTimer">
                    <div className={`evBadge ${counterClass}`} aria-live="polite">{display}</div>
                  </div>
                  <div className="evScan" />
                  {meta && <div className="evMeta">{meta}</div>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <style>{css}</style>
    </section>
  );
}

/* Helpers */
function fmtT(total: number) {
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
}
function pad2(n: number) { return String(n).padStart(2, "0"); }

/* CSS */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@700;800;900&family=Rajdhani:wght@700;800;900&display=swap');

:root{
  --radius:18px; --txt:#eaf2ff; --muted:#9fb3d9;
  --bg1:#0f162b; --bg2:#0a1224;
  --g1:#23e06c; --g2:#14c15a;
}

.evWrap{ margin:16px 0 }

/* Başlık */
.evHead{position:relative; display:flex; align-items:center; gap:12px; margin-bottom:12px}
.evHead h2{margin:0; font-size:20px; color:#eaf2ff; font-weight:900; display:flex; align-items:center; gap:8px;}
.evHead .tag{display:inline-grid; place-items:center; width:26px; height:26px; border-radius:8px;
  background:linear-gradient(180deg, rgba(35,224,108,.25), rgba(20,193,90,.15));
  box-shadow:0 0 18px rgba(35,224,108,.35)}
.evHead .headGlow{position:absolute; left:0; right:0; bottom:-6px; height:2px; border-radius:2px;
  background:linear-gradient(90deg, transparent, rgba(35,224,108,.85), transparent);
  box-shadow:0 0 18px rgba(35,224,108,.55);}
.muted{color:#9fb1cc;font-size:13px}

/* Liste */
.evList{display:flex; flex-wrap:wrap; gap:16px 16px; justify-content:flex-start; align-content:flex-start;
  font-family:Inter,system-ui,sans-serif}

/* Kart */
.evCard{width:240px; border-radius:var(--radius); overflow:hidden;
  background:linear-gradient(180deg,var(--bg1),var(--bg2));
  border:1px solid rgba(255,255,255,.10);
  box-shadow:0 12px 28px rgba(0,0,0,.45);
  display:flex; flex-direction:column; position:relative; isolation:isolate;
  transition:transform .22s ease, box-shadow .22s ease}
.evCard:hover{transform:translateY(-4px); box-shadow:0 18px 38px rgba(0,0,0,.6); border-color:rgba(255,255,255,.16)}

/* Sol şerit yeşil-beyaz akış */
.evCard .stripe{position:absolute; left:0; top:0; bottom:0; width:7px; border-radius:8px 0 0 8px; z-index:999;
  background:linear-gradient(180deg,var(--g1),var(--g2));
  box-shadow:0 0 20px var(--g1), 0 0 44px var(--g2), 0 0 70px var(--g1)}
.evCard .stripe::after{content:""; position:absolute; left:0; top:-8%; width:7px; height:116%; border-radius:8px; z-index:1000;
  background-image:repeating-linear-gradient(180deg, rgba(255,255,255,.95) 0 6px, rgba(255,255,255,0) 6px 18px),
                   linear-gradient(180deg, var(--g1), var(--g2));
  background-blend-mode:screen; animation:evSlide 1.35s linear infinite}
@keyframes evSlide{from{transform:translateY(0)}to{transform:translateY(18px)}}

/* Media */
.evMedia{position:relative; height:120px; overflow:hidden; background:#0d1428}
.evMedia::before{content:""; position:absolute; inset:0; background-image:var(--img);
  background-size:cover; background-position:center; filter:saturate(1.05) contrast(1.05)}
.evMedia::after{content:""; position:absolute; inset:0; background:linear-gradient(180deg,transparent 55%,rgba(10,15,28,.85))}

/* Body */
.evBody{padding:10px 12px 12px; text-align:center}
.evTitle{margin:0 0 6px; color:var(--txt); font-weight:900; font-size:15px}

/* Sayaç/ödül badge */
.evTimer{margin:2px 0 6px}
.evBadge{font-family:Rajdhani,sans-serif; font-weight:900; font-size:26px; letter-spacing:1.2px; color:#f2f7ff;
  display:inline-block; padding:10px 12px; border-radius:12px; min-width:140px;
  background:linear-gradient(180deg,#0f1730,#0d1428); border:1px solid #202840}
.evBadge.on{ text-shadow:0 0 14px rgba(35,224,108,.45)}
.evBadge.yellow{color:#fff3c2; text-shadow:0 0 12px #ffda6b,0 0 22px #ffb300}
.evBadge.red{color:#ffdada; text-shadow:0 0 14px #ff5c5c,0 0 28px #ff2e2e; animation:redPulse 1.4s ease-in-out infinite}
@keyframes redPulse{0%,100%{opacity:1}50%{opacity:.55}}

/* Tarama çizgisi */
.evScan{height:3px; margin:8px auto 8px; width:150px; border-radius:999px; opacity:.98;
  background-image:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.95) 12%,rgba(255,255,255,0) 24%),
                   linear-gradient(90deg,var(--g1),var(--g2));
  background-size:140px 100%,100% 100%; background-repeat:repeat,no-repeat;
  animation:scanX 1.2s linear infinite; box-shadow:0 0 14px var(--g1),0 0 26px var(--g2)}
@keyframes scanX{from{background-position:-40px 0,0 0}to{background-position:140px 0,0 0}}

/* Meta */
.evMeta{margin:2px 0 0; color:#cfe0ff; font-size:12.5px; opacity:.95}

/* Responsive */
@media (max-width:900px){.evCard{width:46%}}
@media (max-width:560px){.evCard{width:100%;max-width:340px}}
`;
