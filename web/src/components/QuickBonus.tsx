// web/src/components/QuickBonus.tsx
import { useEffect, useMemo, useState } from "react";
import type { PromoActive } from "../api/promos";

/**
 * Hızlı Bonus (Premium Card v2)
 * - Neon aqua sol şerit (profesyonel glow + pulse)
 * - Görsel başlık daha küçük ve karartılmış
 * - Büyük, kutucuklu dijital sayaç
 * - CTA "Katıl"
 * - Sayaç bittiğinde (upcoming) ekranda kod otomatik "reveal"
 * - Kenar çerçevesi yok, cam/blur arka plan
 */

type PromoEx = PromoActive & {
  state?: "active" | "upcoming";
  seconds_to_start?: number | null;
  // Olası alan adları; back-end ne verirse onu yakalamak için esnek
  code?: string | null;
  promo_code?: string | null;
  bonus_code?: string | null;
  token?: string | null;
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

  // countdown tick (yalnızca değer varsa ilerlet)
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

  // Sayaç bittiğinde kodu otomatik göster
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (locked && (p.seconds_to_start ?? 0) <= 0) setRevealed(true); // Neden: Geri sayım bitti -> kodu göster
  }, [locked, p.seconds_to_start]);

  const code: string | null = useMemo(() => {
    const anyP = p as any;
    return anyP.code ?? anyP.promo_code ?? anyP.bonus_code ?? anyP.token ?? null;
  }, [p]);

  const digits = useMemo(() => {
    const s = `${t.hh}:${t.mm}:${t.ss}`;
    return s.split("");
  }, [t.hh, t.mm, t.ss]);

  const handleCopy = async () => {
    const c = code ?? "";
    try { await navigator.clipboard.writeText(c); } catch { /* Neden: Bazı tarayıcılar izin vermez */ }
  };

  return (
    <article
      className={`card ${locked ? "upcoming" : "active"}`}
      style={{
        ["--brand" as any]: pal.brand,
        ["--brandText" as any]: pal.text,
      }}
    >
      {/* Sol neon şerit */}
      <div className="stripe" />

      {/* Başlık alanı (daha küçük ve karartılmış) */}
      <div className="top" style={{ backgroundImage: p.image_url ? `url('${p.image_url}')` : "none" }}>
        <div className="topOverlay" />
        <div className="logoRow">
          <div className="iconCircle">📣</div>
          <div className="promoTag">PROMO</div>
        </div>
      </div>

      {/* İçerik */}
      <div className="body">
        <div className="title">{p.title}</div>

        {/* Sayaç / Kod */}
        {!revealed ? (
          <div className="center">
            <span className="statusDot" />
            <div className="timerBlocks" aria-label="Geri Sayım">
              {digits.map((ch, i) =>
                ch === ":" ? (
                  <span key={i} className="sep">:</span>
                ) : (
                  <span key={i} className="d">{ch}</span>
                )
              )}
            </div>
            <div className="timeHint">{locked ? "Başlamasına kalan süre" : "Bitmesine kalan süre"}</div>
            {maxText && <div className="max">Max: <b>{formatInt(p.priority!)}</b></div>}
          </div>
        ) : (
          <div className="reveal show" role="region" aria-live="polite">
            <div className="revealLabel">KOD HAZIR</div>
            <div className="codeBox" title={code ?? "Kod hazır"}>
              {code ? code : "KOD GÖRÜNTÜLENECEK"}
            </div>
            <div className="revealActions">
              {code ? (
                <button className="copyBtn" onClick={handleCopy} aria-label="Kodu kopyala">
                  Kopyala
                </button>
              ) : null}
              {p.cta_url ? (
                <a className="cta ghost" href={p.cta_url} target="_blank" rel="noreferrer" aria-label="Detaylara git">
                  Detaya Git
                </a>
              ) : null}
            </div>
          </div>
        )}

        {/* CTA */}
        {p.cta_url ? (
          <a className="cta primary" href={p.cta_url} target="_blank" rel="noreferrer" aria-label="Katıl">
            Katıl
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
  const ss = Math.max(0, total % 60);
  return {
    hh: String(hh).padStart(2, "0"),
    mm: String(mm).padStart(2, "0"),
    ss: String(ss).padStart(2, "0"),
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
:root{
  --aqua:#00e5ff;
  --cardBg1: rgba(255,255,255,.06);
  --cardBg2: rgba(255,255,255,.02);
  --text:#eaf2ff;
  --muted:#9fb1cc;
}

.bonusSec{margin:16px 0}
.bonusHead{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.bonusHead h2{margin:0;font-size:18px;color:var(--text)}
.muted{color:var(--muted);font-size:13px}

.grid{display:grid;gap:14px;grid-template-columns:repeat(3,minmax(0,1fr))}
@media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.grid{grid-template-columns:1fr}}

.card{
  position:relative; display:flex; flex-direction:column; overflow:hidden;
  background:linear-gradient(180deg, var(--cardBg1), var(--cardBg2));
  border-radius:18px;
  box-shadow:
    0 20px 40px rgba(0,0,0,.40),
    inset 0 0 0 1px rgba(255,255,255,.03);
  backdrop-filter:saturate(140%) blur(6px);
}

/* Sol profesyonel neon şerit (glow + yumuşak pulse) */
.stripe{
  position:absolute; left:0; top:0; bottom:0; width:12px; isolation:isolate;
  background: linear-gradient(180deg, rgba(0,229,255,.9), rgba(0,229,255,.6));
}
.stripe::before{
  content:""; position:absolute; inset:-40px -30px; filter:blur(26px); z-index:-1;
  background: radial-gradient(closest-side, rgba(0,229,255,.65), transparent 70%);
  animation: glowPulse 2.4s ease-in-out infinite;
}
@keyframes glowPulse{
  0%,100%{opacity:.55; transform:scaleY(1)}
  50%{opacity:1; transform:scaleY(1.06)}
}

/* Üst header görseli (daha küçük + karartma) */
.top{
  height:84px; background:#0f1a33; background-size:cover; background-position:center;
  display:flex; align-items:center; padding-left:18px; position:relative;
}
.topOverlay{
  position:absolute; inset:0;
  background:linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,.55));
}
.logoRow{display:flex; align-items:center; gap:10px; position:relative}
.iconCircle{
  width:36px; height:36px; border-radius:999px; display:grid; place-items:center;
  background:var(--brand, var(--aqua)); color:var(--brandText, #001018); font-size:18px;
  box-shadow:0 8px 18px rgba(0,0,0,.25);
}
.promoTag{
  color:#f2f7ff; font-weight:900; letter-spacing:.6px;
  text-shadow:0 2px 12px rgba(0,0,0,.45);
}

/* Gövde */
.body{padding:14px 16px 16px}
.title{
  font-weight:900; color:var(--text); font-size:18px; margin-bottom:12px;
  text-shadow:0 2px 12px rgba(0,0,0,.35);
}

/* Sayaç */
.center{display:flex; flex-direction:column; align-items:flex-start}
.statusDot{
  width:9px; height:9px; border-radius:999px; background:var(--brand, var(--aqua));
  box-shadow:0 0 14px var(--brand, var(--aqua)); margin-bottom:8px;
}
.timerBlocks{
  display:flex; align-items:center; gap:6px; font-variant-numeric:tabular-nums;
}
.d{
  display:inline-flex; align-items:center; justify-content:center;
  min-width:32px; height:44px; padding:0 6px; border-radius:10px;
  font-weight:1000; font-size:26px; letter-spacing:1px; color:var(--text);
  background:rgba(0,0,0,.42);
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.06),
    0 10px 24px rgba(0,0,0,.28),
    0 0 16px rgba(0,229,255,.10);
}
.sep{
  display:inline-block; padding:0 2px; font-size:26px; color:#bfefff;
  text-shadow:0 0 10px rgba(0,229,255,.6);
}
.timeHint{margin:8px 0 6px; color:#bfefff; font-size:12px; opacity:.9}
.max{ color:#9bd8ff; font-size:13px }
.max b{ color:var(--text) }

/* Kod Reveal */
.reveal{
  display:none; flex-direction:column; align-items:flex-start; gap:10px;
  animation: popIn .28s ease-out forwards;
}
.reveal.show{ display:flex }
@keyframes popIn{ from{ transform:translateY(6px); opacity:0 } to{ transform:translateY(0); opacity:1 } }
.revealLabel{
  color:#bfefff; font-size:12px; font-weight:700; letter-spacing:.4px;
}
.codeBox{
  display:inline-flex; align-items:center; justify-content:center;
  padding:12px 14px; border-radius:14px; min-height:48px; min-width:200px;
  background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.35));
  color:#eaffff; font-weight:900; font-size:22px; letter-spacing:1.4px;
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.08),
    0 0 24px rgba(0,229,255,.35);
  text-shadow:0 0 10px rgba(0,229,255,.6);
  user-select:text;
}
.revealActions{display:flex; gap:10px}
.copyBtn{
  appearance:none; border:0; cursor:pointer;
  border-radius:12px; padding:10px 14px; font-weight:900;
  background:rgba(0,229,255,.15);
  color:#c7f7ff;
  box-shadow: inset 0 0 0 1px rgba(0,229,255,.45);
}
.copyBtn:active{transform:translateY(1px)}

/* CTA */
.cta{
  margin-top:14px; display:inline-flex; align-items:center; justify-content:center;
  border-radius:12px; padding:12px 14px; font-weight:900; text-decoration:none;
}
.cta.primary{
  width:100%;
  background: var(--brand, var(--aqua));
  color: var(--brandText, #001018);
  box-shadow:0 12px 28px rgba(0,0,0,.25), 0 0 0 1px rgba(255,255,255,.12) inset;
}
.cta.ghost{
  background:rgba(255,255,255,.06);
  color:#eaf6ff;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.12);
}
.cta:active{ transform: translateY(1px) }

/* Skeleton */
.sk{
  border-radius:18px; overflow:hidden;
  background:linear-gradient(180deg, var(--cardBg1), var(--cardBg2));
  padding:12px;
  box-shadow:0 20px 40px rgba(0,0,0,.40), inset 0 0 0 1px rgba(255,255,255,.03);
}
.skTop{height:84px; border-radius:10px; background:linear-gradient(90deg,#0f1a33,#132650,#0f1a33); animation:sh 1.2s linear infinite}
.skBar{height:12px; border-radius:6px; margin-top:10px; background:linear-gradient(90deg,#0f1a33,#132650,#0f1a33); animation:sh 1.2s linear infinite}
.w1{width:70%}.w2{width:40%}.w3{width:60%}
@keyframes sh{0%{background-position:-200px 0}100%{background-position:200px 0}}
`;
