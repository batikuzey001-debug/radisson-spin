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

/** Dilim sayısı – 20 gayet okunur, istersen 24/32 yapabilirsin */
const SEGMENTS = 20;
/** Etiketi dışa itme yüzdesi (merkezden) */
const LABEL_R = 88;

type Slice = {
  prize: Prize;
  sourceIndex: number;
  label: string;
  hue: number;
};

export default function RadiCark() {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [basePrizes, setBasePrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ label: string; image?: string | null } | null>(null);

  // Dönüş açısı (transition bunun üzerinde – var() yok)
  const [angle, setAngle] = useState(0);
  const lastAngleRef = useRef(0);

  /** Ödülleri çek */
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

  /** Dilimler: 20’ye tamamla + hafif karıştır + renk tonu üret */
  const slices: Slice[] = useMemo(() => {
    if (!basePrizes.length) return [];
    const rep: Slice[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const p = basePrizes[i % basePrizes.length];
      rep.push({
        prize: p,
        sourceIndex: p.wheelIndex,
        label: p.label,
        hue: hueFromLabel(p.label),
      });
    }
    return shuffle(rep);
  }, [basePrizes]);

  const segAngle = 360 / (slices.length || 1);
  const wheelAngle = ((angle % 360) + 360) % 360; // -/+ açıları normalize et

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

      // Görsel listede aynı orijinal index’e sahip dilimlerden rasgele biri
      const matches = slices
        .map((s, idx) => ({ idx, s }))
        .filter((x) => x.s.sourceIndex === vr.targetIndex)
        .map((x) => x.idx);
      if (!matches.length) throw new Error("Hedef dilim bulunamadı.");

      const targetSlice = matches[Math.floor(Math.random() * matches.length)];
      /** Tepe pointer = 90° → hizalama */
      const pointerDeg = 90;
      const centerDeg  = (targetSlice + 0.5) * segAngle;
      const fullTurns  = randInt(11, 14);                // daha yavaş
      const jitter     = (Math.random() - 0.5) * 2;      // ±1°
      const absolute   = lastAngleRef.current + fullTurns * 360 + (pointerDeg - centerDeg) + jitter;

      setAngle(absolute);
      await wait(13600 + 200);                           // ~13.6s

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

  /** Conic-gradient ile dilim arka planı */
  const bgConic = useMemo(() => {
    if (!slices.length) return "";
    const cA = "#0f244b", cB = "#132e61";
    const arr: string[] = [];
    for (let i = 0; i < slices.length; i++) {
      const a0 = i * segAngle;
      const a1 = (i + 1) * segAngle;
      arr.push(`${i % 2 ? cB : cA} ${a0}deg ${a1}deg`);
    }
    return `conic-gradient(${arr.join(",")})`;
  }, [slices, segAngle]);

  return (
    <main className="spin">
      <div className="bgDecor" aria-hidden />
      <header className="hero">
        <div className="title">RADİ ÇARK</div>
        <div className="sub">Şansını dene, ödülünü kap! 🎉</div>
      </header>

      <section className="stage">
        <div className={`neonRing ${spinning ? "alive" : ""}`} aria-hidden />
        <div className={`pointer ${spinning ? "tick" : ""}`}>
          <div className="pin" />
          <div className="pointerHead" />
        </div>

        <div className="wheel" style={{ transform: `rotate(${angle}deg)` }}>
          {/* arka plan dilimler */}
          <div className="bg" style={{ background: bgConic }} />
          {/* dış ve iç halkalar */}
          <div className="rim" />
          {/* ayraç çizgiler */}
          <div className="spokes">
            {Array.from({ length: slices.length }).map((_, i) => (
              <div key={i} className="spoke" style={{ transform: `rotate(${i * segAngle}deg)` }} />
            ))}
          </div>

          {/* TANGENT etikletler (yay boyunca) */}
          {slices.map((sl, i) => {
            const mid = (i + 0.5) * segAngle;
            return (
              <div
                key={`lbl-${i}`}
                className="lblWrap"
                style={{ transform: `rotate(${mid}deg)` }}
              >
                <div
                  className="chip"
                  /* 90° = teğet; wheelAngle'ı iptal et → yazı sabit */
                  style={{
                    transform: `translate(${LABEL_R}%, -50%) rotate(${90 - wheelAngle}deg)`,
                    borderColor: `hsl(${sl.hue} 85% 62% / .6)`,
                  }}
                  title={sl.label}
                >
                  <span className="dot" style={{ background: `hsl(${sl.hue} 95% 60%)` }} />
                  <span className="txt">{sl.label}</span>
                </div>
              </div>
            );
          })}

          {/* merkez plaka */}
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
function hueFromLabel(s: string): number { let h = 0; for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) % 360; return h; }

/* ---------- styles ---------- */
const css = `
:root{
  --text:#eaf2ff; --muted:#9fb1cc;
  --ring:#091227; --rim:#0b1431; --pointer:#ff3b6b;
  --chip-bg: rgba(4,10,28,.58);
  --chip-bg-strong: rgba(8,18,44,.75);
  --shadow-strong: 0 12px 40px rgba(0,0,0,.55);
  --radius: 12px;
  --font: ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
}
*{box-sizing:border-box}
.spin{max-width:1200px;margin:0 auto;padding:18px;color:var(--text);font-family:var(--font)}
.bgDecor{position:fixed; inset:0; pointer-events:none; z-index:-1;
  background: radial-gradient(60% 70% at 50% -10%, rgba(0,229,255,.08), transparent 60%),
              radial-gradient(60% 70% at 120% 20%, rgba(255,80,160,.08), transparent 60%),
              linear-gradient(180deg, #050a18, #0a1327 40%, #0a1327);
}
.hero{display:grid;place-items:center;margin:12px 0 6px;text-align:center}
.hero .title{font-weight:1000;font-size:clamp(26px,5.2vw,44px);letter-spacing:.5px;color:#def4ff;text-shadow:0 8px 30px rgba(0,229,255,.25)}
.hero .sub{color:var(--muted);font-size:clamp(12px,2.2vw,14px)}

.stage{position:relative;display:grid;place-items:center;margin:6px 0 2px;pointer-events:none;z-index:1}

/* dış neon HALKA */
.neonRing{position:absolute; width:min(76vw,580px); height:min(76vw,580px); border-radius:999px;
  background: radial-gradient(60% 60% at 50% 50%, rgba(0,229,255,.08), transparent 70%),
              conic-gradient(from 0deg, rgba(0,229,255,.45) 0 6deg, rgba(0,229,255,0) 6deg 12deg);
  filter:blur(.8px); opacity:.72; animation:neonIdle 2s ease-in-out infinite alternate;
}
.neonRing.alive{ animation:neonRun .9s ease-in-out infinite; opacity:.98 }
@keyframes neonIdle{ from{opacity:.5} to{opacity:.8} }
@keyframes neonRun{ 0%{filter:blur(1px)} 50%{filter:blur(2.6px)} 100%{filter:blur(1px)} }

/* pointer */
.pointer{position:absolute;top:-2px;pointer-events:none;display:grid;place-items:center}
.pointer .pin{position:absolute;top:-10px;left:-3px;width:6px;height:6px;border-radius:50%;background:#ffe0ea;box-shadow:0 0 10px rgba(255,59,107,.8)}
.pointer .pointerHead{
  width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:16px solid var(--pointer);
  filter:drop-shadow(0 8px 16px rgba(255,59,107,.45)); transform:translateY(2px);
}
.pointer.tick{animation:ptr .08s linear infinite}
@keyframes ptr{0%{transform:translateX(0)}50%{transform:translateX(1px)}100%{transform:translateX(0)}}

/* çark */
.wheel{width:min(72vw,540px); height:min(72vw,540px); border-radius:999px; position:relative;
  transition: transform 13.6s cubic-bezier(.17,.85,.08,1); will-change: transform; pointer-events:none; transform:rotate(0deg);
}
.bg{position:absolute; inset:0; border-radius:999px; overflow:hidden}
.bg:before{ /* radial parıltı */
  content:""; position:absolute; inset:0; border-radius:999px;
  background: radial-gradient(40% 40% at 60% 45%, rgba(255,255,255,.06), transparent 60%);
}

.rim{position:absolute; inset:2.4%; border-radius:999px; box-shadow:inset 0 0 0 10px var(--rim), 0 22px 70px rgba(0,0,0,.5)}
.spokes{position:absolute; inset:0; pointer-events:none}
.spoke{position:absolute; left:50%; top:50%; width:49%; height:1px; background:rgba(255,255,255,.12); transform-origin:left center}

/* label yerleşimi */
.lblWrap{position:absolute; left:50%; top:50%; transform-origin:50% 50%; pointer-events:none}

/* CHIP tasarımı – okunabilirlik */
.chip{
  position:absolute; left:0; top:0; transform-origin:left center;
  display:inline-flex; align-items:center; gap:8px;
  padding:6px 10px; height:28px; max-width:240px;
  border-radius:999px; border:1px solid transparent;
  background: linear-gradient(180deg, var(--chip-bg), var(--chip-bg-strong));
  backdrop-filter: blur(4px);
  color:#f6fbff;
  font-weight:800; letter-spacing:.2px; text-transform:uppercase;
  font-size:12px; line-height:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  box-shadow: var(--shadow-strong);
  text-shadow: 0 1px 8px rgba(0,0,0,.65);
}
.chip .dot{width:8px;height:8px;border-radius:50%;box-shadow:0 0 12px currentColor,0 0 20px currentColor}
.chip .txt{display:inline-block; overflow:hidden; text-overflow:ellipsis}

/* merkez plaka */
.hub{position:absolute; inset:35% 35%; border-radius:999px;
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
input{background:#0e1730;border:1px solid rgba(255,255,255,.12);color:#eaf2ff;border-radius:var(--radius);padding:12px 14px;min-width:260px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}
input::placeholder{color:#6e84a8}
.btn{background:linear-gradient(90deg,#00e5ff,#4aa7ff); color:#001018; border:none;border-radius:var(--radius); padding:12px 16px; font-weight:900; cursor:pointer; box-shadow:0 8px 22px rgba(0,229,255,.25)}
.btn:disabled{opacity:.7;cursor:not-allowed}
.msg.error{color:#ffb3c0;margin-top:8px}

/* Modal (mevcut Modal bileşeninin varsayıldığı stil kancaları) */
.m-title{font-size:22px;font-weight:900;margin-bottom:8px}
.m-img{max-width:200px;max-height:200px;object-fit:contain;margin:8px auto;display:block}
.m-text{margin:6px 0 12px}
`;
/* ---------- küçük Modal bileşeni ---------- */
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  // Neden: dış tık ile kapama UX'i
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, display: "grid", placeItems: "center",
        background: "rgba(5,10,24,.55)", backdropFilter: "blur(4px)", zIndex: 50,
      }}
    >
      <div style={{
        background: "linear-gradient(180deg,#0c1636,#0c142e)", border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 14, padding: 16, minWidth: 280, maxWidth: 360, color: "#eaf2ff",
        boxShadow: "0 18px 60px rgba(0,0,0,.55)"
      }}>
        {children}
      </div>
    </div>
  );
}
