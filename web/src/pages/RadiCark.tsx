// web/src/pages/RadiCark.tsx
import { useEffect, useMemo, useState } from "react";

/**
 * Tek Sütun Çark – UI içi logo, saydam kartlar, neon çerçeve
 * - Arkaplan LOGO: reel'in içinde (kartların arkasında) pulse
 * - Yalnızca kartların döndüğü bölüm, LED çerçeve içinde
 * - LED çerçeve: Beklerken YEŞİL, dönerken KIRMIZI
 * - Başlık "ÇARK" LED şeridinin ÜSTÜNDE badge olarak
 * - Kart içi cam + daha saydam tint, kart DIŞ kenarı neon (statik, dönmez)
 */

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
    <main className={`slot ${spinning ? "is-spinning" : "is-idle"}`}>
      <header className="hero">
        <h1 className="title">
          <span className="stroke">RADİ</span>
          <span className="glow">ÇARK</span>
        </h1>
      </header>

      {/* Yalnızca kartların döndüğü alan – UI frame ve logo BU alanın içinde */}
      <section className="reelWrap">
        {/* LED çerçeve (yalnızca reel alanını sarar) */}
        <div className="uiFrame" aria-hidden />
        {/* Başlık rozet – şeridin üstünde dursun */}
        <div className="titleBadge">ÇARK</div>

        {/* LOGO – oyun UI içinde, kartların ARKASINDA */}
        <div className="bgLogoIn" aria-hidden />

        {/* Sadece seçici çizgi */}
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
                {/* Neon çerçeve – statik (dönmez) ve DIŞ kenarda */}
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
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@800;900&display=swap');

:root{ --text:#fff; --muted:#9fb1cc }
*{box-sizing:border-box}
.slot{max-width:720px;margin:0 auto;padding:16px;color:var(--text);position:relative;font-family:'Poppins',system-ui,Segoe UI,Roboto,Arial,sans-serif}

/* Başlık */
.hero{text-align:center;margin:6px 0 10px}
.title{margin:0;font-weight:900;font-size:40px;letter-spacing:1.5px;line-height:1}
.title .stroke{-webkit-text-stroke:2px rgba(255,255,255,.35);color:transparent}
.title .glow{color:#def6ff;text-shadow:0 0 18px rgba(0,229,255,.45)}

/* Reel alanı – sadece kartların döndüğü bölüm çerçeveli */
.reelWrap{
  position:relative;height:${VISIBLE * ITEM_H}px;overflow:hidden;border-radius:18px;
  background:transparent;border:1px solid rgba(255,255,255,.10);
}

/* LED çerçeve içte – beklerken yeşil, dönerken kırmızı */
.uiFrame{
  position:absolute; inset:0; border-radius:18px; pointer-events:none; z-index:3;
}
.uiFrame::before,
.uiFrame::after{
  content:""; position:absolute; left:10px; right:10px; height:4px; border-radius:999px;
  background:
    radial-gradient(circle at 8px 50%, var(--led-color) 0 4px, transparent 5px) repeat-x left center / 28px 4px;
  filter:drop-shadow(0 0 6px var(--led-glow));
  animation:ledBlink 1.15s ease-in-out infinite;
}
.uiFrame::before{ top:6px }
.uiFrame::after { bottom:6px }
.slot.is-idle{ --led-color:#13ff77; --led-glow:rgba(19,255,119,.55) }
.slot.is-spinning{ --led-color:#ff3b6b; --led-glow:rgba(255,59,107,.55) }
@keyframes ledBlink{ 0%,100%{opacity:.9} 50%{opacity:.35} }

/* Başlık badge – LED şeridin üstünde */
.titleBadge{
  position:absolute; top:-12px; left:50%; transform:translateX(-50%);
  background:linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.04));
  border:1px solid rgba(255,255,255,.18); border-radius:999px;
  padding:6px 14px; font-weight:900; letter-spacing:.6px; color:#eaf6ff;
  text-shadow:0 0 10px rgba(0,229,255,.35); backdrop-filter:blur(2px); z-index:4;
}

/* LOGO – oyun UI içinde, kartların ARKASINDA */
.bgLogoIn{
  position:absolute; inset:0; z-index:0; pointer-events:none;
  background-image:url('https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png');
  background-repeat:no-repeat; background-position:center; background-size:44vmin;
  opacity:.22; animation:logoPulse 3.4s ease-in-out infinite;
}
@keyframes logoPulse{ 0%{transform:scale(0.94)} 50%{transform:scale(1.06)} 100%{transform:scale(0.94)} }

/* Reel içerik */
.reel{position:absolute;left:0;right:0;top:0;will-change:transform;z-index:2}

/* Kart: cam + DAHA saydam tint; DIŞ kenarda neon (statik) */
.card{
  margin:10px 16px;height:${ITEM_H}px;border-radius:16px;display:flex;align-items:center;justify-content:center;
  font-size:24px;font-weight:900;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.85);
  background:
    linear-gradient(180deg, hsla(var(--tint,200) 95% 55% / .14), hsla(var(--tint,200) 95% 55% / .06)),
    linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.04));
  backdrop-filter: blur(3px);
  position:relative;overflow:hidden;
}
.neonBorder{
  content:"";position:absolute;inset:0;border-radius:16px;padding:2px;pointer-events:none;
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

/* Sadece seçici çizgi */
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
