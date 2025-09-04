// web/src/components/QuickBonus.tsx
import { useEffect, useMemo, useState } from "react";
import { getActivePromos, type PromoActive } from "../api/promos";

const CAT_COLORS: Record<string, string> = {
  "slots": "#FFD700",         // altın sarısı
  "live-casino": "#ff3b6b",   // kırmızı
  "sports": "#22c55e",        // yeşil
  "all": "#00e5ff",           // aqua
  "other": "#9b59b6",         // mor
};

export default function QuickBonus({ limit = 6 }: { limit?: number }) {
  const [rows, setRows] = useState<PromoActiveEx[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState<string | number | null>(null); // modal

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // aktif + upcoming
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/promos/active?limit=${limit}&include_future=1&window_hours=48`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((arr: PromoActiveEx[]) => alive && (setRows(Array.isArray(arr) ? arr : []), setErr("")))
      .catch((e) => alive && (setErr(e?.message ?? "Hata"), setRows([])))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [limit]);

  // countdown tick
  useEffect(() => {
    if (!rows.length) return;
    const t = setInterval(() => {
      setRows(prev => prev.map(p => {
        if (p.state === "upcoming") {
          const left = Math.max(0, (p.seconds_to_start ?? 0) - 1);
          // 0'a düştüğünde otomatik aktif moda ve modal aç
          if (left === 0) {
            return { ...p, state: "active", seconds_to_start: 0, seconds_left: p.seconds_left ?? 3600 }; // varsayılan 1 saat
          }
          return { ...p, seconds_to_start: left };
        }
        if (p.state === "active" && p.seconds_left != null) {
          return { ...p, seconds_left: Math.max(0, p.seconds_left - 1) };
        }
        return p;
      }));
    }, 1000);
    return () => clearInterval(t);
  }, [rows.length]);

  // otomatik modal aç (upcoming -> active dönüşen)
  useEffect(() => {
    const justUnlocked = rows.find(p => p.state === "active" && p.seconds_to_start === 0 && p.seconds_left);
    if (justUnlocked && openId == null) {
      setOpenId(justUnlocked.id);
    }
  }, [rows, openId]);

  return (
    <section className="qb">
      <div className="qb__head">
        <h2>⚡ Hızlı Bonuslar</h2>
        {!loading && !rows.length && <span className="muted">Şu an aktif/promosyon bulunamadı.</span>}
      </div>

      {loading && <SkeletonGrid />}

      {!loading && rows.length > 0 && (
        <div className="qb__grid">
          {rows.map((p) => (
            <PromoCard key={String(p.id)} p={p} onOpen={() => setOpenId(p.id)} />
          ))}
        </div>
      )}

      {/* Modal */}
      {openId != null && (
        <Modal onClose={() => setOpenId(null)}>
          {(() => {
            const cur = rows.find(x => x.id === openId);
            if (!cur) return <div className="modalBody">Kayıt bulunamadı.</div>;
            const locked = cur.state !== "active";
            return (
              <div className="modalBody">
                <div className="modalTitle">{cur.title}</div>
                {locked ? (
                  <div className="locked">Bu promosyon henüz başlamadı.</div>
                ) : (
                  <CodeBox code={cur.coupon_code || "-"} />
                )}
              </div>
            );
          })()}
        </Modal>
      )}

      <style>{css}</style>
    </section>
  );
}

type PromoActiveEx = PromoActive & {
  state?: "active" | "upcoming";
  seconds_to_start?: number | null;
};

function PromoCard({ p, onOpen }: { p: PromoActiveEx; onOpen: () => void }) {
  const color = CAT_COLORS[(p.category || "").toLowerCase()] || "#00e5ff";

  const locked = p.state !== "active";
  const t = p.state === "upcoming"
    ? fmt(p.seconds_to_start ?? 0)
    : fmt(p.seconds_left ?? 0);

  return (
    <article className="card" style={{ ["--accent" as any]: color }}>
      <div className="media" style={{ backgroundImage: p.image_url ? `url('${p.image_url}')` : undefined }} />
      <div className="body">
        <div className="row1">
          <span className="badge" style={{ background: color + "26", borderColor: color + "66", color: "#eaf2ff" }}>
            {(p.category || "all").toUpperCase()}
          </span>
          <span className={`state ${locked ? "upc" : "act"}`}>{locked ? "Yakında" : "Aktif"}</span>
        </div>

        <div className="title">{p.title}</div>

        <div className="codeRow">
          <span className={`code ${locked ? "dim" : ""}`}>{locked ? "KİLİTLİ" : (p.coupon_code || "—")}</span>
          <button className="view" onClick={onOpen}>
            {locked ? `Başlangıç: ${t.hh}:${t.mm}:${t.ss}` : "Kodu Gör"}
          </button>
        </div>
      </div>
    </article>
  );
}

function CodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(()=>setCopied(false), 1200); } catch {}
  };
  return (
    <div className="codeBox">
      <div className="c">{code}</div>
      <button onClick={copy} className="cpy">{copied ? "Kopyalandı" : "Kopyala"}</button>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modalWrap" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        {children}
      </div>
      <style>{modalCss}</style>
    </div>
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

.qb__grid{ display:grid; gap:12px; grid-template-columns:repeat(3,minmax(0,1fr)); }
@media(max-width:900px){ .qb__grid{ grid-template-columns:repeat(2,minmax(0,1fr)) } }
@media(max-width:560px){ .qb__grid{ grid-template-columns:1fr } }

.card{
  display:flex; flex-direction:column; border-radius:14px; overflow:hidden;
  background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.08);
  box-shadow:0 8px 18px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.04);
}
.media{ height:110px; background:#0f1a33; background-size:cover; background-position:center; }
.body{ padding:10px 12px; display:flex; flex-direction:column; gap:8px }
.row1{ display:flex; align-items:center; justify-content:space-between }
.badge{ padding:4px 8px; border-radius:999px; border:1px solid; font-size:12px; }
.state{ font-size:12px; color:#9fb1cc }
.state.act{ color:#22c55e }
.state.upc{ color:#ffd966 }

.title{ font-weight:800; color:#eaf2ff; font-size:15px }

.codeRow{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:space-between }
.code{
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight:900; letter-spacing:.6px; color:#001018;
  background: linear-gradient(90deg, var(--accent, #00e5ff), #6fb7ff);
  border:1px solid rgba(255,255,255,.18);
  padding:6px 10px; border-radius:10px;
}
.code.dim{ filter:grayscale(.8) brightness(.8); color:#334155; }
.view{
  padding:6px 10px; border-radius:10px; border:1px solid rgba(255,255,255,.16);
  background:rgba(255,255,255,.06); color:#eaf2ff; cursor:pointer;
}
.view:hover{ filter:brightness(1.06) }
.view:disabled{ opacity:.6; cursor:not-allowed }

/* Skeleton */
.s-card{ display:flex; flex-direction:column; border-radius:14px; overflow:hidden; background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03)); border:1px solid rgba(255,255,255,.08); padding:10px; }
.s-media{height:90px; border-radius:8px; background:linear-gradient(90deg,#0f1a33,#122244,#0f1a33); animation:sh 1.2s linear infinite}
.s-line{height:12px; border-radius:6px; margin-top:10px; background:linear-gradient(90deg,#0f1a33,#122244,#0f1a33); animation:sh 1.2s linear infinite}
.w1{width:70%} .w2{width:50%} .w3{width:40%}
@keyframes sh{ 0%{background-position:-200px 0} 100%{background-position:200px 0} }
`;

const modalCss = `
.modalWrap{position:fixed; inset:0; background:rgba(0,0,0,.6); display:grid; place-items:center; z-index:70}
.modal{position:relative; width:min(520px,96vw); background:#0f1628; border:1px solid rgba(255,255,255,.12); border-radius:16px; padding:16px; color:#eaf2ff; box-shadow:0 20px 60px rgba(0,0,0,.5)}
.close{position:absolute; right:10px; top:10px; border:none; background:transparent; color:#9fb1cc; cursor:pointer; font-size:18px}
.modalTitle{font-weight:900; margin:0 0 10px}
.locked{color:#ffd966}
.codeBox{display:flex; align-items:center; gap:10px}
.codeBox .c{
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight:900; letter-spacing:.6px; color:#001018;
  background: linear-gradient(90deg,#00e5ff,#6fb7ff); border:1px solid rgba(255,255,255,.18); padding:8px 12px; border-radius:10px;
}
.codeBox .cpy{ padding:8px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.16); background:rgba(255,255,255,.06); color:#eaf2ff; cursor:pointer }
.codeBox .cpy:hover{ filter:brightness(1.06) }
`;
