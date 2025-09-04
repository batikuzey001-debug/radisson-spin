// web/src/components/EventsGrid.tsx
import { useEffect, useState } from "react";
import { getActiveEvents, type EventItem } from "../api/events";

const CAT = {
  "slots":       { brand: "#FFD700", text: "#001018" },   // altın
  "live-casino": { brand: "#ff3b6b", text: "#fff" },      // kırmızı
  "sports":      { brand: "#22c55e", text: "#001018" },   // yeşil
  "all":         { brand: "#00e5ff", text: "#001018" },   // aqua
  "other":       { brand: "#9b59b6", text: "#fff" },      // mor
};

export default function EventsGrid({ limit = 8 }: { limit?: number }) {
  const [rows, setRows] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // fetch
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getActiveEvents(limit)
      .then((arr) => alive && (setRows(arr), setErr("")))
      .catch((e) => alive && (setErr(e?.message ?? "Hata"), setRows([])))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [limit]);

  // tick countdown
  useEffect(() => {
    if (!rows.length) return;
    const t = setInterval(() => {
      setRows(prev => prev.map(ev => {
        if (ev.state === "upcoming" && ev.seconds_to_start != null) {
          return { ...ev, seconds_to_start: Math.max(0, ev.seconds_to_start - 1) };
        }
        if (ev.state === "active" && ev.seconds_left != null) {
          return { ...ev, seconds_left: Math.max(0, ev.seconds_left - 1) };
        }
        return ev;
      }));
    }, 1000);
    return () => clearInterval(t);
  }, [rows.length]);

  return (
    <section className="evSec">
      <div className="evHead">
        <h2>🎯 Etkinlikler</h2>
        {!loading && !rows.length && <span className="muted">Şu an etkinlik bulunamadı.</span>}
      </div>

      {loading && <Skeleton />}

      {!loading && rows.length > 0 && (
        <div className="grid">
          {rows.map((ev) => <EventCard key={String(ev.id)} ev={ev} />)}
        </div>
      )}

      <style>{css}</style>
    </section>
  );
}

function EventCard({ ev }: { ev: EventItem }) {
  const catKey = (ev.category || "all").toLowerCase() as keyof typeof CAT;
  const pal = CAT[catKey] || CAT["all"];
  const locked = ev.state === "upcoming";
  const t = locked ? fmt(ev.seconds_to_start ?? 0) : fmt(ev.seconds_left ?? 0);

  return (
    <article className="card" style={{ ["--brand" as any]: pal.brand, ["--brandText" as any]: pal.text }}>
      {/* Sol şerit */}
      <div className="stripe" />

      {/* Üst görsel */}
      <div className="top" style={{ backgroundImage: ev.image_url ? `url('${ev.image_url}')` : "none" }}>
        <div className="logoRow">
          <div className="iconCircle">🎟️</div>
          <div className="promoTag">ETKİNLİK</div>
        </div>
      </div>

      {/* Gövde */}
      <div className="body">
        <div className="row1">
          <span className="badge" style={{ background: pal.brand + "26", borderColor: pal.brand + "66", color: "#eaf2ff" }}>
            {(ev.category || "all").toUpperCase()}
          </span>
          <span className={`state ${locked ? "upc" : "act"}`}>{locked ? "Yakında" : "Aktif"}</span>
        </div>

        <div className="title">{ev.title}</div>

        <div className="center">
          <span className="dotGlow" />
          <div className="timer">{t.hh}:{t.mm}:{t.ss}</div>
          <div className="line" />
          <div className="date">
            {locked ? "Başlangıç: " : "Bitiş: "}
            <b>{formatDate(ev.state === "upcoming" ? ev.start_at : ev.end_at)}</b>
          </div>
        </div>
      </div>
    </article>
  );
}

function fmt(total: number) {
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return {
    hh: String(hh).padStart(2, "0"),
    mm: String(mm).padStart(2, "0"),
    ss: String(ss).padStart(2, "0"),
  };
}
function formatDate(iso?: string | null) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

/* ------- Skeleton ------- */
function Skeleton() {
  return (
    <div className="grid">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="sk">
          <div className="skTop" />
          <div className="skBar w1" />
          <div className="skBar w2" />
          <div className="skBar w3" />
        </div>
      ))}
    </div>
  );
}

/* ------- CSS ------- */
const css = `
.evSec{margin:16px 0}
.evHead{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.evHead h2{margin:0;font-size:18px;color:#eaf2ff}
.muted{color:#9fb1cc;font-size:13px}

.grid{display:grid;gap:14px;grid-template-columns:repeat(3,minmax(0,1fr))}
@media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.grid{grid-template-columns:1fr}}

.card{
  position:relative; display:flex; flex-direction:column; overflow:hidden;
  background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.08);
  border-radius:18px;
  box-shadow:0 12px 24px rgba(0,0,0,.30), inset 0 0 0 1px rgba(255,255,255,.04);
}
.stripe{
  position:absolute; left:0; top:0; bottom:0; width:12px;
  background: repeating-linear-gradient(180deg, var(--brand) 0 10px, rgba(255,255,255,.15) 10px 20px);
  box-shadow: inset -1px 0 0 rgba(255,255,255,.12);
}
.top{
  height:110px; background:#0f1a33; background-size:cover; background-position:center;
  border-bottom:1px solid rgba(255,255,255,.10);
  display:flex; align-items:center; padding-left:18px;
}
.logoRow{display:flex; align-items:center; gap:10px}
.iconCircle{
  width:38px; height:38px; border-radius:999px; display:grid; place-items:center;
  background:var(--brand); color:var(--brandText); font-size:18px; box-shadow:0 8px 18px rgba(0,0,0,.25);
}
.promoTag{color:#f2f7ff; font-weight:900; letter-spacing:.6px; text-shadow:0 2px 12px rgba(0,0,0,.45)}

.body{padding:12px 16px 14px}
.row1{ display:flex; align-items:center; justify-content:space-between }
.badge{ padding:4px 8px; border-radius:999px; border:1px solid; font-size:12px; }
.state{ font-size:12px; color:#9fb1cc }
.state.act{ color:#22c55e }
.state.upc{ color:#ffd966 }

.title{ font-weight:900; color:#eaf2ff; font-size:16px; margin:10px 0 }

.center{display:flex; flex-direction:column; align-items:flex-start}
.dotGlow{ width:8px; height:8px; border-radius:999px; background:var(--brand); box-shadow:0 0 12px var(--brand); margin-bottom:8px }
.timer{
  display:inline-block; padding:10px 14px; border-radius:12px;
  color:#eaf2ff; font-weight:1000; letter-spacing:1px; font-size:22px;
  background:rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.12);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.05), 0 10px 24px rgba(0,0,0,.25);
}
.line{ height:4px; width:180px; margin:8px 0 6px; border-radius:999px; background: linear-gradient(90deg, transparent, var(--brand), transparent); box-shadow:0 0 12px var(--brand) }
.date{ color:#9fb1cc; font-size:13px }
.date b{ color:#eaf2ff }

.sk{ border-radius:18px; overflow:hidden; border:1px solid rgba(255,255,255,.08); background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03)); padding:12px }
.skTop{height:90px; border-radius:10px; background:linear-gradient(90deg,#0f1a33,#132650,#0f1a33); animation:sh 1.2s linear infinite}
.skBar{height:12px; border-radius:6px; margin-top:10px; background:linear-gradient(90deg,#0f1a33,#132650,#0f1a33); animation:sh 1.2s linear infinite}
.w1{width:70%}.w2{width:40%}.w3{width:60%}
@keyframes sh{0%{background-position:-200px 0}100%{background-position:200px 0}}
`;
