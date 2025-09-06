// web/src/components/QuickBonus.tsx
import { useEffect, useRef, useState } from "react";
import { type PromoActive } from "../api/promos";

type PromoEx = PromoActive & {
  state?: "active" | "upcoming";
  seconds_to_start?: number | null;
  code?: string | null;
  promo_code?: string | null;
};

export default function QuickBonus({ limit = 6 }: { limit?: number }) {
  const [rows, setRows] = useState<PromoEx[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [flashIds, setFlashIds] = useState<Record<string, number>>({});
  const prevSecsRef = useRef<Record<string, number>>({});

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

  // sayaç tick
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

  // reveal flash
  useEffect(() => {
    const toFlash: string[] = [];
    rows.forEach(p => {
      const id = String(p.id);
      const prevSec = prevSecsRef.current[id];
      const nowSecStart = p.state === "upcoming" ? (p.seconds_to_start ?? 0) : undefined;
      if (prevSec != null && prevSec > 0 && nowSecStart === 0) {
        toFlash.push(id);
      }
      prevSecsRef.current[id] = p.state === "upcoming"
        ? (p.seconds_to_start ?? 0)
        : (p.seconds_left ?? 0);
    });
    if (toFlash.length) {
      const now = Date.now();
      setFlashIds(prev => {
        const next = { ...prev };
        toFlash.forEach(id => {
          next[id] = now;
          setTimeout(() => {
            setFlashIds(cur => {
              const c = { ...cur };
              delete c[id];
              return c;
            });
          }, 1200);
        });
        return next;
      });
    }
  }, [rows]);

  return (
    <section className="bonusSec">
      <div className="bonusHead">
        <h2><span className="tag">🎟️</span> Promo Kodlar</h2>
        <div className="headGlow" aria-hidden />
        {!loading && !rows.length && <span className="muted">Şu an gösterilecek promo yok.</span>}
      </div>

      {loading && <Skeleton />}

      {!loading && rows.length > 0 && (
        <div className="spx-wrap">
          {rows.map((p) => {
            const isUpcoming = p.state === "upcoming";
            const showCountdown = isUpcoming && (p.seconds_to_start ?? 0) > 0;

            const codeText = (p.promo_code || p.code || "").toString().trim();
            const displayText = showCountdown
              ? formatCountdown(p.seconds_to_start ?? 0)
              : (codeText || (p.title ?? "KOD"));

            const img = p.image_url || "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1600&auto=format&fit=crop";
            const maxText = p.priority != null ? trNum(p.priority) : undefined;
            const idStr = String(p.id);
            const doFlash = !!flashIds[idStr] && !showCountdown;

            // countdown renk sınıfı
            let countdownClass = "wait";
            if (showCountdown) {
              if ((p.seconds_to_start ?? 0) < 3600) countdownClass = "red";
              else countdownClass = "yellow";
            }

            return (
              <article className="spx-card" key={idStr}>
                <header className="spx-media" style={{ ["--img" as any]: `url('${img}')` }} />
                <div className="spx-body">
                  <h3 className="spx-title" title={p.title ?? "Promo Kod"}>{p.title ?? "Promo Kod"}</h3>

                  <div className="spx-timer">
                    <div className="codeRow">
                      <div className={`spx-code ${showCountdown ? countdownClass : "on"} ${doFlash ? "revealFlash" : ""}`} aria-live="polite">
                        {displayText}
                      </div>
                      {!showCountdown && codeText ? (
                        <button className="copyBtn" onClick={() => copyToClipboard(codeText)}>Kopyala</button>
                      ) : null}
                    </div>
                  </div>

                  <div className="spx-scan" />

                  {maxText && (
                    <div className="spx-limit">
                      <span>Max:</span> <b>{maxText}</b>
                    </div>
                  )}

                  {p.cta_url ? (
                    <a className="spx-cta" href={p.cta_url} target="_blank" rel="nofollow noreferrer">Katıl</a>
                  ) : null}
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

/* ---------------- Helpers ---------------- */
function formatCountdown(s: number) {
  const total = Math.max(0, Math.floor(s));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}
async function copyToClipboard(text: string) {
  try { await navigator.clipboard.writeText(text); } catch { /* fallback */ }
}
function trNum(v: any) {
  try {
    const n = typeof v === "string" ? Number(v.replace(/\./g, "").replace(/,/g, ".")) : Number(v);
    return Number.isFinite(n) ? n.toLocaleString("tr-TR") : String(v ?? "");
  } catch { return String(v ?? ""); }
}

/* ---------------- Skeleton ---------------- */
function Skeleton() {
  return (
    <div className="spx-wrap">
      {Array.from({ length: 3 }).map((_, i) => (
        <article key={i} className="spx-card">
          <header className="spx-media" />
          <div className="spx-body">
            <h3 className="spx-title" style={{ opacity: 0.4 }}>Yükleniyor…</h3>
            <div className="spx-timer"><div className="spx-code wait">--:--:--</div></div>
            <div className="spx-scan" />
          </div>
        </article>
      ))}
    </div>
  );
}

/* ---------------- CSS ---------------- */
const css = `
/* ... önceki stiller aynı ... */

.spx-code{
  font-family:Rajdhani,system-ui,sans-serif; font-weight:900; font-size:26px; letter-spacing:1.2px; color:#f2f7ff;
  display:inline-block; padding:10px 12px; border-radius:12px; min-width:140px;
  background:linear-gradient(180deg,#0f1730,#0d1428); border:1px solid #202840;
  box-shadow: inset 0 0 22px rgba(0,0,0,.38), 0 0 22px rgba(255,255,255,.05), 0 0 28px rgba(0,229,255,.18);
}
.spx-code.on{ text-shadow:0 0 14px rgba(0,229,255,.45) }
.spx-code.yellow{ color:#fff3c2; text-shadow:0 0 12px #ffda6b, 0 0 22px #ffb300 }
.spx-code.red{
  color:#ffdada; text-shadow:0 0 14px #ff5c5c, 0 0 28px #ff2e2e;
  animation:redPulse 1.4s ease-in-out infinite;
}
@keyframes redPulse{
  0%,100%{ opacity:1 }
  50%{ opacity:.55 }
}
`;
