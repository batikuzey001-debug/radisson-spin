// web/src/pages/RadiCark.tsx
import { useEffect, useMemo, useState } from "react";

type Prize = { id: number; label: string; wheelIndex: number };
type VerifyIn = { code: string; username: string };
type VerifyOut = { targetIndex: number; prizeLabel: string; spinToken: string };
type CommitIn = { code: string; spinToken: string };

const API = import.meta.env.VITE_API_BASE_URL;

/* PARAMETRELER */
const LOOPS = 14;          // uzun dönüş için tekrar
const VISIBLE = 5;         // 5 satır görünür
const ITEM_H = 86;         // satır yüksekliği
const SPIN_TIME = 7.5;     // saniye

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

  // daima ortadaki satırın pikseli
  const centerOffset = (VISIBLE * ITEM_H) / 2 - ITEM_H / 2;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API}/api/prizes`);
        const rows: Prize[] = await r.json();
        // backend sırasını garanti et
        setPrizes((rows || []).slice().sort((a, b) => a.wheelIndex - b.wheelIndex));
      } catch (e: any) {
        setErr(e?.message ?? "Ödüller alınamadı");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // uzun reel
  const reelItems = useMemo(() => {
    if (!prizes.length) return [];
    const labels = prizes.map((p) => p.label);
    const a: string[] = [];
    for (let i = 0; i < LOOPS; i++) a.push(...labels);
    return a;
  }, [prizes]);

  // anlık merkez index (sadece bilgi amaçlı; highlight result gelince yapılacak)
  const centerIndex = useMemo(
    () => Math.round((centerOffset - translate) / ITEM_H),
    [translate, centerOffset]
  );

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
      const targetIndexInReel = (LOOPS - 2) * n + safeIndex;  // uzun dönüş
      const targetY = targetIndexInReel * ITEM_H - centerOffset;

      setDuration(0); setTranslate(0);
      await new Promise(r => requestAnimationFrame(() => r(null)));
      setDuration(SPIN_TIME); setTranslate(-targetY);

      setTimeout(async () => {
        try { await postJson(`${API}/api/commit-spin`, { code, spinToken: vr.spinToken } as CommitIn, true); } catch {}

        // ✅ Görselde ortada kalan satırdan etiketi oku (UI ile %100 eşleşir)
        const finalCenterIndex = Math.round((centerOffset - (-targetY)) / ITEM_H);
        const labelFromUI = reelItems[finalCenterIndex] ?? vr.prizeLabel;

        setResult(labelFromUI);
        setSpinning(false);
      }, SPIN_TIME * 1000 + 150);
    } catch (e: any) {
      setErr(String(e?.message || "Spin başarısız"));
      setSpinning(false);
    }
  };

  return (
    <main className={`slot ${spinning ? "is-spinning" : "is-idle"}`}>
      {/* Başlık */}
      <header className="hero">
        <h1 className="title">
          <span className="stroke">RADİ</span>
          <span className="glow">ÇARK</span>
        </h1>
      </header>

      {/* UI DIŞI LED ŞERİT – üst (başlığın altında) */}
      <div className="uiStrip top" aria-hidden />

      {/* Reel Alanı (UI) */}
      <section className="reelWrap">
        {/* Logo sadece UI içinde */}
        <div className="slotLogo" aria-hidden />
        {/* Merkez seçici çizgi */}
        <div className="selectLine" />
        {/* İçerik */}
        <div
          className="reel"
          style={{ transform: `translateY(${translate}px)`, transition: `transform ${duration}s cubic-bezier(.12,.9,.06,1)` }}
        >
          {reelItems.map((txt, i) => {
            const isWin = !!result && i === centerIndex; // yalnızca spin bitince highlight
            return (
              <div key={i} className={`item ${isWin ? "win" : ""}`} style={{ height: ITEM_H }}>
                {txt}
              </div>
            );
          })}
        </div>
      </section>

      {/* UI DIŞI LED ŞERİT – alt (formun üstünde) */}
      <div className="uiStrip bottom" aria-hidden />

      {/* FORM */}
      <section className="panel">
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Kullanıcı Adı" />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Kod" />
        <button className="btn" onClick={onSpin} disabled={spinning || loading}>
          {spinning ? "Dönüyor…" : "Çarkı Çevir"}
        </button>

        {result && <div className="result">Kazandınız: <b>{result}</b></div>}
        {err && <div className="msg error">⚠️ {err}</div>}
      </section>

      <style>{css}</style>
    </main>
  );
}

/* helpers */
async function postJson<T = any>(url: string, body: any, allowEmpty = false): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  if (allowEmpty) {
    const t = await r.text(); if (!t) return {} as T;
    try { return JSON.parse(t) as T; } catch { return {} as T; }
  }
  return (await r.json()) as T;
}

/* styles */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@800;900&display=swap');

:root{ --text:#fff; --muted:#9fb1cc }
*{box-sizing:border-box}
.slot{max-width:600px;margin:0 auto;padding:16px 16px 24px;text-align:center;color:var(--text);position:relative}

.hero .title{font-size:42px;font-weight:900;margin:6px 0 12px}
.stroke{-webkit-text-stroke:2px rgba(255,255,255,.45);color:transparent}
.glow{color:#e8fbff;text-shadow:0 0 26px rgba(0,229,255,.6)}

/* ===== UI DIŞI LED ŞERİTLER ===== */
.uiStrip{
  height:6px; margin:8px 0; border-radius:999px;
  background: var(--strip-color, #0dff7a);
  box-shadow: 0 0 10px var(--strip-glow, rgba(13,255,122,.5));
}
.slot.is-spinning .uiStrip{ --strip-color:#ff315f; --strip-glow:rgba(255,49,95,.55) }

/* Reel alanı (UI) */
.reelWrap{
  position:relative; height:${VISIBLE * ITEM_H}px; overflow:hidden; margin:10px 0;
  border:1px solid rgba(255,255,255,.16); border-radius:16px; z-index:2;
}

/* Logo – sadece UI içinde ve görünür */
.slotLogo{
  position:absolute; left:0; right:0; top:50%; transform:translateY(-50%);
  height:42vmin; background:url('https://cdn.prod.website-files.com/68ad80d65417514646edf3a3/68adb798dfed270f5040c714_logowhite.png') no-repeat center/contain;
  opacity:.18; pointer-events:none; filter:drop-shadow(0 0 12px rgba(0,229,255,.45));
  z-index:1;
}

/* Seçici çizgi – UI içinde, item’ların üstünde */
.selectLine{
  position:absolute; left:8%; right:8%; top:calc(50% - 1px); height:2px; z-index:3;
  background:linear-gradient(90deg,transparent,#00e5ff,transparent);
  box-shadow:0 0 12px #00e5ff; border-radius:2px;
}

/* Reel içerik */
.reel{position:absolute; left:0; right:0; top:0; z-index:2}

/* Sade item (kart yok) */
.item{
  display:flex; align-items:center; justify-content:center;
  height:${ITEM_H}px;
  font-size:26px; font-weight:900; letter-spacing:.3px; color:#eaf7ff;
}
.item.win{ color:#00e5ff; text-shadow:0 0 20px #00e5ff }

/* Form */
.panel{margin-top:8px;display:flex;flex-direction:column;gap:10px}
input{padding:8px;border-radius:8px;border:1px solid #444;background:#111;color:#fff}
.btn{padding:10px;border:none;border-radius:8px;background:linear-gradient(90deg,#00e5ff,#4aa7ff);font-weight:800;cursor:pointer}
.result{margin-top:8px;font-weight:900;color:#0f0}
.msg.error{color:#f88}
`;
