// web/src/pages/RadiCark.tsx
import { useEffect, useMemo, useRef, useState } from "react";

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

/** Örnek görsel hissi: 20 dilim (istersen 24/32 yapabilirsin) */
const SEGMENTS = 20;

type Slice = {
  prize: Prize;
  sourceIndex: number;
  label: string;
  neonHue: number;
};

export default function RadiCark() {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");

  const [basePrizes, setBasePrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ label: string; image?: string | null } | null>(null);

  /** Döndürme için açı (CSS var() kullanılmıyor → transition çalışsın) */
  const [angle, setAngle] = useState(0);
  const lastAngleRef = useRef(0);

  /** ödülleri çek */
  useEffect(() => {
    let ok = true;
    setLoading(true);
    fetch(`${API}/api/prizes`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((rows: Prize[]) => {
        if (!ok) return;
        const sorted = (rows || [])
          .slice()
          .sort((a, b) => a.wheelIndex - b.wheelIndex)
          .map((p, i) => ({ ...p, wheelIndex: i }));
        setBasePrizes(sorted);
        setErr("");
      })
      .catch((e) => { if (ok) { setErr(e?.message ?? "Ödüller alınamadı"); setBasePrizes([]); } })
      .finally(() => ok && setLoading(false));
    return () => { ok = false; };
  }, []);

  /** 20 dilime genişlet + (hafif) karıştır + neon tonu */
  const slices: Slice[] = useMemo(() => {
    if (!basePrizes.length) return [];
    const rep: Slice[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const p = basePrizes[i % basePrizes.length];
      rep.push({
        prize: p,
        sourceIndex: p.wheelIndex,
        label: p.label,
        neonHue: hueFromLabel(p.label),
      });
    }
    return shuffle(rep);
  }, [basePrizes]);

  const segAngle = 360 / (slices.length || 1);

  /** SPIN */
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

      /** Hedef dilim: aynı orijinal index’e sahip 20’lik dilimlerden rasgele biri */
      const matches = slices
        .map((s, idx) => ({ idx, s }))
        .filter((x) => x.s.sourceIndex === vr.targetIndex)
        .map((x) => x.idx);
      if (!matches.length) throw new Error("Hedef dilim bulunamadı.");

      const targetSlice = matches[Math.floor(Math.random() * matches.length)];

      /** POINTER TEPESİNDE = 90° → hizalamayı düzelt */
      const pointerDeg = 90; // tepe
      const centerDeg = (targetSlice + 0.5) * segAngle;        // dilim merkezi
      const fullTurns = randInt(11, 14);                       // daha yavaş
      const jitter = (Math.random() - 0.5) * 2;                // ±1°
      const absolute =
        lastAngleRef.current + fullTurns * 360 + (pointerDeg - centerDeg) + jitter;

      setAngle(absolute);             // transition transform üzerinde
      await wait(13500 + 200);        // ~13.5s

      await postJson(`${API}/api/commit-spin`, {
        code: code.trim(), spinToken: vr.spinToken,
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
      {/* ARKAPLAN */}
      <div className="bgDecor" aria-hidden />

      {/* Başlık */}
      <header className="hero">
        <div className="title">RADİ ÇARK</div>
        <div className="sub">Şansını dene, ödülünü kap! 🎉</div>
      </header>

      {/* ÇARK */}
      <section className="stage">
        {/* Dış neon çember */}
        <div className={`neonRing ${spinning ? "alive" : ""}`} aria-hidden />

        {/* Sabit pointer */}
        <div className={`pointer ${spinning ? "tick" : ""}`}><div className="pin" /></div>

        {/* Çark gövdesi */}
        <div className={`wheel ${spinning ? "spin" : ""}`} style={{ transform: `rotate(${angle}deg)` }}>
          <div className="rim" />
          <div className="spokes">
            {Array.from({ length: slices.length }).map((_, i) => (
              <div key={i} className="spoke" style={{ transform: `rotate(${i * segAngle}deg)` }} />
            ))}
          </div>

          {/* wedge + etiket */}
          {slices.map((sl, i) => (
            <Slice
              key={`sl-${i}-${sl.prize.id}`}
              index={i}
              segAngle={segAngle}
              label={sl.label}
              neonHue={sl.neonHue}
            />
          ))}

          <div className="hub" />
        </div>
      </section>

      {/* FORM */}
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
          <div className="m-text">Ödülün: <b>{result.label}</b></div>
          <button className="btn" onClick={() => setResult(null)}>Kapat</button>
        </Modal>
      )}

      <style>{css}</style>
    </main>
  );
}

/* ---------------- helpers ---------------- */
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
function hueFromLabel(s: string): number { let h = 0; for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) % 360; return h; }

/* ---------------- slice ---------------- */
function Slice({
  index, segAngle, label, neonHue,
}: { index:number; segAngle:number; label:string; neonHue:number }) {
  const rotate = index * segAngle;
  return (
    <div
      className="slice"
      style={
        {
          transform: `rotate(${rotate}deg)`,
          ["--label-rot" as any]: `${segAngle / 2}deg`,
          ["--neon" as any]: neonHue,
        } as React.CSSProperties
      }
    >
      <div className="sector" />
      <div className="neonEdge" />
      {/* Etiket – dış çembere yaslı tangent */}
      <div className="label" title={label}><span>{label}</span></div>
      {/* Uç nokta */}
      <div className="endDot" />
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
  --text:#eaf2ff; --muted:#9fb1cc;
  --ring:#091227; --rim:#0c1430; --pointer:#ff3b6b;
  --sliceA:#0f1a38; --sliceB:#172b5b;
}
.spin{max-width:1200px;margin:0 auto;padding:16px;color:var(--text)}
.bgDecor{position:fixed; inset:0; pointer-events:none; z-index:-1;
  background: radial-gradient(60% 70% at 50% -10%, rgba(0,229,255,.08), transparent 60%),
              radial-gradient(60% 70% at 120% 20%, rgba(255,80,160,.08), transparent 60%),
              linear-gradient(180deg, #050a18, #0a1327 40%, #0a1327);
}
.hero{display:grid;place-items:center;margin:10px 0 8px}
.hero .title{font-weight:1000;font-size:clamp(26px,5vw,40px);letter-spacing:2px;color:#def4ff;text-shadow:0 6px 26px rgba(0,229,255,.25)}
.hero .sub{color:var(--muted)}

.stage{position:relative;display:grid;place-items:center;margin:12px 0 6px;pointer-events:none;z-index:1}

/* dış neon HALKA */
.neonRing{position:absolute; width:min(76vw,580px); height:min(76vw,580px); border-radius:999px;
  background: radial-gradient(60% 60% at 50% 50%, rgba(0,229,255,.08), transparent 70%),
              conic-gradient(from 0deg, rgba(0,229,255,.4) 0 6deg, rgba(0,229,255,0) 6deg 12deg);
  filter:blur(.8px); opacity:.65; animation:neonIdle 2.2s ease-in-out infinite alternate;
}
.neonRing.alive{ animation:neonRun .9s ease-in-out infinite; opacity:.95 }
@keyframes neonIdle{ from{opacity:.45} to{opacity:.68} }
@keyframes neonRun{ 0%{filter:blur(1px)} 50%{filter:blur(2.3px)} 100%{filter:blur(1px)} }

.pointer{position:absolute;top:-10px;pointer-events:none}
.pointer .pin{position:absolute;top:-8px;left:-3px;width:6px;height:6px;border-radius:50%;background:#ffe0ea;box-shadow:0 0 10px rgba(255,59,107,.8)}
.pointer.tick{animation:ptr .08s linear infinite}
@keyframes ptr{0%{transform:translateX(0)}50%{transform:translateX(1px)}100%{transform:translateX(0)}}

/* çark gövdesi */
.wheel{width:min(72vw,540px); height:min(72vw,540px); border-radius:999px; background:var(--ring); border:1px solid rgba(255,255,255,.15); position:relative;
  box-shadow:inset 0 0 0 10px var(--rim), 0 22px 70px rgba(0,0,0,.5);
  transition: transform 13.5s cubic-bezier(.17,.85,.08,1);
  will-change: transform; pointer-events:none; transform:rotate(0deg);
}
.rim{position:absolute; inset:2%; border-radius:999px; box-shadow:inset 0 0 0 2px rgba(255,255,255,.08), inset 0 0 50px rgba(0,229,255,.12)}
.spokes{position:absolute; inset:0; pointer-events:none}
.spoke{position:absolute; left:50%; top:50%; width:49%; height:1px; background:rgba(255,255,255,.10); transform-origin:left center}

.slice{position:absolute; inset:0; transform-origin:50% 50%; pointer-events:none}
.sector{position:absolute; inset:0; border-radius:999px;
  mask: conic-gradient(from 0deg, white 0deg, white var(--label-rot), transparent var(--label-rot));
  background: radial-gradient(60% 60% at 60% 45%, rgba(0,229,255,.08), transparent 70%), linear-gradient(180deg, var(--sliceA), var(--sliceB));
}
.neonEdge{position:absolute; left:50%; top:50%; width:50%; height:1px; transform-origin:left center;
  background:hsl(var(--neon) 95% 60% / .55);
  box-shadow:0 0 8px hsl(var(--neon) 95% 60% / .55), 0 0 14px hsl(var(--neon) 95% 60% / .35);
}

/* EN UÇTA TANGENT YAZI */
.label{position:absolute; left:50%; top:50%;
  transform: rotate(calc(var(--label-rot) + 90deg)) translate(86%, -50%); /* uca itildi */
  transform-origin:left center; pointer-events:none; z-index:3;
}
.label span{
  display:block; color:#f8fdff; font-weight:1000; font-size:16px;
  letter-spacing:.4px; text-shadow:0 2px 12px rgba(0,0,0,.95), 0 0 3px rgba(0,0,0,.95);
  white-space:nowrap; max-width:260px; overflow:hidden; text-overflow:ellipsis;
}
/* Uç nokta */
.endDot{position:absolute; left:50%; top:50%; width:10px; height:10px; border-radius:999px;
  background:hsl(var(--neon) 95% 60% / .9); transform: rotate(calc(var(--label-rot) + 90deg)) translate(96%, -50%);
  box-shadow:0 0 10px hsl(var(--neon) 95% 60% / .85), 0 0 16px hsl(var(--neon) 95% 60% / .45);
}

/* merkez plaka */
.hub{position:absolute; inset:36% 36%; border-radius:999px;
  background: radial-gradient(circle at 30% 35%, #1d2e57 0%, #0c1430 60%), radial-gradient(circle at 60% 65%, rgba(0,229,255,.18), transparent 50%);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.08), inset 0 0 40px rgba(0,229,255,.15), 0 10px 30px rgba(0,0,0,.45);
  pointer-events:none;
}

/* form */
.panel{margin:8px 0 16px; position:relative; z-index:5}
.panel.below{display:grid; place-items:center}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end; justify-content:center}
.f{display:flex;flex-direction:column;gap:6px}
.f span{font-size:12px;color:var(--muted)}
input{background:#0e1730;border:1px solid rgba(255,255,255,.12);color:#eaf2ff;border-radius:10px;padding:10px 12px;min-width:260px}
.btn{background:linear-gradient(90deg,#00e5ff,#4aa7ff); color:#001018; border:none;border-radius:10px; padding:12px 16px; font-weight:900; cursor:pointer; box-shadow:0 8px 22px rgba(0,229,255,.25)}
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
