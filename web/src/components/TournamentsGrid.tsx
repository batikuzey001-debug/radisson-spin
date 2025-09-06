// web/src/components/TournamentsGrid.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/** Backend JSON ( /api/content/tournaments ) */
type TournamentCard = {
  id: number | string;
  title: string;
  image_url: string | null;
  banner_url?: string | null;
  category?: string | null;
  start_at?: string | null;   // ISO
  end_at?: string | null;     // ISO
  status?: string | null;
  /** state + countdown alanları content.py ile aynı */
  state?: "active" | "upcoming" | "idle";
  seconds_to_start?: number | null;
  seconds_left?: number | null;

  prize_pool?: number | null;
  participant_count?: number | null;

  cta_text?: string | null;
  cta_url?: string | null;

  /** tema objesi (content.py -> _theme) */
  ui?: {
    label: string;
    badgeColor: string;
    ribbonBg: string;
    ctaBg: string;
  };
  is_pinned?: boolean;
  priority?: number;
};

const API = import.meta.env.VITE_API_BASE_URL;

/* ---------- helpers ---------- */
const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtT = (total: number) => {
  const s = Math.max(0, Math.floor(total));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
};
const fmtTL = (n?: number | null) => {
  if (typeof n !== "number") return "—";
  return new Intl.NumberFormat("tr-TR").format(Math.max(0, Math.floor(n))) + " ₺";
};
const fmtLocal = (iso?: string | null) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso || ""; }
};

/** start_at varsa -> start_at - now, yoksa seconds_to_start - elapsed (drift fix) */
function calcSecondsLeft(ev: TournamentCard, nowMs: number, mountMs: number) {
  const startMs = ev.start_at ? Date.parse(ev.start_at) : NaN;
  if (Number.isFinite(startMs)) return Math.max(0, Math.floor((startMs - nowMs) / 1000));
  const base = typeof ev.seconds_to_start === "number" ? ev.seconds_to_start : 0;
  const elapsed = Math.floor((nowMs - mountMs) / 1000);
  return Math.max(0, base - elapsed);
}

/* ---------- component ---------- */
export default function TournamentsGrid() {
  const [items, setItems] = useState<TournamentCard[]>([]);
  const [err, setErr] = useState("");
  const [now, setNow] = useState<number>(Date.now());
  const mountAtRef = useRef<number>(Date.now());

  // Veri çek – kesinlikle örnek veri yok, BE'den direkt
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = `${API}/api/content/tournaments?status=published&include_future=1&window_days=30`;
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const js = (await r.json()) as TournamentCard[];
        if (alive) setItems(Array.isArray(js) ? js : []);
        setErr("");
      } catch (e: any) {
        if (alive) {
          setErr(e?.message || "Turnuvalar yüklenemedi");
          setItems([]);
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  // 1sn canlı sayaç
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const rows = useMemo(() => items, [items, now]);

  return (
    <section className="tourWrap">
      <div className="tourHead">
        <h2><span className="tag">🏆</span> Turnuvalar</h2>
        <div className="headGlow" aria-hidden />
        {err && !rows.length && <span className="muted">{err}</span>}
        {!err && !rows.length && <span className="muted">Şu an gösterilecek turnuva yok.</span>}
      </div>

      {rows.length > 0 && (
        <div className="tourList">
          {rows.map((ev) => {
            const t1 = ev.ui?.ribbonBg || "#22c55e";
            const t2 = ev.ui?.ctaBg || "#16a34a";
            const toneStyle = { ["--t1" as any]: t1, ["--t2" as any]: t2 } as React.CSSProperties;

            const prize = fmtTL(ev.prize_pool);
            const part = typeof ev.participant_count === "number" ? ev.participant_count.toLocaleString("tr-TR") : "—";

            // durum/sayaç
            const sLeft = ev.state === "upcoming" ? calcSecondsLeft(ev, now, mountAtRef.current) : 0;
            let statusLabel = "";
            let statusClass = "";
            if (sLeft > 0) {
              statusLabel = fmtT(sLeft);
              statusClass = sLeft < 3600 ? "red" : "yellow";
            } else if (ev.state === "active" || isActiveWindow(ev, now)) {
              statusLabel = "AKTİF!";
              statusClass = "live";
            }

            const endPretty = ev.end_at ? fmtLocal(ev.end_at) : "";
            const ctaUrl = ev.cta_url?.trim() || "#";
            const ctaText = ev.cta_text?.trim() || "Katıl";

            return (
              <article key={ev.id} className="tCard" style={toneStyle}>
                {/* Sol stripe */}
                <span className="stripe" aria-hidden />
                {/* Üst görsel + ribbon */}
                <header className="tMedia" style={{ ["--img" as any]: `url('${ev.image_url || ""}')` }}>
                  <span className="tRibbon"><span className="tRibTxt">{ev.ui?.label || "TURNUVA"}</span></span>
                </header>

                <div className="tBody">
                  <h3 className="tTitle" title={ev.title}>{ev.title}</h3>

                  {/* Ödül havuzu – daha büyük, gradyan */}
                  <div className="tPrize">{prize}</div>

                  {/* Sayaç / AKTİF (LED stil) */}
                  {statusLabel && (
                    <div className={`tStatus ${statusClass}`} aria-live="polite">{statusLabel}</div>
                  )}

                  {/* Katılımcı (kutusuz, vurgulu) */}
                  <div className="tPart"><span className="k">Katılımcı</span><b className="v">{part}</b></div>

                  {/* Tarama çizgisi */}
                  <div className="tScan" />

                  {/* Bitiş etiketi */}
                  {endPretty && (
                    <div className="tEnd">
                      <span className="endTag">Bitiş</span>
                      <span className="endVal">{endPretty}</span>
                    </div>
                  )}

                  {/* CTA */}
                  <a
                    className="tCta"
                    href={ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { if (!ev.cta_url) e.preventDefault(); }}
                  >
                    {ctaText}
                  </a>
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

/* aktif pencerede olup olmadığını kontrol (BE state ile uyumlu ek sigorta) */
function isActiveWindow(ev: EventCard, nowMs: number) {
  const startMs = ev.start_at ? Date.parse(ev.start_at) : NaN;
  const endMs = ev.end_at ? Date.parse(ev.end_at) : NaN;
  return Number.isFinite(startMs) && (!Number.isFinite(endMs) || nowMs <= endMs) && startMs <= nowMs;
}

/* =============== CSS =============== */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@700;800;900&family=Rajdhani:wght@700;800;900&display=swap');

:root{
  --radius:18px; --txt:#eaf2ff; --muted:#9fb1cc;
  --bg1:#0f162b; --bg2:#0a1224;
}

.tourWrap{ margin:16px 0 }
.tourHead{position:relative; display:flex; align-items:center; gap:12px; margin-bottom:12px}
.tourHead h2{margin:0; font-size:20px; color:#eaf2ff; font-weight:900; display:flex; align-items:center; gap:8px;}
.tourHead .tag{display:inline-grid; place-items:center; width:26px; height:26px; border-radius:8px;
  background:linear-gradient(180deg, rgba(35,224,108,.25), rgba(20,193,90,.15));
  box-shadow:0 0 18px rgba(35,224,108,.35)}
.headGlow{position:absolute; left:0; right:0; bottom:-6px; height:2px; border-radius:2px;
  background:linear-gradient(90deg, transparent, rgba(35,224,108,.85), transparent);
  box-shadow:0 0 18px rgba(35,224,108,.55);}
.muted{color:var(--muted);font-size:13px}

/* Grid */
.tourList{display:flex; flex-wrap:wrap; gap:16px 16px; justify-content:flex-start; align-content:flex-start;
  font-family:Inter,system-ui,sans-serif}

/* Card */
.tCard{width:240px; border-radius:var(--radius); overflow:hidden;
  background:linear-gradient(180deg,var(--bg1),var(--bg2));
  border:1px solid rgba(255,255,255,.10);
  box-shadow:0 12px 28px rgba(0,0,0,.45);
  display:flex; flex-direction:column; position:relative; isolation:isolate;
  transition:transform .22s ease, box-shadow .22s ease, border-color .22s ease}
.tCard:hover{transform:translateY(-4px); box-shadow:0 18px 38px rgba(0,0,0,.6); border-color:rgba(255,255,255,.16)}

/* Sol neon şerit */
.tCard .stripe{position:absolute; left:0; top:0; bottom:0; width:7px; border-radius:8px 0 0 8px; z-index:2;
  background:linear-gradient(180deg,var(--t1),var(--t2));
  box-shadow:0 0 20px var(--t1), 0 0 44px var(--t2), 0 0 70px var(--t1)}

/* Media */
.tMedia{position:relative; height:120px; overflow:hidden; background:#0d1428}
.tMedia::before{content:""; position:absolute; inset:0; background-image:var(--img);
  background-size:cover; background-position:center; filter:saturate(1.05) contrast(1.05)}
.tMedia::after{content:""; position:absolute; inset:0; background:linear-gradient(180deg,transparent 55%,rgba(10,15,28,.85))}
.tRibbon{position:absolute; right:-42px; top:12px; transform:rotate(45deg);
  width:136px; padding:5px 0; text-align:center; z-index:4;
  color:#071018; font-weight:900; font-size:12px; letter-spacing:.6px; text-transform:uppercase;
  background:linear-gradient(90deg,var(--t1),var(--t2));
  box-shadow:0 0 22px var(--t1), 0 0 36px var(--t2);}
.tRibbon .tRibTxt{ transform: skewX(-6deg); }

/* Body */
.tBody{padding:10px 12px 12px; text-align:center; position:relative; z-index:1}
.tTitle{margin:4px 0 6px; color:#eaf2ff; font-weight:900; font-size:15px}

/* Ödül — büyütülmüş, gradyan metin */
.tPrize{
  margin-top:2px;
  font-family:Rajdhani,sans-serif; font-weight:1000;
  font-size:clamp(26px, 3.6vw, 32px);
  letter-spacing:.06em;
  background:linear-gradient(90deg,var(--t1),var(--t2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  text-shadow:0 0 18px rgba(255,255,255,.10), 0 0 28px rgba(0,0,0,.28);
}

/* Sayaç/AKTİF — LED stil */
.tStatus{
  margin-top:6px;
  font-family:Rajdhani,sans-serif; font-weight:1000;
  font-size:clamp(16px, 2.2vw, 22px);
  letter-spacing:.10em;
  color:#eaf2ff; text-shadow:0 0 10px rgba(255,255,255,.12), 0 0 20px rgba(0,0,0,.32);
}
.tStatus.yellow{ color:#fff3c2; text-shadow:0 0 14px #ffda6b,0 0 24px #ffb300 }
.tStatus.red{ color:#ffdada; text-shadow:0 0 14px #ff5c5c,0 0 28px #ff2e2e; animation:redPulse 1.4s ease-in-out infinite }
.tStatus.live{ color:#c1ffd6; text-shadow:0 0 14px #2dd36f,0 0 26px #22c55e }
@keyframes redPulse{0%,100%{opacity:1}50%{opacity:.55}}

/* Katılımcı */
.tPart{ margin-top:6px; display:flex; gap:8px; justify-content:center; align-items:baseline }
.tPart .k{ font-size:12px; color:#cfe0ff; letter-spacing:.4px; text-transform:uppercase }
.tPart .v{ font-size:18px; color:#eaf2ff; font-weight:900 }

/* Tarama çizgisi */
.tScan{height:3px; margin:8px auto 8px; width:150px; border-radius:999px; opacity:.98;
  background-image:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.95) 12%,rgba(255,255,255,0) 24%),
                   linear-gradient(90deg,var(--t1),var(--t2));
  background-size:140px 100%,100% 100%; background-repeat:repeat,no-repeat;
  animation:scanX 1.2s linear infinite; box-shadow:0 0 14px var(--t1),0 0 26px var(--t2)}
@keyframes scanX{from{background-position:-40px 0,0 0}to{background-position:140px 0,0 0}}

/* Bitiş etiketi */
.tEnd{margin-top:6px; display:inline-flex; align-items:center; gap:8px; padding:8px 10px;
  border-radius:10px; background:rgba(12,18,36,.55);
  border:1px solid rgba(255,255,255,.10); box-shadow: inset 0 0 0 1px rgba(255,255,255,.04);}
.tEnd .endTag{padding:4px 8px; border-radius:8px; font-weight:900; font-size:11px; letter-spacing:.5px; text-transform:uppercase;
  color:#071018; background:linear-gradient(180deg,var(--t1),var(--t2))}
.tEnd .endVal{ color:#eaf2ff; font-weight:800; font-size:13px }

/* CTA */
.tCta{
  width:100%; margin-top:10px; display:block; text-align:center;
  padding:12px 16px; border-radius:12px; text-decoration:none; font-weight:900; letter-spacing:.4px; font-size:15px;
  background: linear-gradient(90deg, var(--t1), var(--t2));
  color:#071018; border:1px solid rgba(255,255,255,.12);
  box-shadow:0 8px 20px rgba(0,0,0,.25), 0 0 0 1px rgba(255,255,255,.14) inset;
}
.tCta:hover{ filter:brightness(1.06) }

/* Responsive */
@media (max-width:900px){.tCard{width:46%}}
@media (max-width:560px){.tCard{width:100%;max-width:340px}}
`;
