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

function parseAmount(label: string): number {
  const s = label.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
function colorFromAmount(v: number): { hue: number } {
  if (v >= 10000) return { hue: 48 };
  if (v >= 1000)  return { hue: 190 };
  if (v >= 100)   return { hue: 225 };
  return { hue: 280 };
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
        setBasePrizes(rows || []);
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

      const n = basePrizes.length;
      const safeIndex = (vr.targetIndex >= 0 && vr.targetIndex < n) ? vr.targetIndex : 0;
      const targetIndexInReel = (LOOPS - 2) * n + safeIndex;
      const centerOffset = (VISIBLE * ITEM_H) / 2 - ITEM_H / 2;
      const targetY = targetIndexInReel * ITEM_H - centerOffset;

      setDuration(0); setTranslate(0);
      await new Promise(r => requestAnimationFrame(() => r(null)));
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
    <main className={`slot ${spinning ? "is-spinning" : "is-idle"}`}>
      <header className="hero">
        <h1 className="title">
          <span className="stroke">RADİ</span>
          <span className="glow">ÇARK</span>
        </h1>
      </header>

      {/* Yalnız kartların döndüğü bölüm */}
      <section className="reelWrap">
        {/* LED düz çizgiler – reelWrap içine alınır */}
        <div className="uiFrame" aria-hidden />

        {/* LOGO – kartların arkasında */}
        <div className="bgLogoIn" aria-hidden />

        {/* Seçici çizgi */}
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
                <div className="neonBorder" />
                {isCenter && <div className="winBadge"><span>✓</span> KAZANDIN</div>}
                <span className="txt">{txt}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="row">
          <label className="f">
            <span>Kullanıcı Adı</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="adınız" />
          </label>
        </div>
        <div className="row">
          <label className="f">
            <span>Kod</span>
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

/* styles */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@800;900&display=swap');

:root{ --text:#fff; --muted:#9fb1cc }
*{box-sizing:border-box}
.slot{max-width:720px;margin:0 auto;padding:16px;color:var(--text);position:relative;font-family:'Poppins',system-ui,Segoe UI,Roboto,Arial,sans-serif}

.hero{text-align:center;margin:6px 0 10px}
.title{margin:0;font-weight:900;font-size:42px;letter-spacing:1.6px;line-height:1}
.title .stroke{-webkit-text-stroke:2px rgba(255,255,255,.45);color:transparent}
.title .glow{color:#e8fbff;text-shadow:0 0 26px rgba(0,229,255,.6)}

/* Reel alanı – LED şeritler görünür kalsın diye iç boşluk */
.reelWrap{
  position:relative;height:${VISIBLE * ITEM_H}px;overflow:hidden;border-radius:18px;
  background:transparent;border:1px solid rgba(255,255,255,.14);
  padding:12px 0;             /* ÜST/ALT padding (LED'ler bu alanda) */
  z-index:5;
}

/* LED düz çizgiler – padding alanının kenarında (kartlara değmez) */
.uiFrame{
  position:absolute; left:0; right:0; top:0; bottom:0;
  border-radius:18px; pointer-events:none; z-index:9;
}
.uiFrame::before,
.uiFrame::after{
  content:""; position:absolute; left:12px; right:12px; height:4px; border-radius:999px;
  background: var(--led-color);
  box-shadow:0 0 8px var(--led-glow), 0 0 14px var(--led-glow);
  animation:ledPulse 1.15s ease-in-out infinite;
}
.uiFrame::before{ top:0 }      /* padding'in üst kenarı */
.uiFrame::after { bottom:0 }   /* padding'in alt kenarı */
.slot.is-idle{ --led-color:#0dff7a; --led-glow:rgba(13,255,122,.55) }
.slot.is-spinning{ --led-color:#ff315f; --led-glow:rgba(255,49,95,.55) }
@keyframes ledPulse{ 0%,100%{opacity:1} 50%{opacity:.5} }

/* LOGO – kartların arkasında */
.bgLogoIn{
  position:absolute; inset:0; z-index:6; pointer-events:none;
  background-image:url('https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png');
  background-repeat:no-repeat; background-position:center; background-size:44vmin;
  opacity:.22; animation:logoPulse 3.4s ease-in-out infinite;
}
@keyframes logoPulse{ 0%{transform:scale(0.94)} 50%{transform:scale(1.06)} 100%{transform:scale(0.94)} }

/* Reel içerik */
.reel{position:absolute;left:0;right:0;top:0;will-change:transform;z-index:7}

/* Kart – cam + saydam tint; DIŞ kenarda neon (belirgin) */
.card{
  margin:10px 16px;height:${ITEM_H}px;border-radius:16px;display:flex;align-items:center;justify-content:center;
  font-size:24px;font-weight:900;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.85);
  background:
    linear-gradient(180deg, hsla(var(--tint,200) 95% 55% / .10), hsla(var(--tint,200) 95% 55% / .04)),
    linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.04));
  backdrop-filter: blur(3px);
  position:relative;overflow:hidden; z-index:7;
}
.neonBorder{
  content:"";position:absolute;inset:0;border-radius:16px;padding:3.5px;pointer-events:none;
  background:conic-gradient(
    from 0deg,
    hsla(var(--tint,200) 98% 60% / .98) 0 90deg,
    rgba(255,255,255,.22) 90 180deg,
    hsla(var(--tint,200) 98% 60% / .98) 180 270deg,
    rgba(255,255,255,.22) 270 360deg
  );
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor; mask-composite:exclude;
  filter:blur(2.5px);
}
.txt{position:relative;z-index:2}
.card.win{transform:scale(1.08);box-shadow:0 0 26px rgba(0,229,255,.65), 0 0 36px rgba(0,229,255,.35)}
.winBadge{
  position:absolute; top:8px; right:10px; z-index:8;
  background:linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.06));
  border:1px solid rgba(0,229,255,.65); color:#e8fbff; border-radius:10px;
  padding:4px 10px; font-size:12px; font-weight:900; letter-spacing:.4px;
  text-shadow:0 0 10px rgba(0,229,255,.35);
}

/* Seçici çizgi (düz) – en üstte */
.selectLine{
  position:absolute; left:8%; right:8%; top:50%; height:2px; z-index:10;
  background:linear-gradient(90deg,transparent,#00e5ff,transparent);
  box-shadow:0 0 12px #00e5ff; border-radius:2px;
}

/* Panel */
.panel{margin-top:14px;text-align:center}
.row{margin:8px 0}
.f{display:flex;flex-direction:column;gap:6px;align-items:center}
.f span{font-size:12px;color:var(--muted)}
input{background:#0e1730;border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:8px;padding:8px 10px;min-width:240px}
.btn{background:linear-gradient(90deg,#00e5ff,#4aa7ff);color:#001018;border:none;border-radius:8px;padding:10px 16px;font-weight:800;cursor:pointer;box-shadow:0 6px 16px rgba(0,229,255,.3)}
.msg.error{color:#ffb3c0;margin-top:4px}
`;
