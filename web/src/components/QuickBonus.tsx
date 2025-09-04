// web/src/components/QuickBonus.tsx
import { useEffect, useMemo, useState } from "react";
import { getActivePromos, type PromoActive } from "../api/promos";

/**
 * Hızlı Bonus / Promo Kod Kartları
 * - Kaynak: GET /api/promos/active?limit=6
 * - Kart: görsel (ops), büyük KUPON KODU (kopyala), başlık, kısa açıklama (subtitle varsa),
 *         geri sayım (seconds_left veya end_at’tan hesap)
 * - Mobil uyumlu grid
 */

export default function QuickBonus({ limit = 6 }: { limit?: number }) {
  const [rows, setRows] = useState<PromoActive[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getActivePromos(limit)
      .then((r) => alive && (setRows(r), setErr("")))
      .catch((e) => alive && (setErr(e?.message ?? "Hata"), setRows([])))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [limit]);

  return (
    <section className="qb">
      <div className="qb__head">
        <h2>⚡ Hızlı Bonuslar</h2>
        {!loading && !rows.length && <span className="muted">Şu an aktif promosyon bulunamadı.</span>}
      </div>

      {loading && <SkeletonGrid />}

      {!loading && rows.length > 0 && (
        <div className="qb__grid">
          {rows.map((p) => (
            <PromoCard key={String(p.id)} p={p} />
          ))}
        </div>
      )}

      <style>{css}</style>
    </section>
  );
}

/* -------------------- Card -------------------- */
function PromoCard({ p }: { p: PromoActive }) {
  const [copied, setCopied] = useState(false);
  const endTs = useMemo(() => (p.end_at ? Date.parse(p.end_at) : null), [p.end_at]);

  // Countdown (saniye bazlı; seconds_left varsa ondan başlar)
  const [left, setLeft] = useState<number>(() => (p.seconds_left ?? (endTs ? Math.max(0, Math.floor((endTs - Date.now()) / 1000)) : 0)));
  useEffect(() => {
    if (!endTs && !p.seconds_left) return;
    const t = setInterval(() => {
      const next = p.seconds_left
        ? Math.max(0, left - 1)
        : Math.max(0, Math.floor(((endTs ?? 0) - Date.now()) / 1000));
      setLeft(next);
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTs, p.seconds_left, left]);

  const t = fmt(left);

  const copy = async () => {
    try {
      if (p.coupon_code) {
        await navigator.clipboard.writeText(p.coupon_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }
    } catch {
      // ignore
    }
  };

  return (
    <article className="card" style={{ ["--accent" as any]: p.accent_color || "#00e5ff" }}>
      <div className="media" style={{ backgroundImage: p.image_url ? `url('${p.image_url}')` : undefined }} />
      <div className="body">
        <div className="title">{p.title}</div>

        <div className="codeRow">
          <span className="code">{p.coupon_code || "—"}</span>
          <button className="cpy" onClick={copy} disabled={!p.coupon_code}>
            {copied ? "Kopyalandı" : "Kopyala"}
          </button>
        </div>

        <div className="meta">
          {p.end_at ? (
            <span className="timer" title={new Date(p.end_at).toLocaleString("tr-TR")}>
              ⏳ {t.hh}:{t.mm}:{t.ss}
            </span>
          ) : (
            <span className="timer muted">⏳ Süre bilgisi yok</span>
          )}
          {/* İstersek CTA linkini de ekleriz (şimdilik gizli tutuyoruz) */}
        </div>
      </div>
    </article>
  );
}

/* -------------------- Helpers -------------------- */
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

/* -------------------- Skeleton -------------------- */
function SkeletonGrid() {
  return (
    <div className="qb__grid">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="s-card">
          <div className="s-media" />
          <div className="s-line w1" />
          <div className="s-line w2" />
          <div className="s-line w3" />
        </div>
      ))}
    </div>
  );
}

/* -------------------- CSS -------------------- */
const css = `
.qb{margin:16px 0}
.qb__head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.qb__head h2{margin:0;font-size:18px;color:#eaf2ff}
.muted{color:#9fb1cc;font-size:13px}

.qb__grid{
  display:grid; gap:12px;
  grid-template-columns:repeat(3,minmax(0,1fr));
}
@media(max-width:900px){ .qb__grid{ grid-template-columns:repeat(2,minmax(0,1fr)) } }
@media(max-width:560px){ .qb__grid{ grid-template-columns:1fr } }

/* Card */
.card{
  display:flex; flex-direction:column; border-radius:14px; overflow:hidden;
  background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.08);
  box-shadow:0 8px 18px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.04);
}
.media{
  height:110px; background:#0f1a33; background-size:cover; background-position:center;
}
.body{padding:10px 12px; display:flex; flex-direction:column; gap:8px}
.title{font-weight:800; color:#eaf2ff; font-size:15px}
.codeRow{display:flex; align-items:center; gap:8px; flex-wrap:wrap}
.code{
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight:900; letter-spacing:.6px; color:#001018;
  background: linear-gradient(90deg, var(--accent, #00e5ff), #6fb7ff);
  border:1px solid rgba(255,255,255,.18);
  padding:6px 10px; border-radius:10px;
}
.cpy{
  padding:6px 10px; border-radius:10px; border:1px solid rgba(255,255,255,.16);
  background:rgba(255,255,255,.06); color:#eaf2ff; cursor:pointer;
}
.cpy:hover{ filter:brightness(1.06) }
.cpy:disabled{ opacity:.6; cursor:not-allowed }

.meta{display:flex; align-items:center; justify-content:space-between}
.timer{font-weight:700; color:#ffd966}
.timer.muted{color:#9fb1cc}

/* Skeleton */
.s-card{
  display:flex; flex-direction:column; border-radius:14px; overflow:hidden;
  background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.08);
  padding:10px;
}
.s-media{height:90px; border-radius:8px; background:linear-gradient(90deg,#0f1a33,#122244,#0f1a33); animation:sh 1.2s linear infinite}
.s-line{height:12px; border-radius:6px; margin-top:10px; background:linear-gradient(90deg,#0f1a33,#122244,#0f1a33); animation:sh 1.2s linear infinite}
.w1{width:70%} .w2{width:50%} .w3{width:40%}
@keyframes sh{ 0%{background-position:-200px 0} 100%{background-position:200px 0} }
`;
