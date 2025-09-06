// web/src/components/EventsGrid.tsx
import { useEffect, useMemo, useRef, useState } from "react";

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
  prize_amount?: number | null;
  /** ✅ CTA alanları (BE JSON’da gönderiliyor olmalı) */
  cta_text?: string | null;
  cta_url?: string | null;
};

const API = import.meta.env.VITE_API_BASE_URL;

const fmtTL = (n: number) =>
  new Intl.NumberFormat("tr-TR").format(Math.max(0, Math.floor(n))) + " ₺";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso || "";
  }
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function fmtT(total: number) {
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
}

/* Kategori -> renk */
function toneOf(cat?: string | null) {
  const k = (cat || "all").toLowerCase();
  switch (k) {
    case "sports":
      return { label: "SPOR", t1: "#23e06c", t2: "#14c15a" };
    case "live-casino":
      return { label: "CANLI", t1: "#ff3b3b", t2: "#ff6b6b" };
    case "slots":
      return { label: "SLOT", t1: "#f7c948", t2: "#f59e0b" };
    case "other":
      return { label: "ÖZEL", t1: "#bb86fc", t2: "#7c3aed" };
    case "all":
    default:
      return { label: "HEPSİ", t1: "#06d6ff", t2: "#118ab2" };
  }
}

/** CANLI geri sayım:
 *  1) start_at varsa -> start_at - now
 *  2) yoksa seconds_to_start - elapsed (mount'tan beri)
 */
function calcSecondsLeft(ev: EventCard, nowMs: number, mountMs: number) {
  if (ev.state !== "upcoming") return 0;
  const startMs = ev.start_at ? Date.parse(ev.start_at) : NaN;
  if (Number.isFinite(startMs)) {
    return Math.max(0, Math.floor((startMs - nowMs) / 1000));
    }
  const base = typeof ev.seconds_to_start === "number" ? ev.seconds_to_start : 0;
  const elapsed = Math.floor((nowMs - mountMs) / 1000);
  return Math.max(0, base - elapsed);
}

export default function EventsGrid() {
  const [items, setItems] = useState<EventCard[]>([]);
  const [err, setErr] = useState("");
  // Canlı sayaç için anlık zaman
  const [now, setNow] = useState<number>(Date.now());
  const mountAtRef = useRef<number>(Date.now());

  // Veri çek
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch(
          `${API}/api/events/active?limit=12&include_future=1`,
          { cache: "no-store" }
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const js = (await r.json()) as EventCard[];
        if (live) setItems(Array.isArray(js) ? js : []);
        setErr("");
      } catch (e: any) {
        setErr(e?.message || "Etkinlikler yüklenemedi");
        if (live) setItems([]);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // Her saniye yenile (sayaç için)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Re-render için memo
  const rows = useMemo(() => items, [items, now]);

  return (
    <section className="evWrap">
      <div className="evHead">
        <h2>
          <span className="tag">⚽</span> Etkinlikler
        </h2>
        <div className="headGlow" aria-hidden />
        {err && !rows.length && <span className="muted">{err}</span>}
        {!err && !rows.length && (
          <span className="muted">Şu an gösterilecek etkinlik yok.</span>
        )}
      </div>

      {rows.length > 0 && (
        <div className="evList">
          {rows.map((ev) => {
            const tone = toneOf(ev.category);
            const isUpcoming = ev.state === "upcoming";

            // CANLI geri sayım
            const sLeft = isUpcoming
              ? calcSecondsLeft(ev, now, mountAtRef.current)
              : 0;

            const prizeText =
              typeof ev.prize_amount === "number" ? fmtTL(ev.prize_amount) : "";

            const display =
              isUpcoming && sLeft > 0 ? fmtT(sLeft) : prizeText;

            const counterClass =
              isUpcoming && sLeft > 0
                ? sLeft < 3600
                  ? "red"
                  : "yellow"
                : "on";

            const endPretty = ev.end_at ? fmtDate(ev.end_at) : "";

            const ctaUrl = ev.cta_url?.trim();
            const ctaText = (ev.cta_text?.trim() || "Katıl");

            return (
              <article
                key={ev.id}
                className="evCard"
                style={
                  {
                    ["--t1" as any]: tone.t1,
                    ["--t2" as any]: tone.t2,
                  } as React.CSSProperties
                }
              >
                <span className="stripe" aria-hidden />
                <header
                  className="evMedia"
                  style={{ ["--img" as any]: `url('${ev.image_url || ""}')` }}
                >
                  <span className="evRibbon" aria-label={tone.label}>
                    <span className="ribTxt">{tone.label}</span>
                  </span>
                </header>

                <div className="evBody">
                  <h3 className="evTitle" title={ev.title}>
                    {ev.title}
                  </h3>

                  <div className="evTimer">
                    <div
                      className={`evBadge ${counterClass}`}
                      aria-live="polite"
                    >
                      {display}
                    </div>
                  </div>

                  <div className="evScan" />

                  {endPretty && (
                    <div className="evEnd">
                      <span className="endTag">Bitiş</span>
                      <span className="endVal">{endPretty}</span>
                    </div>
                  )}

                  {/* ✅ CTA butonu: API cta_url varsa çıkar; metin cta_text ya da "Katıl" */}
                  {ctaUrl ? (
                    <a
                      className="evCta"
                      href={ctaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {ctaText}
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

/* ================= CSS ================= */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@700;800;900&family=Rajdhani:wght@700;800;900&display=swap');

:root{
  --radius:18px; --txt:#eaf2ff; --muted:#9fb1cc;
  --bg1:#0f162b; --bg2:#0a1224;
}

.evWrap{ margin:16px 0 }
.evHead{position:relative; display:flex; align-items:center; gap:12px; margin-bottom:12px}
.evHead h2{margin:0; font-size:20px; color:#eaf2ff; font-weight:900; display:flex; align-items:center; gap:8px;}
.evHead .tag{display:inline-grid; place-items:center; width:26px; height:26px; border-radius:8px;
  background:linear-gradient(180deg, rgba(35,224,108,.25), rgba(20,193,90,.15));
  box-shadow:0 0 18px rgba(35,224,108,.35)}
.evHead .headGlow{position:absolute; left:0; right:0; bottom:-6px; height:2px; border-radius:2px;
  background:linear-gradient(90deg, transparent, rgba(35,224,108,.85), transparent);
  box-shadow:0 0 18px rgba(35,224,108,.55);}
.muted{color:var(--muted);font-size:13px}

.evList{display:flex; flex-wrap:wrap; gap:16px 16px; justify-content:flex-start; align-content:flex-start;
  font-family:Inter,system-ui,sans-serif}

.evCard{width:240px; border-radius:var(--radius); overflow:hidden;
  background:linear-gradient(180deg,var(--bg1),var(--bg2));
  border:1px solid rgba(255,255,255,.10);
  box-shadow:0 12px 28px rgba(0,0,0,.45);
  display:flex; flex-direction:column; position:relative; isolation:isolate;
  transition:transform .22s ease, box-shadow .22s ease, border-color .22s ease}
.evCard:hover{transform:translateY(-4px); box-shadow:0 18px 38px rgba(0,0,0,.6); border-color:rgba(255,255,255,.16)}

.evCard .stripe{position:absolute; left:0; top:0; bottom:0; width:7px; border-radius:8px 0 0 8px; z-index:2;
  background:linear-gradient(180deg,var(--t1),var(--t2));
  box-shadow:0 0 20px var(--t1), 0 0 44px var(--t2), 0 0 70px var(--t1)}
.evCard .stripe::after{content:""; position:absolute; left:0; top:-8%; width:7px; height:116%; border-radius:8px; z-index:3;
  background-image:repeating-linear-gradient(180deg, rgba(255,255,255,.95) 0 6px, rgba(255,255,255,0) 6px 18px),
                   linear-gradient(180deg, var(--t1), var(--t2));
  background-blend-mode:screen; animation:evSlide 1.35s linear infinite}
@keyframes evSlide{from{transform:translateY(0)}to{transform:translateY(18px)}}

.evMedia{position:relative; height:120px; overflow:hidden; background:#0d1428}
.evMedia::before{content:""; position:absolute; inset:0; background-image:var(--img);
  background-size:cover; background-position:center; filter:saturate(1.05) contrast(1.05)}
.evMedia::after{content:""; position:absolute; inset:0; background:linear-gradient(180deg,transparent 55%,rgba(10,15,28,.85))}
.evRibbon{position:absolute; right:-42px; top:12px; transform:rotate(45deg);
  width:136px; padding:5px 0; text-align:center; z-index:4;
  color:#071018; font-weight:900; font-size:12px; letter-spacing:.6px; text-transform:uppercase;
  background:linear-gradient(90deg,var(--t1),var(--t2));
  box-shadow:0 0 22px var(--t1), 0 0 36px var(--t2);}
.evRibbon .ribTxt{ transform: skewX(-6deg); }

.evBody{padding:10px 12px 12px; text-align:center; position:relative; z-index:1}
.evTitle{margin:4px 0 6px; color:#eaf2ff; font-weight:900; font-size:15px}

/* Rozet alanı: sayaç veya ÖDÜL */
.evTimer{margin:2px 0 6px}
.evBadge{font-family:Rajdhani,sans-serif; font-weight:900; font-size:26px; letter-spacing:1.2px;
  display:inline-block; padding:10px 12px; border-radius:12px; min-width:140px;
  background:transparent; border:none; color:var(--t1); text-shadow:0 0 14px var(--t1), 0 0 28px var(--t2)}
.evBadge.yellow{color:#fff3c2; text-shadow:0 0 12px #ffda6b,0 0 22px #ffb300}
.evBadge.red{color:#ffdada; text-shadow:0 0 14px #ff5c5c,0 0 28px #ff2e2e; animation:redPulse 1.4s ease-in-out infinite}
@keyframes redPulse{0%,100%{opacity:1}50%{opacity:.55}}

.evScan{height:3px; margin:8px auto 8px; width:150px; border-radius:999px; opacity:.98;
  background-image:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.95) 12%,rgba(255,255,255,0) 24%),
                   linear-gradient(90deg,var(--t1),var(--t2));
  background-size:140px 100%,100% 100%; background-repeat:repeat,no-repeat;
  animation:scanX 1.2s linear infinite; box-shadow:0 0 14px var(--t1),0 0 26px var(--t2)}
@keyframes scanX{from{background-position:-40px 0,0 0}to{background-position:140px 0,0 0}}

.evEnd{margin-top:6px; display:inline-flex; align-items:center; gap:8px; padding:8px 10px;
  border-radius:10px; background:rgba(12,18,36,.55);
  border:1px solid rgba(255,255,255,.10); box-shadow: inset 0 0 0 1px rgba(255,255,255,.04);}
.evEnd .endTag{padding:4px 8px; border-radius:8px; font-weight:900; font-size:11px; letter-spacing:.5px; text-transform:uppercase;
  color:#071018; background:linear-gradient(180deg,var(--t1),var(--t2))}
.evEnd .endVal{ color:#eaf2ff; font-weight:800; font-size:13px }

/* ✅ CTA butonu */
.evCta{
  margin-top:10px; display:inline-flex; align-items:center; justify-content:center;
  padding:10px 14px; border-radius:12px; text-decoration:none; font-weight:900; letter-spacing:.4px;
  background: linear-gradient(90deg, var(--t1), var(--t2));
  color:#071018; border:1px solid rgba(255,255,255,.12);
  box-shadow:0 8px 20px rgba(0,0,0,.25), 0 0 0 1px rgba(255,255,255,.14) inset;
}
.evCta:hover{ filter:brightness(1.06) }

@media (max-width:900px){.evCard{width:46%}}
@media (max-width:560px){.evCard{width:100%;max-width:340px}}
`;
