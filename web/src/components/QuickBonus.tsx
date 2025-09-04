// web/src/components/QuickBonus.tsx
import { useEffect, useMemo, useState } from "react";
import { getActivePromos, type PromoActive } from "../api/promos";

/**
 * Hızlı Bonus (Premium Card)
 * - Görsel başlık alanı + sol şerit (kategori rengi)
 * - Büyük geri sayım (upcoming: başlayana, active: biteceğe)
 * - “Max” göstergesi (priority > 0 ise)
 * - CTA: cta_url varsa buton; yoksa düğme gizlenir
 * - Kategori renkleri:
 *    slots=altın, live-casino=kırmızı, sports=yeşil, all=aqua, other=mor
 */

type PromoEx = PromoActive & {
  state?: "active" | "upcoming";
  seconds_to_start?: number | null;
};

const CAT = {
  "slots":       { brand: "#FFD700", text: "#001018" },   // gold
  "live-casino": { brand: "#ff3b6b", text: "#fff" },      // red
  "sports":      { brand: "#22c55e", text: "#001018" },   // green
  "all":         { brand: "#00e5ff", text: "#001018" },   // aqua
  "other":       { brand: "#9b59b6", text: "#fff" },      // purple
};

export default function QuickBonus({ limit = 6 }: { limit?: number }) {
  const [rows, setRows] = useState<PromoEx[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/promos/active?limit=${limit}&include_future=1&window_hours=48`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((arr: PromoEx[]) => alive && (setRows(Array.isArray(arr) ? arr : []), setErr("")))
      .catch(e => alive && (setErr(e?.message ?? "Hata"), setRows([])))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [limit]);

  // countdown tick
  useEffect(() => {
    if (!rows.length) return;
    const t = setInterval(() => {
      setRows(prev => prev.map(p => {
        if (p.state === "upcoming" && p.seconds_to_start != null) {
          return { ...p, seconds_to_start: Math.max(0, p.seconds_to_start - 1) };
        }
        if (p.state === "active" && p.seconds_left != null) {
          return { ...p, seconds_left: Math.max(0, p.seconds_left - 1) };
        }
        return p;
      }));
    }, 1000);
    return () => clearInterval(t);
  }, [rows.length]);

  return (
    <section className="bonusSec">
      <div className="bonusHead">
        <h2>⚡ Hızlı Bonuslar</h2>
        {!loading && !rows.length && <span className="muted">Şu an aktif veya yakında başlayacak promosyon yok.</span>}
      </div>

      {loading && <Skeleton />}

      {!loading && rows.length > 0 && (
        <div className="grid">
          {rows.map((p) => (
            <PromoCard key={String(p.id)} p={p} />
          ))}
        </div>
      )}

      <style>{css}</style>
    </section>
  );
}

/* ---------------- Card ---------------- */
function PromoCard({ p }: { p: PromoEx }) {
  const catKey = (p.category || "all").toLowerCase() as keyof typeof CAT;
  const pal = CAT[catKey] || CAT["all"];
  const locked = p.state === "upcoming";
  const t = locked ? fmt(p.seconds_to_start ?? 0) : fmt(p.seconds_left ?? 0);
  const maxText = p.priority && p.priority > 0 ? `Max: ${formatInt(p.priority)}` : "";

  return (
    <article
      className={`card ${locked ? "upcoming" : "active"}`}
      style={{ ["--brand" as any]: pal.brand, ["--brandText" as any]: pal.text }}
    >
      {/* Sol şerit */}
      <div className="stripe" />

      {/* Üst görsel başlık alanı */}
      <div className="top" style={{ backgroundImage: p.image_url ? `url('${p.image_url}')` : "none" }}>
        <div className="logoRow">
          <div className="iconCircle">📣</div>
          <div className="promoTag">PROMO KODU</div>
        </div>
      </div>

      {/* İçerik */}
      <div className="body">
        <div className="title">{p.title}</div>

        <div className="center">
          <span className="dotGlow" />
          <div className="timer">
            {t.hh}:{t.mm}:{t.ss}
          </div>
          <div className="line" />
          {maxText && <div className="max">Max: <b>{formatInt(p.priority!)}</b></div>}
        </div>

        {p.cta_url ? (
          <a className="cta" href={p.cta_url} target="_blank" rel="noreferrer">
            RESMİ TELEGRAM KANALI <span className="plane">✈️</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}

/* ---------------- Helpers ---------------- */
function fmt(total: number) {
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return {
    hh: String(hh).padStart(2, "2".length),
    mm: String(mm).padStart(2, "2".length),
    ss: String(ss).padStart(2, "2".length),
  };
}
function formatInt(n: number) {
  try { return new Intl.NumberFormat("tr-TR").format(n); } catch { return String(n); }
}

/* ---------------- Skeleton ---------------- */
function Skeleton() {
  return (
    <div className="grid">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="sk">
          <div className="skTop" />
          <div className="skBar w1" />
          <div className="skBar w2" />
          <div className="skBtn" />
        </div>
      ))}
    </div>
  );
}

/* ---------------- CSS ---------------- */
const css = `
.bonusSec{margin:16px 0}
.bonusHead{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.bonusHead h2{margin:0;font-size:18px;color:#eaf2ff}
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

/* Sol şerit */
.stripe{
  position:absolute; left:0; top:0; bottom:0; width:12px;
  background:
    repeating-linear-gradient(180deg, var(--brand) 0 10px, rgba(255,255,255,.15) 10px 20px);
  box-shadow: inset -1px 0 0 rgba(255,255,255,.12);
}

/* Üst header görseli */
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
.promoTag{
  color:#f2f7ff; font-weight:900; letter-spacing:.6px;
  text-shadow:0 2px 12px rgba(0,0,0,.45);
}

/* Gövde */
.body{padding:12px 16px 14px}
.title{
  font-weight:900; color:#eaf2ff; font-size:18px; margin-bottom:12px;
  text-shadow:0 2px 12px rgba(0,0,0,.35);
}

/* Merkez sayaç alanı */
.center{display:flex; flex-direction:column; align-items:flex-start}
.dotGlow{
  width:8px; height:8px; border-radius:999px; background:var(--brand);
  box-shadow:0 0 12px var(--brand); margin-bottom:8px;
}
.timer{
  display:inline-block; padding:10px 14px; border-radius:12px;
  color:#eaf2ff; font-weight:1000; letter-spacing:1px; font-size:22px;
  background:rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.12);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.05), 0 10px 24px rgba(0,0,0,.25);
}
.line{
  height:4px; width:180px; margin:8px 0 6px; border-radius:999px;
  background: linear-gradient(90deg, transparent, var(--brand), transparent);
  box-shadow:0 0 12px var(--brand);
}
.max{ color:#9bd8ff; font-size:13px }
.max b{ color:#eaf2ff }

/* CTA */
.cta{
  margin-top:12px; display:flex; align-items:center; justify-content:center; gap:8px;
  background: var(--brand); color: var(--brandText); text-decoration:none;
  border-radius:12px; padding:10px 14px; font-weight:900;
  box-shadow:0 10px 24px rgba(0,0,0,.25), 0 0 0 1px rgba(255,255,255,.14) inset;
}
.cta .plane{margin-left:6px}

.sk{
  border-radius:18px; overflow:hidden; border:1px solid rgba(255,255,255,.08);
  background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  padding:12px;
}
.skTop{height:90px; border-radius:10px; background:linear-gradient(90deg,#0f1a33,#132650,#0f1a33); animation:sh 1.2s linear infinite}
.skBar{height:12px; border-radius:6px; margin-top:10px; background:linear-gradient(90deg,#0f1a33,#132650,#0f1a33); animation:sh 1.2s linear infinite}
.w1{width:70%}.w2{width:40%}.w3{width:60%}
@keyframes sh{0%{background-position:-200px 0}100%{background-position:200px 0}}
`;
