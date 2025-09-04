// web/src/pages/RadiSlot.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Tek Sütun Çark (Forza Horizon Spin tarzı)
 * - /api/prizes  : ödülleri al (wheelIndex'e göre sırala)
 * - /api/verify-spin : hedef index + spinToken
 * - /api/commit-spin : animasyon bitince onayla
 *
 * Görünüm:
 * ┌──────────────────────────┐
 * │                          │
 * │   (üst maske)            │
 * │ ───────── SELECT WINDOW ─│  ← ortadaki çizgi/maske (kazanan burada durur)
 * │   (alt maske)            │
 * │                          │
 * └──────────────────────────┘
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

// Kaç tur dönsün (toplam item yüksekliği kadar)
const LOOPS = 18; // daha az / çok döndürmek için 12–24 arası deneyebilirsin

export default function RadiSlot() {
  // form
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");

  const [basePrizes, setBasePrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // animasyon
  const [spinning, setSpinning] = useState(false);
  const [spinToken, setSpinToken] = useState<string | null>(null);
  const [result, setResult] = useState<{ label: string; image?: string | null } | null>(null);

  // reel
  const itemHRef = useRef<number>(0);
  const reelRef = useRef<HTMLDivElement | null>(null);
  const [translate, setTranslate] = useState(0); // px
  const [duration, setDuration] = useState(0);   // sn

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

  // reel içeriği: listeyi defalarca tekrar et
  const reelItems = useMemo(() => {
    if (!basePrizes.length) return [];
    const labels = basePrizes.map((p) => p.label);
    const arr: string[] = [];
    for (let i = 0; i < LOOPS; i++) arr.push(...labels);
    return arr;
  }, [basePrizes]);

  // ilk yüklemede item yüksekliği ölç
  useEffect(() => {
    const first = document.querySelector(".slotItem") as HTMLElement | null;
    if (first) {
      itemHRef.current = first.getBoundingClientRect().height;
    }
  }, [reelItems.length]);

  const onSpin = async () => {
    setErr(""); setResult(null);
    if (!username.trim() || !code.trim()) {
      setErr("Kullanıcı adı ve kod gerekli.");
      return;
    }
    if (!basePrizes.length || !itemHRef.current) {
      setErr("Ödül verisi yok.");
      return;
    }
    if (spinning) return;

    try {
      setSpinning(true);

      // verify -> hedef index (basePrizes listesine göre)
      const vr: VerifyOut = await postJson(`${API}/api/verify-spin`, {
        code: code.trim(),
        username: username.trim(),
      } as VerifyIn);

      setSpinToken(vr.spinToken);

      // reel hesap: Hedef etiket basePrizes[vr.targetIndex]
      // reelItems = labels repeated; hedefi en sonda bir kez daha eklemek yerine
      // "son turda" hedefe denk gelen pozisyona kaydırıyoruz.
      const labelH = itemHRef.current;
      const totalItems = reelItems.length;
      const targetLabel = basePrizes[vr.targetIndex]?.label ?? reelItems[0];

      // reelItems içinde hedef label'ın son göründüğü index
      // (sondan arayarak en yakın olanı bul)
      let targetPos = -1;
      for (let i = totalItems - 1; i >= 0; i--) {
        if (reelItems[i] === targetLabel) {
          targetPos = i;
          break;
        }
      }
      if (targetPos < 0) targetPos = totalItems - 1;

      // Ortadaki seçici çizgi yüksekliği: container 3 item gösteriyor, ortadaki 1'i seçici
      const visibleCount = 3;
      const centerOffsetPx = Math.floor((visibleCount / 2) * labelH);

      // Başlangıç pozisyonu: 0px (tepedeki ilk item)
      // Hedef: targetPos * itemH - centerOffset
      const targetY = targetPos * labelH - centerOffsetPx;

      // Daha doğal: önce küçük bir "kick" – anında küçük negatif translate
      // (transition yokken uygula -> reflow -> transition ile hedefe git)
      setDuration(0);
      setTranslate(0); // reset
      await raf();

      // Animasyon parametreleri
      const SPIN_TIME = 7.2; // saniye (yeterince yavaş)
      setDuration(SPIN_TIME);
      setTranslate(-targetY);

      // animasyon bitişi
      setTimeout(async () => {
        try {
          if (spinToken) {
            await postJson(`${API}/api/commit-spin`, {
              code: code.trim(),
              spinToken: vr.spinToken,
            } as CommitIn);
          }
        } catch (e) {
          // yutsak da olur; backend idempotent
        }
        setResult({ label: vr.prizeLabel, image: vr.prizeImage });
        setSpinning(false);
      }, (SPIN_TIME * 1000) + 80);
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
        {/* seçici pencere */}
        <div className="mask top" />
        <div className="mask bottom" />
        <div className="selectLine" />
        <div
          ref={reelRef}
          className="reel"
          style={{
            transform: `translateY(${translate}px)`,
            transition: `transform ${duration}s cubic-bezier(.15,.85,.08,1)`,
          }}
        >
          {reelItems.map((txt, i) => (
            <div className="slotItem" key={`ri-${i}`}>{txt}</div>
          ))}
        </div>
      </section>

      {/* FORM */}
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

      {/* RESULT */}
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

/* helpers */
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
function raf() { return new Promise((res) => requestAnimationFrame(() => res(null))); }

/* styles */
const css = `
:root{
  --bg:#0b1224; --text:#eaf2ff; --muted:#9fb1cc; --aqua:#00e5ff;
}
*{box-sizing:border-box}
.slot{max-width:560px;margin:0 auto;padding:16px;color:var(--text)}
.hero{display:grid;place-items:center;margin:6px 0 10px}
.title{font-weight:1000;font-size:clamp(26px,5vw,38px);letter-spacing:2px}
.sub{color:var(--muted)}

.reelWrap{
  position:relative; height:240px; overflow:hidden; border-radius:14px;
  background:linear-gradient(180deg,#07122a,#0a1733);
  border:1px solid rgba(255,255,255,.12); box-shadow:0 10px 40px rgba(0,0,0,.35);
}
.reel{
  position:absolute; left:0; right:0; top:0;
  will-change: transform;
}
.slotItem{
  height:80px; display:grid; place-items:center; font-weight:1000;
  font-size:22px; letter-spacing:.4px;
  color:#fdfdff; text-shadow:0 2px 12px rgba(0,0,0,.8);
  border-bottom:1px dashed rgba(255,255,255,.06);
}

/* seçici pencere */
.mask{position:absolute; left:0; right:0; height:80px; z-index:2;
  background:linear-gradient(180deg, rgba(5,10,20,.85), rgba(5,10,20,0));
  pointer-events:none;
}
.mask.top{top:0; transform:translateY(-20%)}
.mask.bottom{bottom:0; transform:translateY(20%)}

.selectLine{
  position:absolute; left:10%; right:10%; top:calc(50% - 1px); height:2px; z-index:3;
  background:linear-gradient(90deg, transparent, rgba(0,229,255,.95), transparent);
  box-shadow:0 0 12px rgba(0,229,255,.65);
  pointer-events:none;
}

/* form */
.panel{margin-top:12px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;justify-content:center}
.f{display:flex;flex-direction:column;gap:6px}
.f span{font-size:12px;color:var(--muted)}
input{background:#0e1730;border:1px solid rgba(255,255,255,.12);color:#eaf2ff;border-radius:10px;padding:10px 12px;min-width:210px}
.btn{background:linear-gradient(90deg,#00e5ff,#4aa7ff); color:#001018; border:none;border-radius:10px; padding:12px 16px; font-weight:900; cursor:pointer; box-shadow:0 8px 20px rgba(0,229,255,.25)}
.msg.error{color:#ffb3c0;margin-top:8px}

/* result modal */
.modalWrap{position:fixed; inset:0; background:rgba(0,0,0,.55); display:grid; place-items:center; z-index:50}
.modal{position:relative; width:min(420px,92vw); background:#0f1628; border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:16px}
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
