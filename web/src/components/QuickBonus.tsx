// web/src/components/QuickBonus.tsx
import { useEffect, useRef, useState } from "react";
import { type PromoActive } from "../api/promos";

/**
 * QuickBonus — Promo Kodlar
 * - Upcoming: sayaç (sarı); 0 olduğunda kod + flash + kopyala.
 * - Active: doğrudan kod.
 * - Son 1 saat kala: kırmızı yanıp söner.
 * - Tasarım: küçük kartlar (240px), aqua LED şerit + kayan efekt.
 */

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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@700;800;900&family=Rajdhani:wght@700;800;900&display=swap');

:root{
  --radius:18px; --txt:#eaf2ff; --muted:#9fb3d9;
  --bg1:#0f162b; --bg2:#0a1224;
  --n1:#00e5ff; --n2:#00b3ff; /* Aqua LED */
}

.bonusSec{margin:16px 0}
.bonusHead{position:relative; display:flex; align-items:center; gap:12px; margin-bottom:12px}
.bonusHead h2{
  margin:0; font-size:20px; color:#eaf2ff; font-weight:900; letter-spacing:.3px;
  display:flex; align-items:center; gap:8px;
}
.bonusHead .tag{display:inline-grid; place-items:center; width:26px; height:26px; border-radius:8px;
  background:linear-gradient(180deg, rgba(0,229,255,.25), rgba(0,179,255,.15)); box-shadow:0 0 18px rgba(0,229,255,.35)}
.headGlow{position:absolute; left:0; right:0; bottom:-6px; height:2px; border-radius:2px;
  background:linear-gradient(90deg, transparent, rgba(0,229,255,.85), transparent);
  box-shadow:0 0 18px rgba(0,229,255,.55);}
.muted{color:#9fb1cc;font-size:13px}

/* Container */
.spx-wrap{width:100%; display:flex; flex-wrap:wrap; gap:16px 16px; justify-content:flex-start; align-content:flex-start;
  font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}

/* Card */
.spx-card{width:240px; border-radius:var(--radius); overflow:hidden;
  background:linear-gradient(180deg,var(--bg1),var(--bg2));
  border:1px solid rgba(255,255,255,.10); box-shadow:0 12px 28px rgba(0,0,0,.45);
  display:flex; flex-direction:column; position:relative; isolation:isolate;
  transition:transform .22s ease, box-shadow .22s ease, border-color .22s ease}
.spx-card:hover{transform:translateY(-4px);box-shadow:0 18px 38px rgba(0,0,0,.6);border-color:rgba(255,255,255,.16)}

/* Sol neon şerit */
.spx-card::before{content:""; position:absolute; left:0; top:0; bottom:0; width:7px; border-radius:8px 0 0 8px; z-index:999;
  background:linear-gradient(180deg,var(--n1),var(--n2)); box-shadow:0 0 20px var(--n1),0 0 44px var(--n2),0 0 70px var(--n1)}
.spx-card::after{content:""; position:absolute; left:0; top:-8%; width:7px; height:116%; border-radius:8px; z-index:1000;
  background-image: repeating-linear-gradient(180deg, rgba(255,255,255,.95) 0 6px, rgba(255,255,255,0) 6px 18px),
                    linear-gradient(180deg, var(--n1), var(--n2));
  background-blend-mode:screen; animation:spSlide 1.35s linear infinite}
@keyframes spSlide{from{transform:translateY(0)}to{transform:translateY(18px)}}

/* Media */
.spx-media{position:relative;height:120px;overflow:hidden}
.spx-media::before{content:""; position:absolute; inset:0; background-image:var(--img);
  background-size:cover; background-position:center; filter:saturate(1.05) contrast(1.05)}
.spx-media::after{content:""; position:absolute; inset:0; background:linear-gradient(180deg,transparent 55%,rgba(10,15,28,.85))}

/* Body */
.spx-body{padding:10px 12px 12px; text-align:center}
.spx-title{margin:0 0 6px; color:var(--txt); font-weight:900; font-size:15px; letter-spacing:.2px}

/* Kod / Sayaç */
.spx-timer{margin:2px 0 6px}
.codeRow{display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap}
.spx-code{font-family:Rajdhani,system-ui,sans-serif; font-weight:900; font-size:26px; letter-spacing:1.2px; color:#f2f7ff;
  display:inline-block; padding:10px 12px; border-radius:12px; min-width:140px;
  background:linear-gradient(180deg,#0f1730,#0d1428); border:1px solid #202840;
  box-shadow: inset 0 0 22px rgba(0,0,0,.38), 0 0 22px rgba(255,255,255,.05), 0 0 28px rgba(0,229,255,.18);}
.spx-code.on{ text-shadow:0 0 14px rgba(0,229,255,.45) }
.spx-code.yellow{ color:#fff3c2; text-shadow:0 0 12px #ffda6b, 0 0 22px #ffb300 }
.spx-code.red{ color:#ffdada; text-shadow:0 0 14px #ff5c5c, 0 0 28px #ff2e2e; animation:redPulse 1.4s ease-in-out infinite }
@keyframes redPulse{0%,100%{opacity:1}50%{opacity:.55}}
.spx-code.revealFlash{animation: glowPop .9s ease-out}
@keyframes glowPop{0%{transform:scale(.96); box-shadow:0 0 0 rgba(0,229,255,0)}
 40%{transform:scale(1.04); box-shadow:0 0 26px rgba(0,229,255,.55), 0 0 52px rgba(0,179,255,.35)}
 100%{transform:scale(1.00); box-shadow:0 0 18px rgba(0,229,255,.30)}}

/* Kopyala butonu */
.copyBtn{appearance:none; border:0; cursor:pointer; border-radius:10px; padding:9px 12px; font-weight:900; font-size:12px;
  background:rgba(0,229,255,.12); color:#c8f6ff; box-shadow: inset 0 0 0 1px rgba(0,229,255,.45);}
.copyBtn:hover{ filter:brightness(1.06) }
.copyBtn:active{ transform:translateY(1px) }

/* LED scan */
.spx-scan{height:3px; margin:8px auto 8px; width:150px; border-radius:999px; opacity:.98;
  background-image: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.95) 12%, rgba(255,255,255,0) 24%),
                    linear-gradient(90deg, var(--n1), var(--n2));
  background-size:140px 100%,100% 100%; background-repeat:repeat,no-repeat; background-blend-mode:screen;
  animation:scanX 1.2s linear infinite; box-shadow:0 0 14px var(--n1),0 0 26px var(--n2)}
@keyframes scanX{from{background-position:-40px 0,0 0}to{background-position:140px 0,0 0}}

/* Max limit */
.spx-limit{margin:2px 0 8px; display:flex; align-items:center; justify-content:center; gap:6px}
.spx-limit span{color:#b2c6e9; font-weight:900; font-size:12px; letter-spacing:.5px; opacity:.9}
.spx-limit b{font-family:Rajdhani,system-ui,sans-serif; font-weight:900; font-size:18px; letter-spacing:.6px;
  background:linear-gradient(90deg,var(--n1),var(--n2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  text-shadow:0 0 14px rgba(0,229,255,.35),0 0 24px rgba(0,179,255,.28)}

/* CTA */
.spx-cta{display:block; width:100%; text-align:center; margin-top:2px; padding:10px 12px; border-radius:12px;
  color:#06121a; font-weight:900; font-size:14px; font-family:Rajdhani,system-ui,sans-serif; letter-spacing:.6px; text
