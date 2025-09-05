import { useEffect, useState } from "react";

/** API veri tipi (events/active) – prize_amount eklendi */
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
  prize_amount?: number | null;      // <— YENİ
};

const API = import.meta.env.VITE_API_BASE_URL;

/* --- Kategori -> renk eşleşmesi (hue) --- */
const CAT: Record<string, { hue: number; label: string }> = {
  "sports": { hue: 150, label: "SPOR" },
  "live-casino": { hue: 10, label: "CANLI" },
  "slots": { hue: 48, label: "SLOT" },
  "all": { hue: 190, label: "HEPSİ" },
  "other": { hue: 280, label: "ÖZEL" },
};

function colorOf(ev: EventCard) {
  const key = (ev.category || "other").toLowerCase();
  const m = CAT[key] || CAT["other"];
  const hue = ev.accent_color ? tryHue(ev.accent_color, m.hue) : m.hue;
  return { hue, catLabel: m.label };
}
function tryHue(val: string, fallback: number) {
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val)) return fallback;
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? (n % 360) : fallback;
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
  } catch {
    return dt || "";
  }
}

/* Tutar gösterimi */
const fmtTL = (n: number) =>
  new Intl.NumberFormat("tr-TR").format(Math.max(0, Math.floor(n))) + " ₺";

export default function EventsGrid() {
  const [items, setItems] = useState<EventCard[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch(`${API}/api/events/active?limit=12&include_future=1`);
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

  if (err && !items.length) {
    return (
      <div className="eventsWrap">
        <div className="msg">{err}</div>
        <style>{css}</style>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="eventsWrap">
        <div className="msg muted">Şu an listelenecek etkinlik yok.</div>
        <style>{css}</style>
      </div>
    );
  }

  return (
    <section className="eventsWrap" aria-label="Etkinlikler">
      <div className="grid">
        {items.map((ev) => {
          const { hue, catLabel } = colorOf(ev);
          const stateLab = ev.state === "active" ? "AKTİF" : "YAKINDA";
          const subTxt =
            ev.state === "active" ? "Devam ediyor" : `Başlangıç: ${fmtDate(ev.start_at)}`;
          const amountText =
            typeof ev.prize_amount === "number" ? fmtTL(ev.prize_amount) : null;

          return (
            <article
              key={ev.id}
              className="card"
              style={{ ["--tone" as any]: String(hue) } as React.CSSProperties}
            >
              {/* Sol dikey neon şerit */}
              <span className="neonLeft" aria-hidden />

              {/* Sağ üst kurdele (kategori) */}
              <span className="ribbon" aria-label={catLabel}>
                <span className="ribTxt">{catLabel}</span>
              </span>

              {/* Üst görsel */}
              <div
                className="thumb"
                style={{ backgroundImage: `url('${ev.image_url}')` }}
                role="img"
                aria-label={ev.title}
              >
                {/* sol-üst state pill */}
                <span className={`pill ${ev.state}`}>{stateLab}</span>
              </div>

              {/* Başlık */}
              <h3 className="title" title={ev.title}>{ev.title}</h3>

              {/* ÖDÜL MİKTARI – varsa belirgin şekilde göster */}
              {amountText && (
                <div className="amount" title={`Ödül: ${amountText}`}>
                  <span className="label">ÖDÜL</span>
                  <span className="value">{amountText}</span>
                </div>
              )}

              {/* Alt bilgi */}
              <div className="meta">{subTxt}</div>

              {/* CTA */}
              <button className="cta" type="button">KATIL</button>
            </article>
          );
        })}
      </div>

      <style>{css}</style>
    </section>
  );
}

/* ===================== CSS ===================== */
const css = `
.eventsWrap{ margin:18px 0 }
.msg{ padding:16px; border:1px solid rgba(255,255,255,.10); border-radius:12px; background:rgba(255,255,255,.03); color:#eaf2ff }
.msg.muted{ color:#9fb1cc }

/* grid */
.grid{
  display:grid;
  grid-template-columns: repeat( auto-fill, minmax(260px, 1fr) );
  gap:16px;
}

/* kart */
.card{
  position:relative;
  display:flex; flex-direction:column;
  border-radius:18px;
  overflow:hidden;
  background:linear-gradient(180deg, rgba(12,18,36,.55), rgba(12,18,36,.35));
  border:1px solid rgba(255,255,255,.08);
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.04),
    0 10px 30px rgba(0,0,0,.35);
  isolation:isolate;
}

/* sol neon şerit (kategori rengi) */
.card .neonLeft{
  position:absolute; left:0; top:12px; bottom:12px; width:6px; z-index:2;
  background: linear-gradient(180deg,
    hsla(var(--tone,190), 95%, 60%, .9),
    hsla(var(--tone,190), 95%, 55%, .55));
  box-shadow: 0 0 18px hsla(var(--tone,190), 95%, 60%, .85);
  border-radius: 4px;
}

/* sağ üst kurdele */
.card .ribbon{
  position:absolute; right:-54px; top:14px; width:160px; height:28px; transform:rotate(45deg); z-index:3;
  background:linear-gradient(90deg,
    hsla(var(--tone,190), 95%, 65%, .95),
    hsla(var(--tone,190), 95%, 55%, .85));
  box-shadow:0 6px 18px hsla(var(--tone,190), 95%, 60%, .55);
  display:grid; place-items:center;
}
.card .ribbon .ribTxt{
  transform:rotate(-45deg);
  color:#001018; font-weight:900; font-size:11px; letter-spacing:.6px;
}

/* üst görsel */
.card .thumb{
  position:relative; height:150px; background-size:cover; background-position:center;
  filter:saturate(1.05); 
}
.card .thumb::after{
  content:""; position:absolute; inset:0;
  background:linear-gradient(180deg, rgba(0,0,0,.0) 0%, rgba(0,0,0,.55) 75%, rgba(0,0,0,.75) 100%);
}

/* state pill */
.pill{
  position:absolute; left:10px; top:10px; z-index:4;
  display:inline-flex; align-items:center; gap:6px;
  height:22px; padding:0 10px; border-radius:999px;
  font-size:12px; font-weight:900; letter-spacing:.3px;
  color:#001018; background:linear-gradient(90deg, #34ff9a, #a8ffcf);
  box-shadow:0 4px 14px rgba(52,255,154,.45);
}
.pill.upcoming{ background:linear-gradient(90deg, #ffd36a, #ffe7a1); box-shadow:0 4px 14px rgba(255,211,106,.42) }

/* başlık */
.card .title{
  margin:10px 12px 4px; font-size:18px; font-weight:900; color:#eaf2ff;
  text-shadow:0 2px 12px rgba(0,0,0,.45);
  min-height: 44px;
}

/* ÖDÜL satırı – belirgin */
.card .amount{
  margin:4px 12px 2px;
  display:flex; align-items:baseline; gap:8px;
  font-weight:900;
}
.card .amount .label{
  color:#a7bddb; font-size:12px; letter-spacing:.6px;
}
.card .amount .value{
  font-size:20px; color:#f7fbff; text-shadow:0 0 14px rgba(0,229,255,.30);
}

/* alt bilgi */
.card .meta{
  margin:0 12px 12px; color:#cfe0ff; font-size:13px;
  opacity:.95;
}

/* CTA – kategori rengi ile aynı ton */
.card .cta{
  margin: 8px 12px 12px;
  height:38px; border:none; border-radius:12px; cursor:pointer;
  font-weight:900; letter-spacing:.3px; color:#001018;
  background: linear-gradient(90deg, hsla(var(--tone,190), 95%, 65%, 1), hsla(var(--tone,190), 95%, 55%, 1));
  box-shadow: 0 8px 20px hsla(var(--tone,190), 95%, 60%, .45), inset 0 0 0 1px rgba(255,255,255,.25);
}
.card .cta:hover{ filter:brightness(1.06) }
`;
