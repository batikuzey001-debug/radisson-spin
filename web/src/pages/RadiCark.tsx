// web/src/pages/RadiCark.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Radi Çark (Frontend görsel + animasyon)
 * - Seçim BACKEND'te: /api/verify-spin -> targetIndex, spinToken
 * - Animasyon bittiğinde /api/commit-spin
 * - Dilimler /api/prizes ile çizilir (eş dilim)
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

export default function RadiCark() {
  // form state
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");

  // prizes
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loadingPrizes, setLoadingPrizes] = useState(true);
  const [err, setErr] = useState("");

  // spin state
  const [spinning, setSpinning] = useState(false);
  const [spinToken, setSpinToken] = useState<string | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [result, setResult] = useState<{ label: string; image?: string | null } | null>(null);

  // wheel rotation
  const [angle, setAngle] = useState(0);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const lastAngleRef = useRef(0);

  // fetch prizes
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
        const sorted = (rows || []).slice().sort((a, b) => a.wheelIndex - b.wheelIndex);
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

  const segAngle = useMemo(() => (prizes.length ? 360 / prizes.length : 0), [prizes.length]);

  // spin
  const onSpin = async () => {
    setErr("");
    setResult(null);

    if (!code.trim() || !username.trim()) {
      setErr("Kullanıcı adı ve kod gerekli.");
      return;
    }
    if (!prizes.length) {
      setErr("Ödül verisi yok.");
      return;
    }
    if (spinning) return;

    try {
      setSpinning(true);

      // 1) verify -> targetIndex + token
      const vr: VerifyOut = await postJson(`${API}/api/verify-spin`, {
        code: code.trim(),
        username: username.trim(),
      } as VerifyIn);

      setTargetIndex(vr.targetIndex);
      setSpinToken(vr.spinToken);

      // 2) hesap hedef açı (tam turlar + hedef dilimin merkezi)
      // Pointer tepe noktasında (0deg), wheel saat yönünde döner.
      // Dilim merkezi: (target + 0.5) * segAngle. Stop açısı = totalTurns*360 + (360 - centerAngle)
      const center = (vr.targetIndex + 0.5) * segAngle;
      const fullTurns = randInt(5, 7); // 5~7 tur
      const base = fullTurns * 360;
      const targetAngle = base + (360 - center);

      // küçük varyasyon (±2 deg) – daha doğal
      const jitter = (Math.random() - 0.5) * 4;
      const absolute = lastAngleRef.current + targetAngle + jitter;

      // animasyon
      setAngle(absolute);

      // animasyon süresini dinle (CSS ile eşleşiyor)
      const DURATION = 5200; // ms
      await wait(DURATION + 100);

      // 3) commit
      await postJson(`${API}/api/commit-spin`, {
        code: code.trim(),
        spinToken: vr.spinToken,
      } as CommitIn);

      setResult({ label: vr.prizeLabel, image: vr.prizeImage });
      lastAngleRef.current = absolute;
    } catch (e: any) {
      const msg = String(e?.message || "Spin başarısız");
      setErr(msg);
    } finally {
      setSpinning(false);
    }
  };

  return (
    <main className="spin">
      <header className="head">
        <h1>🎡 Radi Çark</h1>
        <p className="muted">Ödül seçimi backend’te yapılır; görsel animasyon bu sayfada.</p>
      </header>

      {/* form */}
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

      {/* wheel */}
      <section className="stage">
        <div className="pointer" />
        <div
          className={`wheel ${spinning ? "spin" : ""}`}
          ref={wheelRef}
          style={{
            ["--angle" as any]: `${angle}deg`,
            ["--seg" as any]: `${segAngle}deg`,
          }}
        >
          {/* dilimler */}
          {prizes.map((p, i) => (
            <Slice key={p.id} index={i} segAngle={segAngle} label={p.label} imageUrl={p.imageUrl || undefined} />
          ))}
          {/* merkez */}
          <div className="hub">RADISSON</div>
        </div>
      </section>

      {/* legend */}
      <section className="legend">
        {loadingPrizes ? (
          <span className="muted">Ödüller yükleniyor…</span>
        ) : (
          <ul>
            {prizes.map((p) => (
              <li key={p.id}>
                <b>#{p.wheelIndex}</b> {p.label}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* result modal */}
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

/* ---------- slice ---------- */
function Slice({ index, segAngle, label, imageUrl }: { index: number; segAngle: number; label: string; imageUrl?: string }) {
  const rotate = index * segAngle; // her dilimi döndür
  return (
    <div
      className="slice"
      style={
        {
          transform: `rotate(${rotate}deg)`,
          ["--label-rot" as any]: `${segAngle / 2}deg`,
        } as React.CSSProperties
      }
    >
      <div className="wedge" />
      <div className="cap" />
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
.spin{max-width:1200px;margin:0 auto;padding:16px;color:#eaf2ff}
.head h1{margin:0 0 6px}
.muted{color:#9fb1cc}

.panel{margin:10px 0 16px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}
.f{display:flex;flex-direction:column;gap:6px}
.f span{font-size:12px;color:#9fb1cc}
input{
  background:#0e1730;border:1px solid rgba(255,255,255,.12);color:#eaf2ff;
  border-radius:10px;padding:8px 10px;min-width:220px;
}
.btn{
  background:linear-gradient(90deg,#00e5ff,#4aa7ff); color:#001018; border:none;
  border-radius:10px; padding:10px 14px; font-weight:900; cursor:pointer;
  box-shadow:0 8px 22px rgba(0,229,255,.25);
}
.btn:disabled{opacity:.7;cursor:not-allowed}
.msg.error{color:#ffb3c0;margin-top:8px}

/* sahne */
.stage{position:relative; display:grid; place-items:center; margin:10px 0 14px}
.pointer{
  position:absolute; top:-6px; width:0; height:0; border-left:10px solid transparent; border-right:10px solid transparent; border-bottom:14px solid #ff3b6b;
  filter:drop-shadow(0 0 6px rgba(255,59,107,.6));
}
.wheel{
  width:min(78vw,560px); height:min(78vw,560px);
  border-radius:999px; background:#0b1327; border:1px solid rgba(255,255,255,.14); position:relative;
  box-shadow:inset 0 0 0 6px #0c1430, 0 18px 60px rgba(0,0,0,.35);
  transition: transform 5.2s cubic-bezier(.24,.9,.08,1);
  transform: rotate(var(--angle, 0deg));
}
.wheel.spin{will-change: transform}

.slice{
  position:absolute; inset:0; transform-origin:50% 50%;
}
.wedge{
  position:absolute; left:50%; top:50%; width:50%; height:2px; transform-origin:left center;
  background:linear-gradient(90deg, rgba(255,255,255,.22), rgba(255,255,255,0));
  transform: rotate(0deg);
}
/* kapama yayları */
.cap{
  position:absolute; inset:10%; border-radius:999px; border:1px dashed rgba(255,255,255,.08);
}

/* etiket */
.label{
  position:absolute; left:50%; top:50%; transform: rotate(var(--label-rot)) translate(30%, -50%);
  transform-origin:left center; display:flex; align-items:center; gap:8px;
  color:#eaf2ff; text-shadow:0 2px 10px rgba(0,0,0,.5); font-weight:900;
}
.label img{ width:24px; height:24px; border-radius:6px; object-fit:cover; }
.label span{ font-size:14px; max-width:160px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* merkez */
.hub{
  position:absolute; inset:40% 40%;
  display:grid; place-items:center;
  background:radial-gradient(circle at 30% 30%, #12214a, #0b1430);
  border:1px solid rgba(255,255,255,.12); border-radius:999px; font-weight:900; letter-spacing:.6px;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.05), 0 10px 20px rgba(0,0,0,.35);
}

/* legend */
.legend ul{display:flex;gap:10px;flex-wrap:wrap;list-style:none;padding:0;margin:0}
.legend li{padding:6px 10px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(255,255,255,.05)}

/* modal */
.modalWrap{position:fixed; inset:0; background:rgba(0,0,0,.55); display:grid; place-items:center; z-index:70}
.modal{position:relative; width:min(520px,94vw); background:#0f1628; border:1px solid rgba(255,255,255,.12); border-radius:16px; padding:16px; color:#eaf2ff; box-shadow:0 20px 60px rgba(0,0,0,.5)}
.close{position:absolute; right:10px; top:10px; border:none; background:transparent; color:#9fb1cc; cursor:pointer; font-size:18px}
.m-title{font-weight:900; margin:0 0 10px}
.m-img{width:100%; height:160px; object-fit:cover; border-radius:10px; margin-bottom:10px}
.m-text{margin:8px 0 14px}
`;
