import { useEffect, useState } from "react";

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

/* --- Kategori -> renk eşleşmesi (hue) --- */
const CAT: Record<string, { hue: number; label: string }> = {
  "sports":      { hue: 150, label: "SPOR" },
  "live-casino": { hue: 10,  label: "CANLI" },
  "slots":       { hue: 48,  label: "SLOT" },
  "all":         { hue: 190, label: "HEPSİ" },
  "other":       { hue: 280, label: "ÖZEL" },
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

/* TL biçimlendirici */
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
          // TV stili rozet metinleri
          const stateLab = ev.state === "active" ? "LIVE" : "BEKLEMEDE";
          const subTxt = ev.state === "active" ? "" : `Başlangıç: ${fmtDate(ev.start_at)}`;
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

              {/* Sağ üst kurdele (kategori) – yazı kurdele ile aynı açıda */}
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
                {/* sol-üst TV tarzı rozet */}
                <span className={`pill ${ev.state}`}>
                  <span className="dot" aria-hidden />
                  {stateLab}
                </span>
              </div>

              {/* ÖDÜL MİKTARI – en öne, büyük ve dikkat çekici */}
              {amountText && (
                <div className="amount" title={amountText}>
                  <span className="value">{amountText}</span>
                </div>
              )}

              {/* Başlık */}
              <h3 className="title" title={ev.title}>{ev.title}</h3>

              {/* Alt bilgi (yalnız upcoming) */}
              {subTxt && <div className="meta">{subTxt}</div>}

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
  position:absolute; right:-56px; top:16px; width:168px; height:30px; transform:rotate(45deg); z-index:3;
  background:linear-gradient(90deg,
    hsla(var(--tone,190), 95%, 65%, .98),
    hsla(var(--tone,190), 95%, 55%, .90));
  box-shadow:0 6px 18px hsla(var(--tone,190), 95%, 60%, .55);
  display:grid; place-items:center;
  overflow:hidden;
}
.card .ribbon::before, .card .ribbon::after{
  /* küçük parlama/şerit dokusu – okunurluğu artırır */
  content:""; position:absolute; inset:0;
  background:
    linear-gradient(0deg, rgba(255,255,255,.12), rgba(255,255,255,0) 40%),
    repeating-linear-gradient(90deg, rgba(255,255,255,.07) 0 2px, rgba(0,0,0,0) 2px 6px);
  pointer-events:none;
}
.card .ribbon .ribTxt{
  /* Kurdele ile aynı açı – artık düz değil */
  transform: skewX(-8deg);
  font-weight:1000; font-size:12px; letter-spacing:1px;
  text-transform:uppercase;
  color:#001018;
  /* kontur + kabartma – karmaşık görsel zeminlerde okunurluk */
  -webkit-text-stroke: 0.6px rgba(0,0,0,.25);
  text-shadow:
    0 1px 0 rgba(255,255,255,.35),
    0 2px 10px rgba(0,0,0,.25);
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

/* TV tarzı rozet (LIVE/BEKLEMEDE) */
.pill{
  position:absolute; left:10px; top:10px; z-index:4;
  display:inline-flex; align-items:center; gap:8px;
  height:24px; padding:0 12px; border-radius:6px;
  font-size:12px; font-weight:1000; letter-spacing:.4px;
  color:#ffffff; text-transform:uppercase;
  box-shadow: 0 6px 18px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.2);
  backdrop-filter: blur(2px);
}
.pill .dot{
  width:8px; height:8px; border-radius:50%;
  box-shadow:0 0 0 2px rgba(0,0,0,.25), 0 0 8px currentColor;
}

/* ACTIVE -> Kırmızı LIVE rozeti + nabız efekti */
.pill.active{
  background:linear-gradient(90deg, #ff3b3b, #ff6b6b);
}
.pill.active .dot{
  color:#ffdddd; background:#fff;
  position:relative;
}
.pill.active .dot::after{
  /* nabız sadece 'active'de */
  content:""; position:absolute; inset:-6px; border-radius:50%;
  border:2px solid #ffb3b3;
  opacity:.7; animation:pulse 1.6s ease-out infinite;
}
@keyframes pulse{
  0%{ transform:scale(.6); opacity:.7 }
  70%{ transform:scale(1.6); opacity:0 }
  100%{ transform:scale(1.6); opacity:0 }
}

/* UPCOMING -> Kehribar beklemede */
.pill.upcoming{
  color:#001018;
  background:linear-gradient(90deg, #ffd36a, #ffebad);
}
.pill.upcoming .dot{
  background:#a86c00; color:#ffd36a;
}

/* ÖDÜL – en üstte, büyük ve neon vurgulu */
.card .amount{
  margin:12px 12px 2px;
}
.card .amount .value{
  font-size: clamp(22px, 5vw, 28px);
  font-weight:1000; letter-spacing:.6px;
  background: linear-gradient(90deg,
    hsla(var(--tone,190), 100%, 70%, 1),
    hsla(var(--tone,190), 100%, 92%, 1));
  -webkit-background-clip:text; background-clip:text;
  -webkit-text-fill-color:transparent;
  text-shadow: 0 0 18px hsla(var(--tone,190), 95%, 60%, .45);
}

/* başlık */
.card .title{
  margin:6px 12px 4px; font-size:18px; font-weight:900; color:#eaf2ff;
  text-shadow:0 2px 12px rgba(0,0,0,.45);
  min-height: 44px;
}

/* alt bilgi (yalnız upcoming) */
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
