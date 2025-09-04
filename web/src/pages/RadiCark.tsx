// web/src/pages/RadiCark.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Radi Çark – Çarkıfelek (32 dişli, gerçekçi)
 * - /api/prizes -> ödüller (orijinal sıralı)
 * - /api/verify-spin -> targetIndex (orijinal liste index), spinToken
 * - Görselde 32 dilim; orijinal ödüller 32’ye tamamlanıp RASTGELE karıştırılır.
 * - verify dönen index'e uyan dilim(ler) içinden rastgele biri hedeflenir.
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
  sourceIndex: number; // orijinal listedeki index (verify ile eşleşmede)
  label: string;
  imageUrl?: string | null;
};

export default function RadiCark() {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");

  const [basePrizes, setBasePrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ label: string; image?: string | null } | null>(null);
  const [angle, setAngle] = useState(0);
  const lastAngleRef = useRef(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
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
        setBasePrizes(sorted);
        setErr("");
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message ?? "Ödüller alınamadı");
        setBasePrizes([]);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const slices: Slice[] = useMemo(() => {
    if (!basePrizes.length) return [];
    const rep: Slice[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const p = basePrizes[i % basePrizes.length];
      rep.push({ prize: p, sourceIndex: p.wheelIndex, label: p.label, imageUrl: p.imageUrl || undefined });
    }
    return shuffle(rep);
  }, [basePrizes]);

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

      const matches = slices
        .map((s, idx) => ({ idx, s }))
        .filter((x) => x.s.sourceIndex === vr.targetIndex)
        .map((x) => x.idx);
      if (!matches.length) throw new Error("Hedef dilim bulunamadı.");

      const targetSlice = matches[Math.floor(Math.random() * matches.length)];
      const center = (targetSlice + 0.5) * segAngle;
      const fullTurns = randInt(9, 12);
      const jitter = (Math.random() - 0.5) * 2; // ±1°
      const absolute = lastAngleRef.current + fullTurns * 360 + (360 - center) + jitter;

      setAngle(absolute);
      const DURATION = 11500;
      await wait(DURATION + 200);

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
      {/* ÜST BAŞLIK */}
      <header className="hero">
        <div className="title">RADİ ÇARK</div>
        <div className="sub">Şansını dene, ödülünü kap! 🎉</div>
      </header>

      {/* ÇARK (üst katman engellemesin diye pointer-events: none) */}
      <section className="stage">
        <div className={`pointer ${spinning ? "tick" : ""}`}>
          <div className="pin" />
        </div>

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
            <Slice key={`sl-${i}-${sl.prize.id}`} index={i} segAngle={segAngle} label={sl.label} imageUrl={sl.imageUrl || undefined} />
          ))}

          <div className="hub">
            <div className="hub2">RADİ ÇARK</div>
          </div>
        </div>
      </section>

      {/* FORM – ÇARKIN ALTINDA ve ÜST KATMANDA */}
      <section className="panel below">
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

/* ---------------- helpers ---------------- */
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
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- slice ---------------- */
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

/* ---------------- modal ---------------- */
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

/* ---------------- styles ---------------- */
const css = `
:root{
  --bg1:#0b1224; --bg2:#0e1a33; --text:#eaf2ff; --muted:#9fb1cc;
  --ring:#091227; --rim:#0c1430; --pointer:#ff3b6b; --glow:#00e5ff;
  --sliceA:#0f1a38; --sliceB:#14234d;
}

/* üst başlık */
.hero{display:grid;place-items:center;margin:10px 0 6px}
.hero .title{
  font-weight:1000; font-size:clamp(26px,5vw,42px);
  letter-spacing:2px; color:#def4ff; text-shadow:0 6px 26px rgba(0,229,255,.25);
}
.hero .sub{color:var(--muted)}

.stage{
  position:relative;display:grid;place-items:center;margin:16px 0 8px;
  /* ÖNEMLİ: çark alanı tıklamaları engellemesin */
  pointer-events:none; z-index:1;
}
.pointer{ position:absolute; top:-12px; pointer-events:none; }
.pointer .pin{
  position:absolute; top:-8px; left:-3px; width:6px; height:6px; border-radius:50%;
  background:#ffe0ea; box-shadow:0 0 10px rgba(255,59,107,.8);
}
.pointer.tick{animation:ptr 0.08s linear infinite}
@keyframes ptr{0%{transform:translateX(0)}50%{transform:translateX(1px)}100%{transform:translateX(0)}}

.wheel{
  width:min(94vw,760px); height:min(94vw,760px);
  border-radius:999px; background:var(--ring); border:1px solid rgba(255,255,255,.15); position:relative;
  box-shadow:inset 0 0 0 12px var(--rim), 0 26px 80px rgba(0,0,0,.5);
  transform: rotate(var(--angle, 0deg));
  transition: transform 11.5s cubic-bezier(.08,.99,.06,1);
  will-change: transform;
  pointer-events:none; /* çark altındaki elementleri engellemesin */
}
.rim{position:absolute; inset:2%; border-radius:999px; box-shadow:inset 0 0 0 2px rgba(255,255,255,.08), inset 0 0 50px rgba(0,229,255,.12);}
.spokes{position:absolute; inset:0; pointer-events:none}
.spoke{
  position:absolute; left:50%; top:50%; width:49%; height:1px; background:rgba(255,255,255,.10);
  transform-origin:left center;
}

.slice{position:absolute; inset:0; transform-origin:50% 50%; pointer-events:none}
.sector{
  position:absolute; inset:0; border-radius:999px;
  mask: conic-gradient(from 0deg, white 0deg, white var(--label-rot), transparent var(--label-rot));
  background:
    radial-gradient(60% 60% at 60% 45%, rgba(0,229,255,.08), transparent 70%),
    var(--bg);
  filter:drop-shadow(0 0 1px rgba(0,0,0,.6));
}
.label{
  position:absolute; left:50%; top:50%;
  transform: rotate(calc(var(--label-rot) + 90deg)) translate(46%, -50%);
  transform-origin:left center;
  display:flex; align-items:center; gap:6px;
  color:#eaf2ff; text-shadow:0 2px 10px rgba(0,0,0,.7); font-weight:900;
  pointer-events:none;
}
.label img{ width:18px; height:18px; border-radius:4px; object-fit:cover; opacity:.95 }
.label span{ font-size:12px; max-width:140px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }

.hub{
  position:absolute; inset:34% 34%;
  border-radius:999px; background:radial-gradient(circle at 30% 35%, #1d2e57, #0c1430 60%);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.08), inset 0 0 40px rgba(0,229,255,.15), 0 10px 30px rgba(0,0,0,.45);
  display:grid; place-items:center; pointer-events:none;
}
.hub2{font-weight:1000; letter-spacing:.8px; color:#def4ff; text-shadow:0 2px 14px rgba(0,229,255,.35)}

.panel{margin:8px 0 16px; position:relative; z-index:5;} /* FORM ÜST KATMANDA */
.panel.below{display:grid; place-items:center}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end; justify-content:center}
.f{display:flex;flex-direction:column;gap:6px}
.f span{font-size:12px;color:var(--muted)}
input{
  background:#0e1730;border:1px solid rgba(255,255,255,.12);color:var(--text);
  border-radius:10px;padding:10px 12px;min-width:260px;
}
.btn{
  background:linear-gradient(90deg,#00e5ff,#4aa7ff); color:#001018; border:none;
  border-radius:10px; padding:12px 16px; font-weight:900; cursor:pointer;
  box-shadow:0 8px 22px rgba(0,229,255,.25);
}
.btn:disabled{opacity:.7;cursor:not-allowed}
.msg.error{color:#ffb3c0;margin-top:8px}

/* modal */
.modalWrap{position:fixed; inset:0; background:rgba(0,0,0,.55); display:grid; place-items:center; z-index:70}
.modal{position:relative; width:min(520px,94vw); background:#0f1628; border:1px solid rgba(255,255,255,.12); border-radius:16px; padding:16px; color:#eaf2ff; box-shadow:0 20px 60px rgba(0,0,0,.5)}
.close{position:absolute; right:10px; top:10px; border:none; background:transparent; color:#9fb1cc; cursor:pointer; font-size:18px}
.m-title{font-weight:900; margin:0 0 10px}
.m-img{width:100%; height:160px; object-fit:cover; border-radius:10px; margin-bottom:10px}
.m-text{margin:8px 0 14px}
`;
