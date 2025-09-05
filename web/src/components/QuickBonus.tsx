// web/src/components/QuickBonus.tsx
import { useEffect, useMemo, useState } from "react";
import { getActivePromos, type PromoActive } from "../api/promos";

/**
 * QuickBonus (spx tasarıma uyarlanmış)
 * - Backend aynı: /api/promos/active?limit=...&include_future=1&window_hours=48
 * - Veriler: p.title, p.image_url, p.priority (Max), p.cta_url, p.state, p.seconds_left, p.seconds_to_start
 * - Tasarım: spx-* kartları (yalnızca görsel; script yok)
 */

type PromoEx = PromoActive & {
  state?: "active" | "upcoming";
  seconds_to_start?: number | null;
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
      .then((arr: PromoEx[]) => {
        if (!alive) return;
        setRows(Array.isArray(arr) ? arr : []);
        setErr("");
      })
      .catch(e => { if (alive) { setErr(e?.message ?? "Hata"); setRows([]); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [limit]);

  // Geri sayım tick (yalnızca değer varsa ilerlet)
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
        <div className="spx-wrap">
          {rows.map((p) => {
            const live = p.state === "active" && (p.seconds_left ?? 0) > 0;
            const timeText = live ? "AKTİF" : formatTimeText(p);
            const title = p.title ?? "Promo Kod";
            const img = p.image_url || "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1600&auto=format&fit=crop";
            const maxText = p.priority != null ? trNum(p.priority) : undefined;

            return (
              <article className="spx-card" key={String(p.id)}>
                <header className="spx-media" style={{ ["--img" as any]: `url('${img}')` }} />
                <div className="spx-body">
                  <h3 className="spx-title" title={title}>{title}</h3>

                  <div className="spx-statebar" title={live ? "Aktif" : "Beklemede"}>
                    <span className={`spx-dot${live ? " live" : ""}`} />
                  </div>

                  <div className="spx-timer">
                    <div className="spx-time" aria-live="polite">{timeText}</div>
                  </div>

                  <div className="spx-scan" />

                  {maxText && (
                    <div className="spx-limit">
                      <span>Max:</span> <b>{maxText}</b>
                    </div>
                  )}

                  {p.cta_url ? (
                    <a className="spx-cta" href={p.cta_url} target="_blank" rel="nofollow noreferrer">
                      Katıl
                      <svg viewBox="0 0 24 24" className="spx-ic" aria-hidden="true">
                        <path fill="currentColor" d="M9.2 16.7 9 20.7c.4 0 .6-.2.9-.4l2.1-1.7 4.3 3.1c.8.4 1.4.2 1.6-.8l2.9-13.6c.3-1.1-.4-1.6-1.2-1.3L2.7 9.9c-1 .4-1 1 0 1.3l4.9 1.5L18 6.9c.5-.3.9-.1.5.2l-9.3 8.3Z"/>
                      </svg>
                    </a>
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
function formatTimeText(p: PromoEx) {
  const s = p.state === "upcoming" ? (p.seconds_to_start ?? 0) : (p.seconds_left ?? 0);
  if (!Number.isFinite(s as number) || (s as number) <= 0) return "--:--:--";
  const { hh, mm, ss } = fmt(s as number);
  return `${hh}:${mm}:${ss}`;
}
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
function trNum(v: any) {
  try {
    const n = typeof v === "string" ? Number(v.replace(/\./g, "").replace(/,/g, ".")) : Number(v);
    return Number.isFinite(n) ? n.toLocaleString("tr-TR") : String(v ?? "");
  } catch {
    return String(v ?? "");
  }
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
            <div className="spx-statebar"><span className="spx-dot" /></div>
            <div className="spx-timer"><div className="spx-time">--:--:--</div></div>
            <div className="spx-scan" />
            <div className="spx-limit"><span>Max:</span> <b>—</b></div>
            <a className="spx-cta" href="#" onClick={e=>e.preventDefault()}>Katıl</a>
          </div>
        </article>
      ))}
    </div>
  );
}

/* ---------------- CSS (Sadece görsel) ---------------- */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@700;800;900&family=Rajdhani:wght@700;800;900&display=swap');

:root{
  --radius:18px; --txt:#eaf2ff; --muted:#9fb3d9;
  --bg1:#0f162b; --bg2:#0a1224;
  --n1:#00e5ff; --n2:#00b3ff;
  --live:#23e06c;
}

.bonusSec{margin:16px 0}
.bonusHead{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.bonusHead h2{margin:0;font-size:18px;color:#eaf2ff}
.muted{color:#9fb1cc;font-size:13px}

/* Container */
.spx-wrap{
  display:flex;flex-wrap:wrap;gap:20px;justify-content:center;
  font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif
}

/* Card */
.spx-card{
  width:280px;border-radius:var(--radius);overflow:hidden;
  background:linear-gradient(180deg,var(--bg1),var(--bg2));
  border:1px solid rgba(255,255,255,.10);
  box-shadow:0 12px 28px rgba(0,0,0,.45);
  display:flex;flex-direction:column;position:relative;isolation:isolate;
  transition:transform .22s ease, box-shadow .22s ease, border-color .22s ease
}
.spx-card:hover{transform:translateY(-4px);box-shadow:0 18px 38px rgba(0,0,0,.6);border-color:rgba(255,255,255,.16)}

/* Sol neon şerit — görselin de ÜSTÜNDE */
.spx-card::before{
  content:"";position:absolute;left:0;top:0;bottom:0;width:7px;border-radius:8px 0 0 8px;z-index:999;
  background:linear-gradient(180deg,var(--n1),var(--n2));
  box-shadow:0 0 20px var(--n1),0 0 44px var(--n2),0 0 70px var(--n1)
}
.spx-card::after{
  content:"";position:absolute;left:0;top:-8%;width:7px;height:116%;border-radius:8px;z-index:1000;
  background-image:
    repeating-linear-gradient(180deg, rgba(255,255,255,.95) 0 6px, rgba(255,255,255,0) 6px 18px),
    linear-gradient(180deg, var(--n1), var(--n2));
  background-blend-mode:screen;
  animation:spSlide 1.35s linear infinite
}
@keyframes spSlide{from{transform:translateY(0)}to{transform:translateY(18px)}}

/* Media (arka plan: --img) */
.spx-media{position:relative;height:140px;overflow:hidden}
.spx-media::before{
  content:"";position:absolute;inset:0;background-image:var(--img);
  background-size:cover;background-position:center;filter:saturate(1.05) contrast(1.05)
}
.spx-media::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(10,15,28,.85))}

/* Body */
.spx-body{padding:12px 12px 14px;text-align:center}
.spx-title{margin:0 0 6px;color:var(--txt);font-weight:900;font-size:16px;letter-spacing:.2px}

/* Durum noktası */
.spx-statebar{display:flex;align-items:center;justify-content:center;margin:2px 0 6px;height:16px}
.spx-dot{width:10px;height:10px;border-radius:50%;
  background:radial-gradient(circle at 40% 40%, var(--n1), var(--n2));
  box-shadow:0 0 10px var(--n1),0 0 20px var(--n2),0 0 30px var(--n1);
  animation:pulseDot 1.6s ease-in-out infinite}
.spx-dot.live{
  background:radial-gradient(circle at 40% 40%, var(--live), #14c15a);
  box-shadow:0 0 10px var(--live),0 0 22px #14c15a,0 0 34px var(--live)
}
@keyframes pulseDot{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}

/* Sayaç (metin backend'den gelir) */
.spx-timer{margin:2px 0 6px}
.spx-time{
  font-family:Rajdhani,system-ui,sans-serif;font-weight:900;font-size:30px;letter-spacing:1.2px;color:#f2f7ff;
  display:inline-block;padding:10px 14px;border-radius:14px;
  background:linear-gradient(180deg,#0f1730,#0d1428);border:1px solid #202840;
  box-shadow: inset 0 0 22px rgba(0,0,0,.38), 0 0 22px rgba(255,255,255,.05), 0 0 28px rgba(0,229,255,.18)
}

/* LED scan */
.spx-scan{
  height:3px;margin:8px auto 8px;width:168px;border-radius:999px;opacity:.98;
  background-image:
    linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.95) 12%, rgba(255,255,255,0) 24%),
    linear-gradient(90deg, var(--n1), var(--n2));
  background-size:140px 100%,100% 100%;background-repeat:repeat,no-repeat;background-blend-mode:screen;
  animation:scanX 1.2s linear infinite;
  box-shadow:0 0 14px var(--n1),0 0 26px var(--n2)
}
@keyframes scanX{from{background-position:-40px 0,0 0}to{background-position:140px 0,0 0}}

/* Max limit */
.spx-limit{margin:2px 0 10px;display:flex;align-items:center;justify-content:center;gap:6px}
.spx-limit span{color:#b2c6e9;font-weight:900;font-size:12px;letter-spacing:.5px;opacity:.9}
.spx-limit b{
  font-family:Rajdhani,system-ui,sans-serif;font-weight:900;font-size:20px;letter-spacing:.6px;
  background:linear-gradient(90deg,var(--n1),var(--n2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;
  text-shadow:0 0 14px rgba(0,229,255,.35),0 0 24px rgba(0,179,255,.28)
}

/* CTA */
.spx-cta{
  display:block;width:100%;text-align:center;margin-top:2px;padding:12px 14px;border-radius:12px;
  color:#06121a;font-weight:900;font-size:15px;font-family:Rajdhani,system-ui,sans-serif;letter-spacing:.6px;text-transform:uppercase;
  border:1px solid rgba(255,255,255,.12);position:relative;overflow:hidden;transition:transform .18s, filter .18s;
  background:linear-gradient(90deg,var(--n1),var(--n2));box-shadow:0 0 16px rgba(0,229,255,.35)
}
.spx-cta:hover{transform:translateY(-2px);filter:brightness(1.06)}
.spx-ic{width:18px;height:18px;margin-left:8px;vertical-align:-3px}

/* Responsive */
@media (max-width:900px){.spx-card{width:46%}}
@media (max-width:560px){.spx-card{width:100%;max-width:340px}}
`;
