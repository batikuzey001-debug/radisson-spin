// web/src/pages/RadiCark.tsx
import { useEffect, useMemo, useRef, useState } from "react";

type Prize = { id: number; label: string; wheelIndex: number; imageUrl?: string | null };
type VerifyIn = { code: string; username: string };
type VerifyOut = { targetIndex: number; prizeLabel: string; spinToken: string; prizeImage?: string | null };
type CommitIn = { code: string; spinToken: string };

const API = import.meta.env.VITE_API_BASE_URL;
const SEGMENTS = 5;

type Slice = { label: string; sourceIndex: number };

export default function RadiCark() {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");

  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ label: string; image?: string | null } | null>(null);
  const [angle, setAngle] = useState(0);
  const lastAngleRef = useRef(0);

  useEffect(() => {
    let ok = true;
    setLoading(true);
    fetch(`${API}/api/prizes`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((rows: Prize[]) => {
        if (!ok) return;
        const sorted = (rows || []).slice().sort((a, b) => a.wheelIndex - b.wheelIndex);
        setPrizes(sorted);
        setErr("");
      })
      .catch((e) => { if (ok) { setErr(e?.message ?? "Ödüller alınamadı"); setPrizes([]); } })
      .finally(() => ok && setLoading(false));
    return () => { ok = false; };
  }, []);

  // 5 dilime indir / doldur
  const slices: Slice[] = useMemo(() => {
    const base = prizes.length ? prizes : [];
    const take = base.slice(0, SEGMENTS).map((p) => ({ label: p.label, sourceIndex: p.wheelIndex }));
    while (take.length < SEGMENTS) {
      take.push({ label: `Ödül ${take.length + 1}`, sourceIndex: take.length });
    }
    return take;
  }, [prizes]);

  const segAngle = 360 / SEGMENTS;

  const onSpin = async () => {
    setErr(""); setResult(null);
    if (!code.trim() || !username.trim()) return setErr("Kullanıcı adı ve kod gerekli.");
    if (!slices.length) return setErr("Ödül verisi yok.");
    if (spinning) return;

    try {
      setSpinning(true);

      const vr: VerifyOut = await postJson(`${API}/api/verify-spin`, {
        code: code.trim(), username: username.trim(),
      } as VerifyIn);

      // Görsel 5’lik dilimde hedef: aynı sourceIndex varsa onu kullan, yoksa mod 5
      let target = slices.findIndex((s) => s.sourceIndex === vr.targetIndex);
      if (target < 0) target = ((vr.targetIndex % SEGMENTS) + SEGMENTS) % SEGMENTS;

      // Tepe pointer = 90°
      const pointerDeg = 90;
      const centerDeg  = (target + 0.5) * segAngle;
      const fullTurns  = 6;                  // sade ve kısa
      const absolute   = lastAngleRef.current + fullTurns * 360 + (pointerDeg - centerDeg);

      setAngle(absolute);
      await wait(7200 + 150);                // ~7.2s

      await postJson(`${API}/api/commit-spin`, { code: code.trim(), spinToken: vr.spinToken } as CommitIn);

      setResult({ label: vr.prizeLabel, image: vr.prizeImage });
      lastAngleRef.current = absolute;
    } catch (e: any) {
      setErr(String(e?.message || "Spin başarısız"));
    } finally {
      setSpinning(false);
    }
  };

  // Arka plan renkleri (sade)
  const conic = useMemo(() => {
    const cols = ["#0e2b78", "#123a9a", "#0e2b78", "#123a9a", "#0e2b78"];
    const parts: string[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const s = i * segAngle, e = (i + 1) * segAngle;
      parts.push(`${cols[i % cols.length]} ${s}deg ${e}deg`);
    }
    return `conic-gradient(${parts.join(",")})`;
  }, [segAngle]);

  return (
    <main className="spin">
      <header className="hero">
        <div className="title">RADİ ÇARK</div>
        <div className="sub">Şansını dene, ödülünü kap! 🎉</div>
      </header>

      <section className="stage">
        <div className="pointer"><div className="pin" /></div>

        <div className="wheel" style={{ transform: `rotate(${angle}deg)` }}>
          <div className="bg" style={{ background: conic }} />
          <div className="rim" />
          {/* Etiketler – sade, yatay, büyük */}
          {slices.map((sl, i) => {
            const mid = (i + 0.5) * segAngle;
            return (
              <div key={i} className="lblWrap" style={{ transform: `rotate(${mid}deg)` }}>
                <div className="lbl" title={sl.label}>
                  {sl.label}
                </div>
              </div>
            );
          })}
          <div className="hub" />
        </div>
      </section>

      <section className="panel">
        <div className="row">
          <label className="f">
            <span>Kullanıcı Adı</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="adınız" />
          </label>
          <label className="f">
            <span>Kod</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ör. ABC123" />
          </label>
          <button className="btn" onClick={onSpin} disabled={spinning || loading}>
            {spinning ? "Dönüyor…" : "Çarkı Çevir"}
          </button>
        </div>
        {err && <div className="msg error">⚠️ {err}</div>}
      </section>

      {result && (
        <Modal onClose={() => setResult(null)}>
          <div className="m-title">Tebrikler 🎉</div>
          {result.image && <img className="m-img" src={result.image} alt="" />}
          <div className="m-text">Ödülün: <b>{result.label}</b></div>
          <button className="btn" onClick={() => setResult(null)}>Kapat</button>
        </Modal>
      )}

      <style>{css}</style>
    </main>
  );
}

/* ---------- helpers ---------- */
async function postJson<T = any>(url: string, body: any): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try { const js = await r.json(); if (js?.detail) msg = js.detail; } catch {}
    throw new Error(msg);
  }
  return (await r.json()) as T;
}
function wait(ms: number) { return new Promise((res) => setTimeout(res, ms)); }
function randInt(a: number, b: number) { return Math.floor(a + Math.random() * (b - a + 1)); }
function shuffle<T>(arr: T[]): T[] { const a = arr.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

/* ---------- styles ---------- */
const css = `
:root{
  --text:#eaf2ff; --muted:#9fb1cc; --ring:#091227; --rim:#0c1430;
}
*{box-sizing:border-box}
.spin{max-width:960px;margin:0 auto;padding:16px;color:var(--text)}
.hero{display:grid;place-items:center;margin:6px 0 8px}
.title{font-weight:1000;font-size:clamp(26px,5vw,38px);letter-spacing:2px}
.sub{color:#9fb1cc}

.stage{position:relative;display:grid;place-items:center;margin:8px 0 6px;pointer-events:none}
.pointer{position:absolute; top:-8px}
.pin{width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:16px solid #36d1ff;filter:drop-shadow(0 0 8px rgba(54,209,255,.7))}

.wheel{
  width:min(78vw,480px); height:min(78vw,480px);
  border-radius:999px; position:relative;
  transition: transform 7.2s cubic-bezier(.2,.85,.08,1); will-change: transform;
  transform:rotate(0deg);
}
.bg{position:absolute; inset:0; border-radius:999px}
.rim{position:absolute; inset:2%; border-radius:999px; box-shadow:inset 0 0 0 10px var(--rim), 0 18px 60px rgba(0,0,0,.45)}
.lblWrap{position:absolute; left:50%; top:50%; transform-origin:50% 50%}
.lbl{
  position:absolute; left:0; top:0; transform-origin:left center;
  transform: translate(78%, -50%);         /* etiket dışa taşır */
  color:#fff; font-weight:900; font-size:18px; letter-spacing:.4px;
  text-shadow:0 2px 8px rgba(0,0,0,.8);
  pointer-events:none; white-space:nowrap; max-width:260px; overflow:hidden; text-overflow:ellipsis;
}
.hub{
  position:absolute; inset:32% 32%; border-radius:999px;
  background:radial-gradient(circle at 30% 35%, #1d2e57 0%, #0c1430 60%);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.08), 0 10px 30px rgba(0,0,0,.35);
}

.panel{margin-top:10px;pointer-events:auto}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;justify-content:center}
.f{display:flex;flex-direction:column;gap:6px}
.f span{font-size:12px;color:var(--muted)}
input{background:#0e1730;border:1px solid rgba(255,255,255,.12);color:#eaf2ff;border-radius:10px;padding:10px 12px;min-width:220px}
.btn{background:linear-gradient(90deg,#00e5ff,#4aa7ff);color:#001018;border:none;border-radius:10px;padding:12px 16px;font-weight:900;cursor:pointer;box-shadow:0 8px 20px rgba(0,229,255,.25)}
.msg.error{color:#ffb3c0;margin-top:8px}
`;
