// web/src/pages/RadiCark.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Tek Sütun Çark (slot tarzı) – Sade, net, okunur
 * Akış:
 *  - GET  /api/prizes         -> ödüller (wheelIndex sırası)
 *  - POST /api/verify-spin    -> { targetIndex, prizeLabel, spinToken }
 *  - Animasyon biter -> POST /api/commit-spin
 *
 * Özellikler:
 *  - Kutu tasarımında ödüller, tutara göre renklenir (yüksek ödüller daha neon).
 *  - Kutuların etrafında dönen neon LED efekti.
 *  - Ortadaki picker cam efekti + çizgi.
 *  - Kazanan kutu sonunda picker ortasına denk gelir, soft zoom + glow alır.
 */

type Prize = { id: number; label: string; wheelIndex: number; imageUrl?: string | null };
type VerifyIn = { code: string; username: string };
type VerifyOut = {
  targetIndex: number;
  prizeLabel: string;
  spinToken: string;
  prizeImage?: string | null;
};
type CommitIn = { code: string; spinToken: string };

const API = import.meta.env.VITE_API_BASE_URL;

// Döngü sayısı (liste kaç kez tekrar edilsin)
const LOOPS = 14;
// Görünür satır sayısı (picker ortada konumlanır)
const VISIBLE = 3;
// Kutu (öğe) yüksekliği
const ITEM_H = 96;
// Animasyon süresi (saniye)
const SPIN_TIME = 8.2;

/** Label içinden tutarı tahmin et (örn. "₺10.000" -> 10000) */
function parseAmount(label: string): number {
  const s = label.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
/** Tutar -> görsel tier */
function tierFromAmount(v: number): "high" | "mid" | "low" | "mini" {
  if (v >= 10000) return "high";
  if (v >= 1000) return "mid";
  if (v >= 100) return "low";
  return "mini";
}

export default function RadiCark() {
  // form
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");

  // veri
  const [basePrizes, setBasePrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // animasyon state
  const [spinning, setSpinning] = useState(false);
  const [spinToken, setSpinToken] = useState<string | null>(null);
  const [result, setResult] = useState<{ label: string; image?: string | null } | null>(null);

  // reel state
  const [translate, setTranslate] = useState(0);
  const [duration, setDuration] = useState(0);

  // ödülleri çek
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
        const sorted = (rows || []).slice().sort((a, b) => a.wheelIndex - b.wheelIndex);
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

  // Reel içeriği: etiketlerin LOOPS kez tekrarı
  const reelItems = useMemo(() => {
    if (!basePrizes.length) return [];
    const labels = basePrizes.map((p) => p.label);
    const arr: string[] = [];
    for (let i = 0; i < LOOPS; i++) arr.push(...labels);
    return arr;
  }, [basePrizes]);

  // hedef pozisyonu hesapla ve animasyonu başlat
  const onSpin = async () => {
    setErr(""); setResult(null);
    if (!username.trim() || !code.trim()) {
      setErr("Kullanıcı adı ve kod gerekli.");
      return;
    }
    if (!basePrizes.length) {
      setErr("Ödül verisi yok.");
      return;
    }
    if (spinning) return;

    try {
      setSpinning(true);

      // verify
      const vr: VerifyOut = await postJson(`${API}/api/verify-spin`, {
        code: code.trim(),
        username: username.trim(),
      } as VerifyIn);
      setSpinToken(vr.spinToken);

      // hedef label & pozisyon (uzun dönüş için listenin son tekrarlarına denk getir)
      const lbl = basePrizes[vr.targetIndex]?.label ?? basePrizes[0].label;
      const baseLen = basePrizes.length;
      const totalItems = baseLen * LOOPS;
      // Hedefi sona yakın (sondan ikinci döngü) denk getirelim
      const targetIndexInReel = (LOOPS - 2) * baseLen + (vr.targetIndex % baseLen);

      // Picker ortalama için offset: containerHeight/2 - ITEM_H/2
      const centerOffset = (VISIBLE * ITEM_H) / 2 - ITEM_H / 2;
      const targetY = targetIndexInReel * ITEM_H - centerOffset;

      // Reset (transition kapalı)
      setDuration(0);
      setTranslate(0);
      await raf();

      // Animasyon
      setDuration(SPIN_TIME);
      setTranslate(-targetY);

      // bitiş
      setTimeout(async () => {
        try {
          await postJson(`${API}/api/commit-spin`, {
            code: code.trim(),
            spinToken: vr.spinToken,
          } as CommitIn);
        } catch {
          /* yutulabilir */
        }
        setResult({ label: vr.prizeLabel, image: vr.prizeImage });
        setSpinning(false);
      }, SPIN_TIME * 1000 + 100);
    } catch (e: any) {
      setErr(String(e?.message || "Spin başarısız"));
      setSpinning(false);
    }
  };

  return (
    <main className="slot">
      <header className="hero">
        <div className="title">RADİ ÇARK</div>
        <div className="sub">Tek sütun çark – şansını dene! 🎉</div>
      </header>

      {/* REEL */}
      <section className="reelWrap">
        {/* hareketli neon LED çerçeve */}
        <div className={`neon ${spinning ? "run" : ""}`} aria-hidden />
        {/* üst/alt maskeler */}
        <div className="mask top" />
        <div className="mask bottom" />
        {/* picker çizgisi */}
        <div className="selectLine" />

        <div
          className="reel"
          style={{
            transform: `translateY(${translate}px)`,
            transition: `transform ${duration}s cubic-bezier(.12,.9,.06,1)`,
          }}
        >
          {reelItems.map((txt, i) => {
            const amt = parseAmount(txt);
            const tier = tierFromAmount(amt);
            const isWin =
              result && txt === result.label && // sadece label uyuşması yeterli
              Math.abs(translate + (i * ITEM_H - ((VISIBLE * ITEM_H) / 2 - ITEM_H / 2))) < 1; // merkezde mi?

            return (
              <div
                key={`ri-${i}`}
                className={`card ${tier} ${isWin ? "win" : ""}`}
                style={{ height: ITEM_H }}
                title={txt}
              >
                <div className="led" aria-hidden />
                <div className="txt">{txt}</div>
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

      {/* SONUÇ MODALI */}
      {result && (
        <Modal onClose={() => setResult(null)}>
          <div className="m-title">Tebrikler 🎉</div>
          {result.image && <img className="m-img" src={result.image} alt="" />}
          <div className="m-text">Kazandığın ödül: <b>{result.label}</b></div>
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
function raf() { return new Promise((res) => requestAnimationFrame(() => res(null))); }

/* ---------------- styles ---------------- */
const css = `
:root{
  --bg1:#0b1224; --bg2:#0e1a33; --text:#eaf2ff; --muted:#9fb1cc;
}
*{box-sizing:border-box}
.slot{max-width:680px;margin:0 auto;padding:16px;color:var(--text)}
.hero{display:grid;place-items:center;margin:6px 0 10px}
.title{font-weight:1000;font-size:clamp(26px,5vw,38px);letter-spacing:2px}
.sub{color:var(--muted)}

/* Reel alanı */
.reelWrap{
  position:relative; height:${VISIBLE * ITEM_H}px; overflow:hidden; border-radius:16px;
  background:linear-gradient(180deg,#07122a,#0a1733 40%, #09142f);
  border:1px solid rgba(255,255,255,.12);
  box-shadow:0 12px 40px rgba(0,0,0,.4), inset 0 0 50px rgba(0,229,255,.06);
}

/* Neon LED çerçeve – döner animasyon */
.neon{
  pointer-events:none; position:absolute; inset:-2px; border-radius:18px;
  background: conic-gradient(from 0deg,
    rgba(0,229,255,.0) 0deg 20deg,
    rgba(0,229,255,.65) 20deg 40deg,
    rgba(255,80,160,.65) 40deg 60deg,
    rgba(0,229,255,.65) 60deg 80deg,
    rgba(0,229,255,.0) 80deg 360deg);
  filter:blur(6px); opacity:.6; z-index:2;
  animation:neonIdle 2.4s ease-in-out infinite alternate;
}
.neon.run{ animation:neonSpin 1.2s linear infinite; opacity:.9 }
@keyframes neonIdle{ from{filter:blur(5px)} to{filter:blur(8px)} }
@keyframes neonSpin{ from{transform:rotate(0)} to{transform:rotate(360deg)} }

.reel{position:absolute; left:0; right:0; top:0; will-change: transform; z-index:1}

/* Kutu – tutara göre renk */
.card{
  height:${ITEM_H}px; display:flex; align-items:center; justify-content:center; position:relative;
  margin:8px 14px; border-radius:12px; text-align:center;
  font-weight:1000; font-size:22px; letter-spacing:.4px;
  color:#fdfdff; text-shadow:0 2px 10px rgba(0,0,0,.8);
  border:1px solid rgba(255,255,255,.12);
  background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.06), 0 10px 26px rgba(0,0,0,.28);
}
/* LED halkası */
.card .led{
  content:""; position:absolute; inset:-2px; border-radius:14px; z-index:0; pointer-events:none;
  background: conic-gradient(from 0deg,
    rgba(0,229,255,.0) 0 30deg,
    rgba(0,229,255,.6) 30deg 60deg,
    rgba(255,196,0,.6) 60deg 90deg,
    rgba(255,80,160,.6) 90deg 120deg,
    rgba(0,229,255,.6) 120deg 150deg,
    rgba(0,229,255,.0) 150deg 360deg);
  filter: blur(6px);
  animation: ring 2.2s linear infinite;
}
@keyframes ring{ from{transform:rotate(0)} to{transform:rotate(360deg)} }

/* Tier renkleri */
.card.high{ border-color: rgba(255,196,0,.6); box-shadow: 0 10px 30px rgba(255,196,0,.15), inset 0 0 0 1px rgba(255,255,255,.08) }
.card.mid { border-color: rgba(0,229,255,.5); box-shadow: 0 10px 30px rgba(0,229,255,.12), inset 0 0 0 1px rgba(255,255,255,.08) }
.card.low { border-color: rgba(120,170,255,.35) }
.card.mini{ border-color: rgba(255,255,255,.18) }

.card .txt{ position:relative; z-index:1; padding:0 12px }

/* Kazanan kutu – picker ortasında büyüt ve parlat */
.card.win{
  transform:scale(1.06);
  box-shadow:
    0 0 0 2px rgba(255,255,255,.12),
    0 0 20px rgba(0,229,255,.45),
    0 18px 36px rgba(0,0,0,.35);
}

/* Üst/alt maske (picker vurgusu için) */
.mask{position:absolute; left:0; right:0; height:${ITEM_H}px; z-index:3;
  background:linear-gradient(180deg, rgba(5,10,20,.95), rgba(5,10,20,0));
  pointer-events:none;
}
.mask.top{top:0; transform:translateY(-35%)}
.mask.bottom{bottom:0; transform:translateY(35%)}

/* Ortadaki çizgi (picker) */
.selectLine{
  position:absolute; left:10%; right:10%; top:calc(50% - 1px); height:2px; z-index:4;
  background:linear-gradient(90deg, transparent, rgba(0,229,255,.95), transparent);
  box-shadow:0 0 12px rgba(0,229,255,.65);
  border-radius:2px;
  pointer-events:none;
}

/* form */
.panel{margin-top:12px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;justify-content:center;margin-bottom:8px}
.f{display:flex;flex-direction:column;gap:6px}
.f span{font-size:12px;color:var(--muted)}
input{background:#0e1730;border:1px solid rgba(255,255,255,.12);color:#eaf2ff;border-radius:10px;padding:10px 12px;min-width:240px}
.btn{background:linear-gradient(90deg,#00e5ff,#4aa7ff); color:#001018; border:none;border-radius:10px; padding:12px 16px; font-weight:900; cursor:pointer; box-shadow:0 8px 22px rgba(0,229,255,.25)}
.msg.error{color:#ffb3c0;margin-top:4px}

/* modal */
.modalWrap{position:fixed; inset:0; background:rgba(0,0,0,.55); display:grid; place-items:center; z-index:50}
.modal{position:relative; width:min(440px,92vw); background:#0f1628; border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:16px}
.m-title{font-weight:900;margin:0 0 10px}
.m-img{width:100%; height:140px; object-fit:cover; border-radius:10px; margin-bottom:8px}
.close{position:absolute;right:10px;top:10px;border:none;background:transparent;color:#9fb1cc;font-size:18px;cursor:pointer}
`;

/* Modal */
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
