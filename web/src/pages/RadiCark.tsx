// web/src/pages/RadiCark.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Radi Çark – Çarkıfelek görünümü
 * Backend logic bozulmadı, sadece tasarım güncellendi
 */

type Prize = {
  id: number;
  label: string;
  wheelIndex: number;
  imageUrl?: string | null;
};

type VerifyIn = { code: string; username: string };
type VerifyOut = {
  targetIndex: number;
  prizeLabel: string;
  spinToken: string;
  prizeImage?: string | null;
};
type CommitIn = { code: string; spinToken: string };

const API = import.meta.env.VITE_API_BASE_URL;
const SEGMENTS = 32;

type Slice = {
  prize: Prize;
  sourceIndex: number;
  labelShort: string;
  imageUrl?: string | null;
};

export default function RadiCark() {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loadingPrizes, setLoadingPrizes] = useState(true);
  const [err, setErr] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ label: string; image?: string | null } | null>(null);
  const [angle, setAngle] = useState(0);
  const lastAngleRef = useRef(0);

  useEffect(() => {
    let alive = true;
    setLoadingPrizes(true);
    fetch(`${API}/api/prizes`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((rows: Prize[]) => {
        if (!alive) return;
        const sorted = (rows || [])
          .slice()
          .sort((a, b) => a.wheelIndex - b.wheelIndex)
          .map((p, i) => ({ ...p, wheelIndex: i }));
        setPrizes(sorted);
        setErr("");
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message ?? "Ödüller alınamadı");
        setPrizes([]);
      })
      .finally(() => alive && setLoadingPrizes(false));
    return () => {
      alive = false;
    };
  }, []);

  const slices: Slice[] = useMemo(() => {
    if (!prizes.length) return [];
    const expanded: Slice[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const p = prizes[i % prizes.length];
      expanded.push({
        prize: p,
        sourceIndex: p.wheelIndex,
        labelShort: shortenLabel(p.label),
        imageUrl: p.imageUrl || undefined,
      });
    }
    return expanded;
  }, [prizes]);

  const segAngle = 360 / (slices.length || 1);

  const onSpin = async () => {
    setErr("");
    setResult(null);
    if (!code.trim() || !username.trim()) {
      setErr("Kullanıcı adı ve kod gerekli.");
      return;
    }
    if (!slices.length) {
      setErr("Ödül verisi yok.");
      return;
    }
    if (spinning) return;

    try {
      setSpinning(true);
      const vr: VerifyOut = await postJson(`${API}/api/verify-spin`, {
        code: code.trim(),
        username: username.trim(),
      } as VerifyIn);

      const candidatePositions = slices
        .map((s, idx) => ({ idx, s }))
        .filter((x) => x.s.sourceIndex === vr.targetIndex)
        .map((x) => x.idx);

      if (!candidatePositions.length) {
        throw new Error("Hedef dilim eşleşmedi.");
      }
      const targetSliceIndex = candidatePositions[Math.floor(Math.random() * candidatePositions.length)];
      const center = (targetSliceIndex + 0.5) * segAngle;
      const fullTurns = randInt(9, 12);
      const base = fullTurns * 360;
      const targetAngle = base + (360 - center);
      const jitter = (Math.random() - 0.5) * 2.4;
      const absolute = lastAngleRef.current + targetAngle + jitter;
      setAngle(absolute);

      const DURATION = 10500;
      await wait(DURATION + 150);

      await postJson(`${API}/api/commit-spin`, {
        code: code.trim(),
        spinToken: vr.spinToken,
      } as CommitIn);

      setResult({ label: vr.prizeLabel, image: vr.prizeImage });
      lastAngleRef.current = absolute;
    } catch (e: any) {
      setErr(String(e?.message || "Spin başarısız"));
    } finally {
      setSpinning(false);
    }
  };

  return (
    <main className="spin">
      <header className="head">
        <h1>🎡 Radi Çark</h1>
      </header>

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
          <button className="btn" onClick={onSpin} disabled={spinning || loadingPrizes}>
            {spinning ? "Dönüyor…" : "Çarkı Çevir"}
          </button>
        </div>
        {err && <div className="msg error">⚠️ {err}</div>}
      </section>

      <section className="stage">
        <div className="pointer" />
        <div
          className={`wheel ${spinning ? "spin" : ""}`}
          style={{
            ["--angle" as any]: `${angle}deg`,
            ["--seg" as any]: `${segAngle}deg`,
            ["--segcount" as any]: slices.length || 1,
          }}
        >
          <div className="rim" />
          <div className="spokes">
            {Array.from({ length: slices.length }).map((_, i) => (
              <div key={i} className="spoke" style={{ transform: `rotate(${i * segAngle}deg)` }} />
            ))}
          </div>
          {slices.map((sl, i) => (
            <Slice key={`s-${i}-${sl.prize.id}`} index={i} segAngle={segAngle} label={sl.labelShort} imageUrl={sl.imageUrl || undefined} />
          ))}
          <div className="hub">
            <div className="hub2">ÇARK</div>
          </div>
        </div>
      </section>

      {result && (
        <Modal onClose={() => setResult(null)}>
          <div className="m-title">🎉 Tebrikler</div>
          {result.image && <img className="m-img" src={result.image} alt="" />}
          <div className="m-text">
            Ödülün: <b>{result.label}</b>
          </div>
          <button className="btn" onClick={() => setResult(null)}>
            Kapat
          </button>
        </Modal>
      )}

      <style>{css}</style>
    </main>
  );
}

/* ---------- helpers ---------- */
async function postJson<T = any>(url: string, body: any): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const js = await r.json();
      if (js?.detail) msg = js.detail;
    } catch {}
    throw new Error(msg);
  }
  return (await r.json()) as T;
}
function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
function randInt(a: number, b: number) {
  return Math.floor(a + Math.random() * (b - a + 1));
}
function shortenLabel(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= 10) return t;
  const m = t.match(/([₺$€]?\s?\d{3,})/);
  if (m) return m[1].replace(/\s/g, "");
  return t.slice(0, 9) + "…";
}

/* ---------- slice ---------- */
function Slice({ index, segAngle, label, imageUrl }: { index: number; segAngle: number; label: string; imageUrl?: string }) {
  const rotate = index * segAngle;
  const alt = index % 2 === 0 ? "var(--sliceA)" : "var(--sliceB)";
  return (
    <div
      className="slice"
      style={
        {
          transform: `rotate(${rotate}deg)`,
          ["--bg" as any]: alt,
          ["--label-rot" as any]: `${segAngle / 2}deg`,
        } as React.CSSProperties
      }
    >
      <div className="sector" />
      <div className="label" title={label}>
        {imageUrl ? <img src={imageUrl} alt="" /> : null}
        <span>{label}</span>
      </div>
    </div>
  );
}

/* ---------- modal ---------- */
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modalWrap" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

/* ---------- styles ---------- */
const css = `
:root{
  --text:#fff;
  --rim:#ffd700;
  --pointer:#00eaff;
  --sliceA:#ffcc00;
  --sliceB:#0033cc;
}
.spin{max-width:1200px;margin:0 auto;padding:16px;color:var(--text);text-align:center}
.head h1{margin:0 0 10px;font-size:28px;text-shadow:0 0 10px #ffd700, 0 0 20px #ffaa00;}
.panel{margin:10px 0 16px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;justify-content:center}
.f{display:flex;flex-direction:column;gap:6px}
.f span{font-size:12px;color:#ccc}
input{
  background:#111;border:1px solid rgba(255,255,255,.3);color:var(--text);
  border-radius:8px;padding:8px 10px;min-width:180px;
}
.btn{
  background:linear-gradient(90deg,#ffcc00,#ffaa00); color:#000; border:none;
  border-radius:10px; padding:10px 16px; font-weight:900; cursor:pointer;
  box-shadow:0 8px 22px rgba(255,200,0,.6);
}
.btn:disabled{opacity:.7;cursor:not-allowed}
.msg.error{color:#ff8080;margin-top:8px}

.stage{position:relative;display:grid;place-items:center;margin:20px 0}
.pointer{
  position:absolute; top:-30px;
  width:0; height:0;
  border-left:20px solid transparent;
  border-right:20px solid transparent;
  border-bottom:35px solid var(--pointer);
  filter:drop-shadow(0 0 15px var(--pointer));
  z-index:3;
}

.wheel{
  width:min(95vw,650px); height:min(95vw,650px);
  border-radius:50%;
  background:#111;
  border:8px solid var(--rim);
  position:relative;
  transform: rotate(var(--angle, 0deg));
  transition: transform 10.5s cubic-bezier(.1,.98,.08,1);
  overflow:hidden;
  box-shadow:0 0 30px rgba(0,0,0,.7),
             inset 0 0 50px rgba(255,215,0,.3),
             0 0 40px rgba(0,234,255,.3);
}
.rim{position:absolute; inset:2%; border-radius:50%; box-shadow:inset 0 0 0 3px rgba(255,255,255,.3);}
.spokes{position:absolute; inset:0}
.spoke{
  position:absolute; left:50%; top:50%; width:48%; height:1px; background:rgba(255,255,255,.15);
  transform-origin:left center;
}
.slice{position:absolute; inset:0; transform-origin:50% 50%}
.sector{
  position:absolute; left:50%; top:50%; width:50%; height:2px;
  transform-origin:left center;
  background:linear-gradient(90deg, var(--bg) 0%, var(--bg) 60%, transparent 100%);
}
.sector::before{
  content:""; position:absolute; left:0; top:-9999px; right:0; bottom:-9999px;
  background:conic-gradient(from calc(-1 * var(--label-rot) + 90deg), var(--bg) 0deg, var(--bg) var(--label-rot), transparent var(--label-rot));
  opacity:.97;
}
.slice:nth-child(odd) .sector::before{ --bg: var(--sliceA); }
.slice:nth-child(even) .sector::before{ --bg: var(--sliceB); }

.label{
  position:absolute; left:50%; top:50%;
  transform: rotate(var(--label-rot)) translate(80%, -50%);
  transform-origin:left center; display:flex; align-items:center;
  color:#fff; font-weight:900; text-shadow:0 0 6px #000,0 0 10px #ffd700;
}
.label img{ width:20px; height:20px; border-radius:4px; object-fit:cover; }
.label span{ font-size:15px; white-space:nowrap }

.hub{
  position:absolute; inset:32% 32%;
  border-radius:50%;
  background:radial-gradient(circle at 30% 30%, #ffcc00, #cc9900);
  display:grid; place-items:center;
  box-shadow:0 0 25px rgba(0,0,0,.7), inset 0 0 25px rgba(255,255,255,.3);
}
.hub2{font-weight:900; color:#111; font-size:18px; text-shadow:0 0 8px #fff;}

.modalWrap{position:fixed; inset:0; background:rgba(0,0,0,.55); display:grid; place-items:center; z-index:70}
.modal{position:relative; width:min(520px,94vw); background:#1a1a1a; border:1px solid rgba(255,255,255,.2); border-radius:16px; padding:16px; color:#fff; box-shadow:0 20px 60px rgba(0,0,0,.6)}
.close{position:absolute; right:10px; top:10px; border:none; background:transparent; color:#aaa; cursor:pointer; font-size:18px}
.m-title{font-weight:900; margin:0 0 10px}
.m-img{width:100%; height:160px; object-fit:cover; border-radius:10px; margin-bottom:10px}
.m-text{margin:8px 0 14px}
`;
