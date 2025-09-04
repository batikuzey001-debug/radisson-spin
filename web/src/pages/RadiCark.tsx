// web/src/pages/RadiCark.tsx
import { useEffect, useMemo, useRef, useState } from "react";

type Prize = { id: number; label: string; wheelIndex: number; imageUrl?: string | null };
type VerifyIn = { code: string; username: string };
type VerifyOut = { targetIndex: number; prizeLabel: string; spinToken: string; prizeImage?: string | null };
type CommitIn = { code: string; spinToken: string };
type HeaderConfig = { logo_url?: string };

const API = import.meta.env.VITE_API_BASE_URL;

const LOOPS = 14;
const VISIBLE = 3;
const ITEM_H = 96;
const SPIN_TIME = 8.2;

/** Label içinden tutar tahmini (örn. "10.000 TL" → 10000) */
function parseAmount(label: string): number {
  const s = label.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
function colorFromAmount(v: number): { hue: number; tier: "high" | "mid" | "low" | "mini" } {
  if (v >= 10000) return { hue: 48, tier: "high" };
  if (v >= 1000)  return { hue: 190, tier: "mid" };
  if (v >= 100)   return { hue: 225, tier: "low" };
  return { hue: 280, tier: "mini" };
}

export default function RadiCark() {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");

  const [basePrizes, setBasePrizes] = useState<Prize[]>([]);
  const [logoUrl, setLogoUrl] = useState<string>("/static/logo.png"); // yedek logo
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

        try {
          const r2 = await fetch(`${API}/api/site/header`);
          if (r2.ok) {
            const cfg: HeaderConfig = await r2.json();
            const l = (cfg?.logo_url || "").trim();
            if (l) setLogoUrl(l);
          }
        } catch {/* boş geç */}
        setErr("");
      } catch (e: any) {
        if (alive) { setErr(e?.message ?? "Ödüller alınamadı"); setBasePrizes([]); }
      } finally {
        alive && setLoading(false);
      }
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

      const vr: VerifyOut = await postJson(`${API}/api/verify-spin`, {
        code: code.trim(), username: username.trim(),
      } as VerifyIn);

      // HEDEF POZİSYON
      const baseLen = basePrizes.length;
      const targetIndexInReel = (LOOPS - 2) * baseLen + (vr.targetIndex % baseLen);
      const centerOffset = (VISIBLE * ITEM_H) / 2 - ITEM_H / 2;
      const targetY = targetIndexInReel * ITEM_H - centerOffset;

      // reset
      setDuration(0); setTranslate(0);
      await raf();
      // animasyon
      setDuration(SPIN_TIME);
      setTranslate(-targetY);

      setTimeout(async () => {
        try {
          // commit-spin bazı ortamlarda 204/boş gövde dönebiliyor – flexible parse kullanıyoruz
          await postJson(`${API}/api/commit-spin`, { code: code.trim(), spinToken: vr.spinToken } as CommitIn, true);
        } catch {}
        setResult({ label: vr.prizeLabel, image: vr.prizeImage });
        setSpinning(false);
      }, SPIN_TIME * 1000 + 120);
    } catch (e: any) {
      setErr(String(e?.message || "Spin başarısız"));
      setSpinning(false);
    }
  };

  return (
    <main className="slot">
      {/* SADECE LOGO PULSE */}
      <div className={`bgLogo ${spinning ? "run" : ""}`} style={{ backgroundImage: `url('${logoUrl}')` }} aria-hidden />

      <header className="hero">
        <div className="title">RADİ ÇARK</div>
        <div className="sub">Tek sütun çark – şansını dene! 🎉</div>
      </header>

      <section className="reelWrap">
        {/* SABİT border (dönmüyor) */}
        <div className="neon" aria-hidden />
        <div className="mask top" />
        <div className="mask bottom" />
        <div className="selectLine" />

        <div
          className="reel"
          style={{
            transform: `translateY(${translate}px)`,
            transition: `transform ${duration}s cubic-bezier(.12,.9,.06,1)`,
          }}
        >
          {reelItems.map((txt, i) => {
            const amt = parseAmount(txt);
            const { hue, tier } = colorFromAmount(amt);
            const isCenter =
              result && txt === result.label &&
              Math.abs(translate + (i * ITEM_H - ((VISIBLE * ITEM_H) / 2 - ITEM_H / 2))) < 1;

            return (
              <div
                key={`ri-${i}`}
                className={`card ${tier} ${isCenter ? "win" : ""}`}
                style={{ height: ITEM_H, ["--tint" as any]: String(hue) } as any}
                title={txt}
              >
                {isCenter && <div className="winRibbon" aria-hidden />}
                <div className="glass">
                  <span className="txt">{txt}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

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
          {result.image && <img className="m-img" src={result.image} alt="" />}
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
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try { const js = await r.json(); if (js?.detail) msg = js.detail; } catch {}
    throw new Error(msg);
  }
  if (allowEmpty) {
    const txt = await r.text();
    if (!txt) return {} as T;
    try { return JSON.parse(txt) as T; } catch { return {} as T; }
  }
  return (await r.json()) as T;
}
function raf() { return new Promise((res) => requestAnimationFrame(() => res(null))); }

/* styles */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&display=swap');

:root{
  --bg1:#0b1224; --bg2:#0e1a33; --text:#eaf2ff; --muted:#9fb1cc;
}
*{box-sizing:border-box}
.slot{max-width:720px;margin:0 auto;padding:16px;color:var(--text);position:relative;font-family:'Poppins',system-ui,Segoe UI,Roboto,Arial,sans-serif}

/* SADECE LOGO PULSE */
.bgLogo{
  position:fixed; inset:0; z-index:-2; pointer-events:none;
  background-repeat:no-repeat; background-position:center; background-size:36vmin;
  opacity:.09; filter:drop-shadow(0 0 12px rgba(0,229,255,.35));
  animation:bgPulse 3.2s ease-in-out infinite;
}
.bgLogo.run{ animation-duration:1.8s; opacity:.12 }
@keyframes bgPulse{ 0%{transform:scale(0.98)} 50%{transform:scale(1.04)} 100%{transform:scale(0.98)} }

.hero{display:grid;place-items:center;margin:6px 0 10px}
.title{font-weight:800;font-size:clamp(28px,5vw,40px);letter-spacing:2px}
.sub{color:#9fb1cc}

/* Reel alanı */
.reelWrap{
  position:relative; height:${VISIBLE * ITEM_H}px; overflow:hidden; border-radius:16px;
  background: rgba(6,12,26,.55);
  border:1px solid rgba(255,255,255,.10);
  box-shadow:0 12px 32px rgba(0,0,0,.35);
}

/* SABİT border */
.neon{pointer-events:none; position:absolute; inset:-2px; border-radius:18px;
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
  z-index:2;
}

.reel{position:absolute; left:0; right:0; top:0; will-change: transform; z-index:1}

/* Kartlar */
.card{
  height:${ITEM_H}px; display:flex; align-items:center; justify-content:center; position:relative;
  margin:10px 16px; border-radius:14px; text-align:center;
  font-weight:800; font-size:22px; letter-spacing:.3px;
  color:#fdfdff; text-shadow:0 2px 10px rgba(0,0,0,.8);
  border:1px solid rgba(255,255,255,.10);
  background:
    linear-gradient(180deg, hsla(var(--tint, 200) 90% 55% / .14), hsla(var(--tint, 200) 90% 55% / .08)),
    linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03));
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);
  overflow:hidden;
}
.glass{position:absolute; inset:0; display:grid; place-items:center;
  background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.02));
  backdrop-filter: blur(2px);
}
.card .txt{ position:relative; z-index:1; padding:0 14px }

/* Kazanan şerit – sade/markaya uygun */
.winRibbon{
  position:absolute; left:-12%; right:-12%; top:calc(50% - 18px); height:36px; z-index:1;
  background:linear-gradient(90deg, transparent, rgba(0,229,255,.95), transparent);
  box-shadow:0 0 18px rgba(0,229,255,.65), 0 0 26px rgba(0,229,255,.45);
  border-radius:10px;
}
.card.win{ transform:scale(1.07); box-shadow: 0 0 0 2px rgba(255,255,255,.14), 0 18px 36px rgba(0,0,0,.35) }

/* Maskeler ve picker çizgisi */
.mask{position:absolute; left:0; right:0; height:${ITEM_H}px; z-index:3;
  background:linear-gradient(180deg, rgba(5,10,20,.92), rgba(5,10,20,0));
  pointer-events:none;
}
.mask.top{top:0; transform:translateY(-38%)}
.mask.bottom{bottom:0; transform:translateY(38%)}
.selectLine{position:absolute; left:10%; right:10%; top:calc(50% - 1px); height:2px; z-index:4;
  background:linear-gradient(90deg, transparent, rgba(0,229,255,.98), transparent);
  box-shadow:0 0 14px rgba(0,229,255,.75); border-radius:2px; pointer-events:none}

/* Form */
.panel{margin-top:14px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;justify-content:center;margin-bottom:10px}
.f{display:flex;flex-direction:column;gap:6px}
.f span{font-size:12px;color:#9fb1cc}
input{background:#0e1730;border:1px solid rgba(255,255,255,.12);color:#eaf2ff;border-radius:10px;padding:10px 12px;min-width:260px}
.btn{background:linear-gradient(90deg,#00e5ff,#4aa7ff); color:#001018; border:none;border-radius:10px; padding:12px 16px; font-weight:900; cursor:pointer; box-shadow:0 8px 22px rgba(0,229,255,.25)}
.msg.error{color:#ffb3c0;margin-top:4px}

/* Modal */
.modalWrap{position:fixed; inset:0; background:rgba(0,0,0,.55); display:grid; place-items:center; z-index:50}
.modal{position:relative; width:min(440px,92vw); background:#0f1628; border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:16px}
.m-title{font-weight:800;margin:0 0 10px}
.m-img{width:100%; height:140px; object-fit:cover; border-radius:10px; margin-bottom:8px}
.close{position:absolute;right:10px;top:10px;border:none;background:transparent;color:#9fb1cc;font-size:18px;cursor:pointer}
`;
/* Modal */
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
