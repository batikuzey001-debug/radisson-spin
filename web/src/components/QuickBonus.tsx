// web/src/components/QuickBonus.tsx
import { useEffect, useMemo, useState } from "react";
import type { PromoActive } from "../api/promos";

/**
 * Hızlı Bonus (Premium Card v4)
 * - "Başlamasına kalan" yazısı kaldırıldı
 * - Sol şerit yalnızca kart kenarında (resmin üstünde overlay yok)
 * - Üst görselde karartma yok
 * - Promo kod ismi büyütüldü
 */

type PromoEx = PromoActive & {
  state?: "active" | "upcoming";
  seconds_to_start?: number | null;
  code?: string | null;
  promo_code?: string | null;
  bonus_code?: string | null;
  token?: string | null;
  code_name?: string | null;
};

const CAT = {
  "slots":       { brand: "#FFD700", text: "#001018" },
  "live-casino": { brand: "#ff3b6b", text: "#fff" },
  "sports":      { brand: "#22c55e", text: "#001018" },
  "all":         { brand: "#00e5ff", text: "#001018" },
  "other":       { brand: "#9b59b6", text: "#fff" },
};

export default function QuickBonus({ limit = 6 }: { limit?: number }) {
  const [rows, setRows] = useState<PromoEx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/promos/active?limit=${limit}&include_future=1&window_hours=48`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((arr: PromoEx[]) => alive && setRows(Array.isArray(arr) ? arr : []))
      .catch(() => alive && setRows([]))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [limit]);

  // Geri sayım tick
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

  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (locked && (p.seconds_to_start ?? 0) <= 0) setRevealed(true);
  }, [locked, p.seconds_to_start]);

  const code: string | null = useMemo(() => {
    const anyP = p as any;
    return anyP.code ?? anyP.promo_code ?? anyP.bonus_code ?? anyP.token ?? null;
  }, [p]);

  const codeName: string = useMemo(() => {
    const anyP = p as any;
    return (anyP.code_name ?? p.title ?? "Promo") as string;
  }, [p]);

  const timeStr = `${t.hh}:${t.mm}:${t.ss}`;

  const handleCopy = async () => {
    const c = code ?? "";
    try { await navigator.clipboard.writeText(c); } catch {}
  };

  return (
    <article
      className="card"
      style={{ ["--brand" as any]: pal.brand, ["--brandText" as any]: pal.text }}
    >
      <div className="stripe" />

      <div className="top" style={{ backgroundImage: p.image_url ? `url('${p.image_url}')` : "none" }}>
        <div className="logoRow">
          <div className="iconCircle">📣</div>
        </div>
      </div>

      <div className="body">
        <div className="codeName" title={codeName}>{codeName}</div>

        {!revealed ? (
          <div className="center">
            <div className="timerPlain">{timeStr}</div>
          </div>
        ) : (
          <div className="reveal show">
            <div className="revealLabel">KOD HAZIR</div>
            <div className="codeBox">{code ? code : "KOD GÖRÜNTÜLENECEK"}</div>
            <div className="revealActions">
              {code ? (
                <button className="copyBtn" onClick={handleCopy}>Kopyala</button>
              ) : null}
              {p.cta_url ? (
                <a className="cta ghost" href={p.cta_url} target="_blank" rel="noreferrer">Detay</a>
              ) : null}
            </div>
          </div>
        )}

        {p.cta_url ? (
          <div className="ctaWrap">
            <a className="cta primary" href={p.cta_url} target="_blank" rel="noreferrer">Katıl</a>
          </div>
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
}

.bonusSec{margin:16px 0}
.bonusHead{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.bonusHead h2{margin:0;font-size:18px;color:var(--text)}
.muted{color:#9fb1cc;font-size:13px}

.grid{display:grid;gap:14px;grid-template-columns:repeat(3,minmax(0,1fr))}
@media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.grid{grid-template-columns:1fr}}

.card{
  position:relative; display:flex; flex-direction:column; overflow:hidden;
  background:linear-gradient(180deg, var(--cardBg1), var(--cardBg2));
  border-radius:20px;
  box-shadow:0 22px 44px rgba(0,0,0,.42), inset 0 0 0 1px rgba(255,255,255,.03);
  backdrop-filter:saturate(140%) blur(6px);
}

/* Sol neon şerit tam yükseklik */
.stripe{
  position:absolute; left:0; top:0; bottom:0; width:12px;
  background: linear-gradient(180deg, rgba(0,229,255,.95), rgba(0,229,255,.55));
  box-shadow:0 0 20px rgba(0,229,255,.6);
}

/* Üst header görseli — overlay yok */
.top{
  height:80px; background:#0f1a33; background-size:cover; background-position:center;
  display:flex; align-items:center; padding-left:18px;
}
.logoRow{display:flex; align-items:center; gap:10px}
.iconCircle{
  width:36px; height:36px; border-radius:999px; display:grid; place-items:center;
  background:var(--brand, var(--aqua)); color:var(--brandText, #001018); font-size:18px;
  box-shadow:0 8px 18px rgba(0,0,0,.25);
}

/* Gövde */
.body{padding:16px 16px 18px}
.codeName{
  color:#bff6ff; font-weight:900; letter-spacing:.6px;
  margin-bottom:12px; font-size:20px;
  text-shadow:0 0 14px rgba(0,229,255,.5);
}

/* Sayaç */
.center{display:flex; flex-direction:column; align-items:flex-start}
.timerPlain{
  font-weight:1000; font-size:38px; letter-spacing:2px; line-height:1;
  color:var(--text);
  text-shadow:0 0 24px rgba(0,229,255,.35), 0 0 8px rgba(0,229,255,.4);
}

/* Kod Reveal */
.reveal{ display:none; flex-direction:column; align-items:flex-start; gap:10px; }
.reveal.show{ display:flex }
.revealLabel{ color:#bfefff; font-size:12px; font-weight:700; }
.codeBox{
  padding:12px 14px; border-radius:14px; min-height:48px; min-width:200px;
  background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.35));
  color:#eaffff; font-weight:900; font-size:22px; letter-spacing:1.4px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), 0 0 24px rgba(0,229,255,.35);
  text-shadow:0 0 10px rgba(0,229,255,.6);
}
.revealActions{display:flex; gap:10px}
.copyBtn{
  border:0; cursor:pointer; border-radius:12px; padding:10px 14px; font-weight:900;
  background:rgba(0,229,255,.15); color:#c7f7ff;
  box-shadow: inset 0 0 0 1px rgba(0,229,255,.45);
}

/* CTA */
.ctaWrap{ display:flex; justify-content:center; margin-top:16px }
.cta{
  display:inline-flex; align-items:center; justify-content:center;
  border-radius:12px; padding:12px 18px; font-weight:900; text-decoration:none;
}
.cta.primary{
  background: var(--brand, var(--aqua)); color: var(--brandText, #001018);
  box-shadow:0 12px 28px rgba(0,0,0,.25), 0 0 0 1px rgba(255,255,255,.12) inset;
}
.cta.ghost{ background:rgba(255,255,255,.06); color:#eaf6ff; }

/* Skeleton */
.sk{ border-radius:20px; overflow:hidden; background:linear-gradient(180deg, var(--cardBg1), var(--cardBg2)); padding:12px; }
.skTop{height:80px; border-radius:10px; background:linear-gradient(90deg,#0f1a33,#132650,#0f1a33); animation:sh 1.2s linear infinite}
.skBar{height:12px; border-radius:6px; margin-top:10px; background:linear-gradient(90deg,#0f1a33,#132650,#0f1a33); animation:sh 1.2s linear infinite}
@keyframes sh{0%{background-position:-200px 0}100%{background-position:200px 0}}
`;
