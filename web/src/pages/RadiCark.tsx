// web/src/pages/RadiCark.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Radi Çark – Çarkıfelek görünümü
 * - Seçim BACKEND’te: /api/verify-spin -> { targetIndex (orijinal ödül index), spinToken }
 * - Bu sayfa sadece görselleştirir; 32 dişli ince çark çizer ve yavaş döndürür (≈ 9–12 sn)
 * - Orijinal ödül listesi az ise dilimler 32’ye tamamlanır (sıralı tekrarla)
 */

type Prize = {
  id: number;
  label: string;
  wheelIndex: number;   // backend’te kullanılan sıralama/index
  imageUrl?: string | null;
};

type VerifyIn = { code: string; username: string };
type VerifyOut = {
  targetIndex: number;      // orijinal listede kazanan index (wheelIndex sırasına göre)
  prizeLabel: string;
  spinToken: string;
  prizeImage?: string | null;
};
type CommitIn = { code: string; spinToken: string };

const API = import.meta.env.VITE_API_BASE_URL;
const SEGMENTS = 32; // İnce ince 32 dilim

type Slice = {
  prize: Prize;
  sourceIndex: number;   // orijinal sıralı listede index (0..N-1)
  labelShort: string;    // kısa etiket (dilim içine sığması için)
  imageUrl?: string | null;
};

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
  const [result, setResult] = useState<{ label: string; image?: string | null } | null>(null);

  // wheel rotation
  const [angle, setAngle] = useState(0);
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
        const sorted = (rows || [])
          .slice()
          .sort((a, b) => a.wheelIndex - b.wheelIndex)
          .map((p, i) => ({ ...p, wheelIndex: i })); // sıralı ve kompakt index
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

  // 32 dilime genişlet
  const slices: Slice[] = useMemo(() => {
    if (!prizes.length) return [];
    const base = prizes;
    const expanded: Slice[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const p = base[i % base.length];
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

  // spin
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

      // 1) verify -> backend kazanan orijinal index + token
      const vr: VerifyOut = await postJson(`${API}/api/verify-spin`, {
        code: code.trim(),
        username: username.trim(),
      } as VerifyIn);

      // 2) 32 dilim içinde hedef olarak kullanılacak slice’ı bul
      //    Kaybeden/aynı ödül tekrarları arasında rastgele bir tanesini seçiyoruz.
      const candidatePositions = slices
        .map((s, idx) => ({ idx, s }))
        .filter((x) => x.s.sourceIndex === vr.targetIndex)
        .map((x) => x.idx);

      if (!candidatePositions.length) {
        throw new Error("Hedef dilim eşleşmedi (konfigürasyon uyuşmazlığı).");
      }
      const targetSliceIndex = candidatePositions[Math.floor(Math.random() * candidatePositions.length)];

      // 3) hedef açıyı hesapla (çok daha yavaş ve uzun dönüş)
      // Pointer tepe noktasında (0deg). Dilim merkezi = (i + 0.5) * segAngle
      const center = (targetSliceIndex + 0.5) * segAngle;
      const fullTurns = randInt(9, 12); // 9–12 tur
      const base = fullTurns * 360;
      const targetAngle = base + (360 - center);

      // küçük jitter (±1.2°) – doğal
      const jitter = (Math.random() - 0.5) * 2.4;
      const absolute = lastAngleRef.current + targetAngle + jitter;

      // animasyon
      setAngle(absolute);

      // animasyon süresi (CSS ile eşleşiyor)
      const DURATION = 10500; // ms
      await wait(DURATION + 150);

      // 4) commit
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
        <p className="muted">Seçim backend’te; çark görseli burada. 32 dişli, yavaş ve gerçekçi dönüş.</p>
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
        <div className="pointer">
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
          {/* dış kadran ve ayırıcı çizgiler */}
          <div className="rim" />
          <div className="spokes">
            {Array.from({ length: slices.length }).map((_, i) => (
              <div key={i} className="spoke" style={{ transform: `rotate(${i * segAngle}deg)` }} />
            ))}
          </div>

          {/* dilimler */}
          {slices.map((sl, i) => (
            <Slice key={`s-${i}-${sl.prize.id}`} index={i} segAngle={segAngle} label={sl.labelShort} imageUrl={sl.imageUrl || undefined} />
          ))}

          {/* merkez */}
          <div className="hub">
            <div className="hub2">RADISSON</div>
          </div>
        </div>
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
function shortenLabel(s: string): string {
  // Dilime sığacak şekilde kısalt
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= 10) return t;
  // Para ifadelerini öne çıkar (₺1000 -> 1K)
  const m = t.match(/([₺$€]?\s?\d{3,})/);
  if (m) return m[1].replace(/\s/g, "");
  return t.slice(0, 9) + "…";
}

/* ---------- slice ---------- */
function Slice({ index, segAngle, label, imageUrl }: { index: number; segAngle: number; label: string; imageUrl?: string }) {
  const rotate = index * segAngle; // her dilimi döndür
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
  --bg1:#0b1224; --bg2:#0e1a33; --text:#eaf2ff; --muted:#9fb1cc;
  --ring:#091227; --rim:#0c1430; --pointer:#ff3b6b; --glow:#00e5ff;
  --sliceA:#0f1a38; --sliceB:#122046;
}
.spin{max-width:1200px;margin:0 auto;padding:16px;color:var(--text)}
.head h1{margin:0 0 6px}
.muted{color:var(--muted)}

.panel{margin:10px 0 16px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}
.f{display:flex;flex-direction:column;gap:6px}
.f span{font-size:12px;color:var(--muted)}
input{
  background:#0e1730;border:1px solid rgba(255,255,255,.12);color:var(--text);
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
.stage{position:relative;display:grid;place-items:center;margin:16px 0 18px}
.pointer{
  position:absolute; top:-10px;
  width:0; height:0; border-left:14px solid transparent; border-right:14px solid transparent; border-bottom:20px solid var(--pointer);
  filter:drop-shadow(0 0 10px rgba(255,59,107,.6));
}
.pointer .pin{
  position:absolute; top:-8px; left:-3px; width:6px; height:6px; border-radius:50%;
  background:#ffe0ea; box-shadow:0 0 10px rgba(255,59,107,.7);
}
.wheel{
  width:min(92vw,720px); height:min(92vw,720px);
  border-radius:999px; background:var(--ring); border:1px solid rgba(255,255,255,.15); position:relative;
  box-shadow:inset 0 0 0 10px var(--rim), 0 18px 60px rgba(0,0,0,.45);
  transform: rotate(var(--angle, 0deg));
  transition: transform 10.5s cubic-bezier(.1,.98,.08,1);
  will-change: transform;
}
/* dış çember ve ayırıcı çizgiler */
.rim{position:absolute; inset:2%; border-radius:999px; box-shadow:inset 0 0 0 2px rgba(255,255,255,.08), inset 0 0 40px rgba(0,229,255,.12);}
.spokes{position:absolute; inset:0}
.spoke{
  position:absolute; left:50%; top:50%; width:48%; height:1px; background:rgba(255,255,255,.10);
  transform-origin:left center;
}

/* dilimler */
.slice{position:absolute; inset:0; transform-origin:50% 50%}
.sector{
  position:absolute; left:50%; top:50%;
  width:50%; height:calc(3.1416 * 2px); /* görsel çizgi kalınlığı */
  transform-origin:left center;
  background:linear-gradient(90deg, var(--bg) 0%, var(--bg) 60%, transparent 100%);
}
.sector::before{
  content:""; position:absolute; left:0; top:-9999px; right:0; bottom:-9999px; /* çizgi yerine yay gibi dolgu */
  background:conic-gradient(from calc(-1 * var(--label-rot) + 90deg), var(--bg) 0deg, var(--bg) var(--label-rot), transparent var(--label-rot));
  opacity:.95;
}
.slice:nth-child(odd) .sector::before{ --bg: var(--sliceA); }
.slice:nth-child(even) .sector::before{ --bg: var(--sliceB); }

/* etiket */
.label{
  position:absolute; left:50%; top:50%; transform: rotate(var(--label-rot)) translate(36%, -50%);
  transform-origin:left center; display:flex; align-items:center; gap:6px;
  color:#eaf2ff; text-shadow:0 2px 10px rgba(0,0,0,.6); font-weight:900;
}
.label img{ width:20px; height:20px; border-radius:4px; object-fit:cover; opacity:.95 }
.label span{ font-size:13px; max-width:120px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }

/* merkez */
.hub{
  position:absolute; inset:36% 36%;
  border-radius:999px; background:radial-gradient(circle at 30% 35%, #1d2e57, #0c1430 60%);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.08), inset 0 0 40px rgba(0,229,255,.15), 0 10px 30px rgba(0,0,0,.45);
  display:grid; place-items:center;
}
.hub2{
  font-weight:900; letter-spacing:.8px; color:#def4ff;
  text-shadow:0 2px 12px rgba(0,229,255,.35);
}

/* modal */
.modalWrap{position:fixed; inset:0; background:rgba(0,0,0,.55); display:grid; place-items:center; z-index:70}
.modal{position:relative; width:min(520px,94vw); background:#0f1628; border:1px solid rgba(255,255,255,.12); border-radius:16px; padding:16px; color:#eaf2ff; box-shadow:0 20px 60px rgba(0,0,0,.5)}
.close{position:absolute; right:10px; top:10px; border:none; background:transparent; color:#9fb1cc; cursor:pointer; font-size:18px}
.m-title{font-weight:900; margin:0 0 10px}
.m-img{width:100%; height:160px; object-fit:cover; border-radius:10px; margin-bottom:10px}
.m-text{margin:8px 0 14px}
`;
