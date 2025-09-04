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

// ---------- utils ----------
function parseAmount(label: string): number {
  const s = label.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
function colorFromAmount(v: number): { hue: number; tier: "high" | "mid" | "low" | "mini" } {
  if (v >= 10000) return { hue: 48, tier: "high" };   // altın
  if (v >= 1000)  return { hue: 190, tier: "mid" };   // aqua
  if (v >= 100)   return { hue: 225, tier: "low" };   // mavi
  return { hue: 280, tier: "mini" };                  // mor
}

// ---------- page ----------
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

  // Ödüller
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
      } finally {
        alive && setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Reel içeriği: LOOPS kez tekrar
  const reelItems = useMemo(() => {
    if (!basePrizes.length) return [];
    const labels = basePrizes.map((p) => p.label);
    const arr: string[] = [];
    for (let i = 0; i < LOOPS; i++) arr.push(...labels);
    return arr;
  }, [basePrizes]);

  // Spin
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

      const baseLen = basePrizes.length;
      const targetIndexInReel = (LOOPS - 2) * baseLen + (vr.targetIndex % baseLen);
      const centerOffset = (VISIBLE * ITEM_H) / 2 - ITEM_H / 2;
      const targetY = targetIndexInReel * ITEM_H - centerOffset;

      // reset & animasyon
      setDuration(0); setTranslate(0);
      await raf();
      setDuration(SPIN_TIME); setTranslate(-targetY);

      setTimeout(async () => {
        try {
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
      {/* SADECE LOGO PULSE (sabit URL) */}
      <div
        className={`bgLogo ${spinning ? "run" : ""}`}
        style={{
          backgroundImage:
            `url('https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png')`,
        }}
        aria-hidden
      />

      <header className="hero">
        <div className="title">RADİ ÇARK</div>
        <div className="sub">Tek sütun çark – şansını dene! 🎉</div>
      </header>

      {/* REEL */}
      <section className="reelWrap">
        {/* Sabit sınır (dönmez) */}
        <div className="frame" aria-hidden />
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
            // picker merkezinde mi?
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
                {/* Neon şeritli çerçeve (animasyonlu) */}
                <div className="neonBorder" aria-hidden />
                {/* Kazanan şerit */}
                {isCenter && <div className="winRibbon" aria-hidden />}
                {/* Cam gövde */}
                <div className="glass">
                  <span className="txt">{txt}</span>
                </div>
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
  --text:#eaf2ff; --muted:#9fb1cc;
}
*{box-sizing:border-box}
.slot{max-width:720px;margin:0 auto;padding:16px;color:var(--text);position:relative;font-family:'Poppins',system-ui,Segoe UI,Roboto,Arial,sans-serif}

/* SADECE LOGO PULSE (sabit URL) */
.bgLogo{
  position:fixed; inset:0; z-index:-2; pointer-events:none;
  background-repeat:no-repeat; background-position:center; background-size:36vmin;
  opacity:.12; filter:drop-shadow(0 0 12px rgba(0,229,255,.35));
  animation:bgPulse 3.2s ease-in-out infinite;
}
.bgLogo.run{ animation-duration:1.8s; opacity:.14 }
@keyframes bgPulse{ 0%{transform:scale(0.98)} 50%{transform:scale(1.04)} 100%{transform:scale(0.98)} }

.hero{display:grid;place-items:center;margin:6px 0 10px}
.title{font-weight:800;font-size:clamp(28px,5vw,40px);letter-spacing:2px}
.sub{color:var(--muted)}

/* Reel alanı */
.reelWrap{
  position:relative; height:${VISIBLE * ITEM_H}px; overflow:hidden; border-radius:16px;
  background: rgba(6,12,26,.55);
  border:1px solid rgba(255,255,255,.10);
  box-shadow:0 12px 32px rgba(0,0,0,.35);
}
/* Sabit, sade çerçeve */
.frame{position:absolute; inset:-2px; border-radius:18px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.10); z-index:2}

.reel{position:absolute; left:0; right:0; top:0; will-change: transform; z-index:1}

/* KART: cam + belirgin tint + neon border */
.card{
  height:${ITEM_H}px; display:flex; align-items:center; justify-content:center; position:relative;
  margin:10px 16px; border-radius:14px; text-align:center;
  font-weight:900; font-size:26px; letter-spacing:.4px;
  color:#fdfdff; text-shadow:0 2px 12px rgba(0,0,0,.85);
  border:1px solid rgba(255,255,255,.12);
  background:
    linear-gradient(180deg, hsla(var(--tint, 200) 95% 55% / .25), hsla(var(--tint, 200) 95% 55% / .12)),
    linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.04));
  overflow:hidden;
}
.glass{
  position:absolute; inset:0; display:grid; place-items:center;
  background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.03));
  backdrop-filter: blur(2px);
}
.card .txt{ position:relative; z-index:1; padding:0 14px }

/* NEON ŞERİTLİ KENAR */
.neonBorder{
  pointer-events:none; position:absolute; inset:-1px; border-radius:16px;
  background: conic-gradient(from 0deg,
    rgba(0,229,255,.0) 0 20deg,
    hsla(var(--tint, 200) 98% 60% / .85) 20deg 70deg,
    rgba(255,255,255,.08) 70deg 80deg,
    rgba(255,196,0,.75) 80deg 120deg,
    rgba(0,229,255,.0) 120deg 360deg);
  filter: blur(6px);
  animation: borderSpin 2.4s linear infinite;
}
@keyframes borderSpin{ from{transform:rotate(0)} to{transform:rotate(360deg)} }

/* TIER micro tweaks */
.card.high{ box-shadow:0 8px 24px rgba(255,196,0,.20) inset }
.card.mid { box-shadow:0 8px 24px rgba(0,229,255,.18) inset }
.card.low { box-shadow:0 8px 24px rgba(120,170,255,.14) inset }
.card.mini{ box-shadow:0 8px 24px rgba(255,255,255,.10) inset }

/* Kazanan şerit – daha belirgin */
.winRibbon{
  position:absolute; left:-12%; right:-12%; top:calc(50% - 18px); height:36px; z-index:1;
  background:linear-gradient(90deg, transparent, rgba(0,229,255,.98), transparent);
  box-shadow:0 0 22px rgba(0,229,255,.85), 0 0 30px rgba(0,229,255,.55);
  border-radius:10px;
}
.card.win{ transform:scale(1.07); box-shadow: 0 0 0 2px rgba(255,255,255,.16), 0 18px 36px rgba(0,0,0,.35) }

/* Maskeler ve picker çizgisi */
.mask{position:absolute; left:0; right:0; height:${ITEM_H}px; z-index:3;
  background:linear-gradient(180deg, rgba(5,10,20,.92), rgba(5,10,20,0));
  pointer-events:none;
}
.mask.top{top:0; transform:translateY(-38%)}
.mask.bottom{bottom:0; transform:translateY(38%)}
.selectLine{position:absolute; left:10%; right:10%; top:calc(50% - 1px); height:2px; z-index:4;
  background:linear-gradient(90deg, transparent, rgba(0,229,255,1), transparent);
  box-shadow:0 0 16px rgba(0,229,255,.85); border-radius:2px; pointer-events:none}

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

// ---------- helpers ----------
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
