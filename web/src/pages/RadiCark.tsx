// web/src/pages/RadiCark.tsx
import { useEffect, useMemo, useState } from "react";

type Prize = { id: number; label: string; wheelIndex: number };
type VerifyIn = { code: string; username: string };
type VerifyOut = { targetIndex: number; prizeLabel: string; spinToken: string };
type CommitIn = { code: string; spinToken: string };

const API = import.meta.env.VITE_API_BASE_URL;

const LOOPS = 14;
const VISIBLE = 3;
const ITEM_H = 90;
const SPIN_TIME = 7.5;

export default function RadiCark() {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const [translate, setTranslate] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API}/api/prizes`);
        const rows: Prize[] = await r.json();
        setPrizes(rows.sort((a, b) => a.wheelIndex - b.wheelIndex));
      } catch (e: any) {
        setErr(e?.message ?? "Ödüller alınamadı");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reelItems = useMemo(() => {
    if (!prizes.length) return [];
    const labels = prizes.map((p) => p.label);
    const arr: string[] = [];
    for (let i = 0; i < LOOPS; i++) arr.push(...labels);
    return arr;
  }, [prizes]);

  const onSpin = async () => {
    setErr(""); setResult(null);
    if (!username.trim() || !code.trim()) { setErr("Kullanıcı adı ve kod gerekli."); return; }
    if (!prizes.length) { setErr("Ödül verisi yok."); return; }
    if (spinning) return;
    try {
      setSpinning(true);
      const vr: VerifyOut = await postJson(`${API}/api/verify-spin`, { code, username } as VerifyIn);
      const n = prizes.length;
      const safeIndex = (vr.targetIndex >= 0 && vr.targetIndex < n) ? vr.targetIndex : 0;
      const targetIndexInReel = (LOOPS - 2) * n + safeIndex;
      const centerOffset = (VISIBLE * ITEM_H) / 2 - ITEM_H / 2;
      const targetY = targetIndexInReel * ITEM_H - centerOffset;

      setDuration(0); setTranslate(0);
      await new Promise(r => requestAnimationFrame(() => r(null)));
      setDuration(SPIN_TIME); setTranslate(-targetY);

      setTimeout(async () => {
        try { await postJson(`${API}/api/commit-spin`, { code, spinToken: vr.spinToken } as CommitIn, true); } catch {}
        setResult(vr.prizeLabel);
        setSpinning(false);
      }, SPIN_TIME * 1000 + 150);
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

      <section className="reelWrap">
        <div className="uiFrame" />
        <div className="bgLogoIn" />
        <div className="selectLine" />
        <div
          className="reel"
          style={{ transform: `translateY(${translate}px)`, transition: `transform ${duration}s cubic-bezier(.12,.9,.06,1)` }}
        >
          {reelItems.map((txt, i) => {
            const isCenter = result && txt === result;
            return (
              <div key={i} className={`item ${isCenter ? "win" : ""}`} style={{ height: ITEM_H }}>
                {txt}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Kullanıcı Adı" />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Kod" />
        <button className="btn" onClick={onSpin} disabled={spinning || loading}>
          {spinning ? "Dönüyor…" : "Çarkı Çevir"}
        </button>
        {err && <div className="msg error">⚠️ {err}</div>}
      </section>

      {result && <div className="result">Kazandınız: <b>{result}</b></div>}

      <style>{css}</style>
    </main>
  );
}

async function postJson<T = any>(url: string, body: any, allowEmpty = false): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  if (allowEmpty) {
    const txt = await r.text(); if (!txt) return {} as T;
    try { return JSON.parse(txt) as T; } catch { return {} as T; }
  }
  return (await r.json()) as T;
}

const css = `
.slot{max-width:600px;margin:0 auto;padding:16px;text-align:center;color:#fff}
.hero .title{font-size:42px;font-weight:900}
.stroke{-webkit-text-stroke:2px rgba(255,255,255,.4);color:transparent}
.glow{color:#eafcff;text-shadow:0 0 22px #00e5ff}
.reelWrap{position:relative;height:${VISIBLE * ITEM_H}px;overflow:hidden;margin:20px 0;border-radius:16px;border:1px solid rgba(255,255,255,.2)}
.uiFrame::before,.uiFrame::after{content:"";position:absolute;left:10px;right:10px;height:3px;border-radius:99px}
.uiFrame::before{top:0;background:#0f0;box-shadow:0 0 12px #0f0}
.uiFrame::after{bottom:0;background:#0f0;box-shadow:0 0 12px #0f0}
.slot.is-spinning .uiFrame::before,.slot.is-spinning .uiFrame::after{background:#f33;box-shadow:0 0 14px #f33}
.bgLogoIn{position:absolute;inset:0;z-index:-1;background:url('https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png') no-repeat center/40%;opacity:.1}
.reel{position:absolute;left:0;right:0;top:0}
.item{display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900}
.item.win{color:#00e5ff;text-shadow:0 0 20px #00e5ff}
.panel{margin-top:20px;display:flex;flex-direction:column;gap:10px}
input{padding:8px;border-radius:8px;border:1px solid #555;background:#111;color:#fff}
.btn{padding:10px;border:none;border-radius:8px;background:linear-gradient(90deg,#00e5ff,#4aa7ff);font-weight:800;cursor:pointer}
.result{margin-top:14px;font-size:20px;font-weight:900;color:#0f0}
.msg.error{color:#f88;margin-top:8px}
`;
