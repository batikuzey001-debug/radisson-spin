// web/src/components/QuickBonus.tsx
import { useEffect, useRef, useState } from "react";
import { type PromoActive } from "../api/promos";

/**
 * QuickBonus — Promo Kodlar
 * - Countdown: kutusuz LED dijital stil (T<1saat = kırmızı, aksi = sarı).
 * - Kod: GERİ SAYIM BİTİNCE çerçeveli kutu içinde büyük görünür.
 * - Max kişi: her kartta kutusuz, dikkat çekici.
 * - CTA: BE'den (cta_text/cta_url). Sol şerit aqua neon.
 * - Simetri: Kod ve geri sayım aynı yükseklik/genişlik alanını kaplar.
 * - Şerit: Max kişi ile geri sayım/kod arasına yerleştirildi.
 */

type PromoEx = PromoActive & {
  state?: "active" | "upcoming";
  seconds_to_start?: number | null;
  seconds_left?: number | null;
  code?: string | null;
  promo_code?: string | null;
  coupon_code?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  participant_count?: number | null;
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

  // sayaç 0 -> kod görünümü için kısa parıltı
  useEffect(() => {
    const toFlash: string[] = [];
    rows.forEach(p => {
      const id = String(p.id);
      const prevSec = prevSecsRef.current[id];
      const nowSecStart = p.state === "upcoming" ? (p.seconds_to_start ?? 0) : undefined;
      if (prevSec != null && prevSec > 0 && nowSecStart === 0) toFlash.push(id);
      prevSecsRef.current[id] = p.state === "upcoming" ? (p.seconds_to_start ?? 0) : (p.seconds_left ?? 0);
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
            const s = Math.max(0, Math.floor(p.seconds_to_start ?? 0));
            const showCountdown = isUpcoming && s > 0;

            const codeText = (p.promo_code || p.coupon_code || p.code || "").toString().trim();
            const displayText = showCountdown ? fmt(s) : (codeText || p.title || "KOD");

            const img = p.image_url || "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1600&auto=format&fit=crop";
            const idStr = String(p.id);
            const doFlash = !!flashIds[idStr] && !showCountdown;

            // countdown LED renk
            let ledClass = "";
            if (showCountdown) ledClass = s < 3600 ? "led red" : "led yellow";

            const ctaUrl = p.cta_url?.trim();
            const ctaText = p.cta_text?.trim() || "Katıl";

            const maxCount = p.participant_count;
            const maxLine = typeof maxCount === "number" ? maxCount : undefined;

            const isCodeVisible = !showCountdown;

            return (
              <article className="spx-card" key={idStr}>
                <header className="spx-media" style={{ ["--img" as any]: `url('${img}')` }} />
                <div className="spx-body">
                  <h3 className="spx-title" title={p.title ?? "Promo Kod"}>{p.title ?? "Promo Kod"}</h3>

                  {/* Max kişi — her kartta kutusuz */}
                  {maxLine != null && (
                    <div className="maxLine">
                      <span className="maxLabel">Max</span>
                      <span className="maxValue">{trNum(maxLine)}</span>
                    </div>
                  )}

                  {/* NEON ŞERİT (scan) — Max ile geri sayım/kod arasına */}
                  <div className="scanLine" />

                  {/* Kod veya geri sayım — aynı alanı kaplayan slot */}
                  <div className="monoRow">
                    <span className="monoSlot">
                      {isCodeVisible ? (
                        <span className={`codeBox ${doFlash ? "reveal" : ""}`} aria-live="polite">
                          {displayText}
                        </span>
                      ) : (
                        <span className={`monoText ${ledClass}`} aria-live="polite">
                          {displayText}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* CTA */}
                  {ctaUrl ? (
                    <a className="spx-cta" href={ctaUrl} target="_blank" rel="nofollow noopener" title={ctaText}>
                      {ctaText}
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
function fmt(total: number) {
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
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
            <div className="maxLine"><span className="maxLabel">Max</span><span className="maxValue">—</span></div>
            <div className="scanLine" />
            <div className="monoRow"><span className="monoSlot"><span className="monoText led">--:--:--</span></span></div>
            <a className="spx-cta" href="#" onClick={e=>e.preventDefault()}>Katıl</a>
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
  --monoH: 46px;              /* kod/geri sayım slot yüksekliği */
}

.bonusSec{margin:16px 0}
.bonusHead{position:relative; display:flex; align-items:center; gap:12px; margin-bottom:12px}
.bonusHead h2{margin:0; font-size:20px; color:#eaf2ff; font-weight:900; letter-spacing:.3px; display:flex; align-items:center; gap:8px;}
.bonusHead .tag{display:inline-grid; place-items:center; width:26px; height:26px; border-radius:8px;
  background:linear-gradient(180deg, rgba(0,229,255,.25), rgba(0,179,255,.15)); box-shadow:0 0 18px rgba(0,229,255,.35)}
.headGlow{position:absolute; left:0; right:0; bottom:-6px; height:2px; border-radius:2px;
  background:linear-gradient(90deg, transparent, rgba(0,229,255,.85), transparent);
  box-shadow:0 0 18px rgba(0,229,255,.55);}
.muted{color:#9fb3d9;font-size:13px}

/* Container */
.spx-wrap{width:100%; display:flex; flex-wrap:wrap; gap:16px 16px; justify-content:flex-start; align-content:flex-start;
  font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}

/* Card */
.spx-card{width:240px; border-radius:var(--radius); overflow:hidden;
  background:linear-gradient(180deg,var(--bg1),var(--bg2));
  border:1px solid rgba(255,255,255,.10); box-shadow:0 12px 28px rgba(0,0,0,.45);
  display:flex; flex-direction:column; position:relative; isolation:isolate;
  transition:transform .22s ease, box-shadow .22s ease, border-color .22s ease}
.spx-card:hover{transform:translateY(-4px); box-shadow:0 18px 38px rgba(0,0,0,.6); border-color:rgba(255,255,255,.16)}

/* Sol neon şerit */
.spx-card::before{content:""; position:absolute; left:0; top:0; bottom:0; width:7px; border-radius:8px 0 0 8px; z-index:999;
  background:linear-gradient(180deg,var(--n1),var(--n2)); box-shadow:0 0 20px var(--n1),0 0 44px var(--n2),0 0 70px var(--n1)}
.spx-card::after{content:""; position:absolute; left:0; top:-8%; width:7px; height:116%; border-radius:8px; z-index:1000;
  background-image: repeating-linear-gradient(180deg, rgba(255,255,255,.95) 0 6px, rgba(255,255,255,0) 6px 18px),
                    linear-gradient(180deg, var(--n1),var(--n2));
  background-blend-mode:screen; animation:spSlide 1.35s linear infinite}
@keyframes spSlide{from{transform:translateY(0)}to{transform:translateY(18px)}}

/* Media */
.spx-media{position:relative;height:120px;overflow:hidden}
.spx-media::before{content:""; position:absolute; inset:0; background-image:var(--img);
  background-size:cover; background-position:center; filter:saturate(1.05) contrast(1.05)}
.spx-media::after{content:""; position:absolute; inset:0; background:linear-gradient(180deg,transparent 55%,rgba(10,15,28,.85))}

/* Body */
.spx-body{padding:10px 12px 12px; text-align:center}
.spx-title{margin:0 0 6px; color:#eaf2ff; font-weight:900; font-size:15px; letter-spacing:.2px}

/* Max kişi — kutusuz, güçlü vurgu */
.maxLine{ margin:4px 0 2px; display:flex; align-items:baseline; justify-content:center; gap:8px }
.maxLabel{ font-size:12px; letter-spacing:.5px; text-transform:uppercase; color:#9ec8ff }
.maxValue{
  font-family:Rajdhani,system-ui; font-weight:1000; font-size:26px; letter-spacing:.04em;
  background:linear-gradient(90deg,var(--n1),var(--n2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  text-shadow:0 0 16px rgba(0,229,255,.35), 0 0 28px rgba(0,179,255,.25);
}

/* NEON scan — max ile sayaç/kod arasında */
.scanLine{height:3px; margin:6px auto 6px; width:150px; border-radius:999px; opacity:.98;
  background-image:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.95) 12%,rgba(255,255,255,0) 24%),
                   linear-gradient(90deg,var(--n1),var(--n2));
  background-size:140px 100%,100% 100%; background-repeat:repeat,no-repeat;
  animation:scanX 1.2s linear infinite; box-shadow:0 0 14px var(--n1),0 0 26px var(--n2)}
@keyframes scanX{from{background-position:-40px 0,0 0}to{background-position:140px 0,0 0}}

/* Sayaç/Kod alanı — simetrik slot */
.monoRow{display:flex; align-items:center; justify-content:center; margin:2px 0 6px}
.monoSlot{height:var(--monoH); display:flex; align-items:center; justify-content:center; min-width:160px}
.monoText,
.codeBox{
  height:var(--monoH);
  display:flex; align-items:center; justify-content:center;
  padding:0 14px; box-sizing:border-box;
  font-family:Rajdhani,system-ui,sans-serif; font-weight:1000; font-size:26px;
  letter-spacing:.05em;
}
/* LED dijital sayaç */
.monoText{ color:#eaf2ff; text-shadow:0 0 10px rgba(0,229,255,.22); }
.monoText.led.yellow{ color:#fff3c2; text-shadow:0 0 10px #ffd76a, 0 0 18px #ffb300 }
.monoText.led.red{ color:#ffdada; text-shadow:0 0 10px #ff5c5c, 0 0 18px #ff2e2e }
.reveal{ animation:revealPulse .9s ease-out }
@keyframes revealPulse{
  0%{ transform:scale(.98); text-shadow:0 0 0 rgba(0,229,255,0) }
  50%{ transform:scale(1.04); text-shadow:0 0 18px rgba(0,229,255,.6) }
  100%{ transform:scale(1.00); text-shadow:0 0 12px rgba(0,229,255,.3) }
}

/* KOD kutusu (sadece kod görünürken) */
.codeBox{
  color:#f2f7ff;
  background:linear-gradient(180deg,#0f1730,#0d1428);
  border:1px solid #202840;
  border-radius:12px;
  box-shadow: inset 0 0 22px rgba(0,0,0,.38), 0 0 22px rgba(255,255,255,.05), 0 0 28px rgba(0,229,255,.18);
}

/* CTA */
.spx-cta{display:block; width:100%; text-align:center; margin-top:2px; padding:10px 12px; border-radius:12px;
  color:#06121a; font-weight:900; font-size:14px; font-family:Rajdhani,system-ui,sans-serif; letter-spacing:.6px; text-transform:uppercase;
  border:1px solid rgba(255,255,255,.12); position:relative; overflow:hidden; transition:transform .18s, filter .18s;
  background:linear-gradient(90deg,var(--n1),var(--n2)); box-shadow:0 0 16px rgba(0,229,255,.35)}
.spx-cta:hover{transform:translateY(-2px); filter:brightness(1.06)}
.spx-ic{width:18px;height:18px;margin-left:8px;vertical-align:-3px}

/* Responsive */
@media (max-width:900px){.spx-card{width:46%}}
@media (max-width:560px){.spx-card{width:100%;max-width:340px}}
`;
