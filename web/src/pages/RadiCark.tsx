// web/src/pages/RadiCark.tsx
import { useEffect, useMemo, useState } from "react";

type Prize = { id: number; label: string; wheelIndex: number; imageUrl?: string | null };
type VerifyIn = { code: string; username: string };
type VerifyOut = { targetIndex: number; prizeLabel: string; spinToken: string; prizeImage?: string | null };
type CommitIn = { code: string; spinToken: string };

const API = import.meta.env.VITE_API_BASE_URL;
const LOOPS = 14;
const VISIBLE = 3;
const ITEM_H = 96;
const SPIN_TIME = 8.2;

/* utils */
function parseAmount(label: string): number {
  const s = label.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
function colorFromAmount(v: number): { hue: number } {
  if (v >= 10000) return { hue: 48 };   // altın
  if (v >= 1000)  return { hue: 190 };  // aqua
  if (v >= 100)   return { hue: 225 };  // mavi
  return { hue: 280 };                  // mor
}

export default function RadiCark() {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");

  const [basePrizes, setBasePrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ label: string; image?: string | null } | null>(null);

  const [translate, setTranslate] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r1 = await fetch(`${API}/api/prizes`);
        if (!r1.ok) throw new Error(`HTTP ${r1.status}`);
        const rows: Prize[] = await r1.json();
        if (!alive) return;
        const sorted = (rows || []).slice().sort((a, b) => a.wheelIndex - b.wheelIndex);
        setBasePrizes(sorted);
        setErr("");
      } catch (e: any) {
        if (alive) { setErr(e?.message ?? "Ödüller alınamadı"); setBasePrizes([]); }
      } finally { alive && setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const reelItems = useMemo(() => {
    if (!basePrizes.length) return [];
    const labels = basePrizes.map((p) => p.label);
    const arr: string[] = [];
    for (let i = 0; i < LOOPS; i++) arr.push(...labels);
    return arr;
  }, [basePrizes]);

  const onSpin = async () => {
    setErr(""); setResult(null);
    if (!username.trim() || !code.trim()) { setErr("Kullanıcı adı ve kod gerekli."); return; }
    if (!basePrizes.length) { setErr("Ödül verisi yok."); return; }
    if (spinning) return;

    try {
      setSpinning(true);
      const vr: VerifyOut = await postJson(`${API}/api/verify-spin`, { code: code.trim(), username: username.trim() } as VerifyIn);
      const baseLen = basePrizes.length;
      const targetIndexInReel = (LOOPS - 2) * baseLen + (vr.targetIndex % baseLen);
      const centerOffset = (VISIBLE * ITEM_H) / 2 - ITEM_H / 2;
      const targetY = targetIndexInReel * ITEM_H - centerOffset;

      setDuration(0); setTranslate(0);
      await raf();
      setDuration(SPIN_TIME); setTranslate(-targetY);

      setTimeout(async () => {
        try { await postJson(`${API}/api/commit-spin`, { code: code.trim(), spinToken: vr.spinToken } as CommitIn, true); } catch {}
        setResult({ label: vr.prizeLabel, image: vr.prizeImage });
        setSpinning(false);
      }, SPIN_TIME * 1000 + 120);
    } catch (e: any) {
      setErr(String(e?.message || "Spin başarısız")); setSpinning(false);
    }
  };

  return (
    <main className="slot">
      {/* SADECE LOGO – SABİT ve pulse */}
      <div className="bgLogo" aria-hidden />

      <header className="hero">
        <div className="title">RADİ ÇARK</div>
        <div className="sub">Tek sütun çark – şansını dene! 🎉</div>
      </header>

      {/* REEL */}
      <section className="reelWrap">
        <div className="mask top" />
        <div className="mask bottom" />
        <div className="selectLine" />
        <div
          className="reel"
          style={{ transform: `translateY(${translate}px)`, transition: `transform ${duration}s cubic-bezier(.12,.9,.06,1)` }}
        >
          {reelItems.map((txt, i) => {
            const amt = parseAmount(txt);
            const { hue } = colorFromAmount(amt);
            const isCenter = result && txt === result.label &&
              Math.abs(translate + (i * ITEM_H - ((VISIBLE * ITEM_H) / 2 - ITEM_H / 2))) < 1;

            return (
              <div
                key={`ri-${i}`}
                className={`card ${isCenter ? "win" : ""}`}
                style={{ height: ITEM_H, ["--tint" as any]: String(hue) } as any}
              >
                {/* statik neon çerçeve (dönmez) */}
                <div className="neonBorder" />
                {isCenter && <div className="winRibbon" />}
                <span className="txt">{txt}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* FORM */}
      <section className="panel">
        <div className="row">
          <label className="f"><span>Kullanıcı Adı</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="adınız" />
          </label>
        </div>
        <div className="row">
          <label className="f"><span>Kod</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ör. ABC123" />
          </label>
        </div>
        <div className="row">
          <button className="btn" onClick={onSpin} disabled={spinning || loading}>
            {spinning ? "Dönüyor…" : "Çarkı Çevir"}
          </button>
        </div>
        {err && <div className="msg error">⚠️ {err}</div>}
      </section>

      {result && (
        <Modal onClose={() => setResult(null)}>
          <div className="m-title">Ödül kazandınız! 🎉</div>
          <div className="m-text">Kazandığınız ödül: <b>{result.label}</b></div>
          <button className="btn" onClick={() => setResult(null)}>Kapat</button>
        </Modal>
      )}

      <style>{css}</style>
    </main>
  );
}

/* helpers */
async function postJson<T = any>(url: string, body: any, allowEmpty = false): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) { throw new Error(`HTTP ${r.status}`); }
  if (allowEmpty) {
    const txt = await r.text();
    if (!txt) return {} as T;
    try { return JSON.parse(txt) as T; } catch { return {} as T; }
  }
  return (await r.json()) as T;
}
function raf() { return new Promise((res) => requestAnimationFrame(() => res(null))); }

/* modal */
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modalWrap" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  );
}

/* styles */
const css = `
:root{ --text:#fff; --muted:#9fb1cc }
*{box-sizing:border-box}
.slot{max-width:720px;margin:0 auto;padding:16px;color:var(--text);position:relative;z-index:1}

/* LOGO background – SADECE logo (sabit), pulse */
.bgLogo{
  position:fixed; inset:0; z-index:0; pointer-events:none;
  background-image:url('https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png');
  background-repeat:no-repeat; background-position:center; background-size:42vmin;
  opacity:.14; animation:logoPulse 3.6s ease-in-out infinite;
}
@keyframes logoPulse{ 0%{transform:scale(0.95)} 50%{transform:scale(1.05)} 100%{transform:scale(0.95)} }

.hero{text-align:center;margin:8px 0 12px}
.title{font-weight:900;font-size:32px;letter-spacing:1px}
.sub{color:var(--muted)}

/* Reel */
.reelWrap{
  position:relative;height:${VISIBLE * ITEM_H}px;overflow:hidden;border-radius:16px;
  background:transparent;border:1px solid rgba(255,255,255,.10);
}
.reel{position:absolute;left:0;right:0;top:0;will-change:transform;z-index:1}

/* Kart: cam + tint; dış çerçeve neon AMA dönmez */
.card{
  margin:10px 16px;height:${ITEM_H}px;border-radius:14px;display:flex;align-items:center;justify-content:center;
  font-size:26px;font-weight:900;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.85);
  background: linear-gradient(180deg, hsla(var(--tint,200) 95% 55% / .24), hsla(var(--tint,200) 95% 55% / .10));
  backdrop-filter: blur(3px);
  position:relative;overflow:hidden;
}
/* dış çerçeve neon – statik (animasyon yok) */
.neonBorder{
  content:"";position:absolute;inset:0;border-radius:14px;padding:2px;pointer-events:none;
  background:conic-gradient(
    from 0deg,
    hsla(var(--tint,200) 98% 60% / .9) 0 90deg,
    rgba(255,255,255,.18) 90 180deg,
    hsla(var(--tint,200) 98% 60% / .9) 180 270deg,
    rgba(255,255,255,.18) 270 360deg
  );
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor; mask-composite:exclude;
  filter:blur(4px);
}
.txt{position:relative;z-index:1}
.card.win{transform:scale(1.06);box-shadow:0 0 18px rgba(0,229,255,.55)}
.winRibbon{position:absolute;left:0;right:0;top:calc(50% - 2px);height:4px;background:linear-gradient(90deg,transparent,rgba(0,229,255,.95),transparent);box-shadow:0 0 14px rgba(0,229,255,.9)}

/* Mask & Line */
.mask{position:absolute;left:0;right:0;height:${ITEM_H}px;z-index:2;background:linear-gradient(180deg,rgba(5,10,20,.92),rgba(5,10,20,0))}
.mask.top{top:0;transform:translateY(-40%)}
.mask.bottom{bottom:0;transform:translateY(40%)}
.selectLine{position:absolute;left:8%;right:8%;top:50%;height:2px;z-index:3;background:linear-gradient(90deg,transparent,#00e5ff,transparent);box-shadow:0 0 12px #00e5ff;border-radius:2px}

/* Panel */
.panel{margin-top:14px;text-align:center}
.row{margin:8px 0}
.f{display:flex;flex-direction:column;gap:6px;align-items:center}
.f span{font-size:12px;color:var(--muted)}
input{background:#0e1730;border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:8px;padding:8px 10px;min-width:240px}
.btn{background:linear-gradient(90deg,#00e5ff,#4aa7ff);color:#001018;border:none;border-radius:8px;padding:10px 16px;font-weight:800;cursor:pointer;box-shadow:0 6px 16px rgba(0,229,255,.3)}
.msg.error{color:#ffb3c0;margin-top:4px}

/* Modal */
.modalWrap{position:fixed;inset:0;background:rgba(0,0,0,.55);display:grid;place-items:center;z-index:10}
.modal{position:relative;width:min(420px,90vw);background:#0f1628;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:16px}
.m-title{font-weight:900;margin:0 0 10px}
.close{position:absolute;right:10px;top:10px;border:none;background:transparent;color:#9fb1cc;font-size:18px;cursor:pointer}
`;
