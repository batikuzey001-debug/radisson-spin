// web/src/pages/RadiCark.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Tek Sütun Çark (slot tarzı) – Kutu tasarım + cam efekt
 * Oyun arka planı DÖNMEZ; sadece arka planda site logosu pulse (büyüyüp-küçülür).
 * Akış:
 *  - GET  /api/prizes         -> ödüller (wheelIndex sırası)
 *  - POST /api/verify-spin    -> { targetIndex, prizeLabel, spinToken }
 *  - Animasyon biter -> POST /api/commit-spin
 */

type Prize = { id: number; label: string; wheelIndex: number; imageUrl?: string | null };
type VerifyIn = { code: string; username: string };
type VerifyOut = { targetIndex: number; prizeLabel: string; spinToken: string; prizeImage?: string | null };
type CommitIn = { code: string; spinToken: string };

type HeaderConfig = { logo_url?: string; login_cta_text?: string; login_cta_url?: string };

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
/** Tutar -> ton/hue + tier */
function colorFromAmount(v: number): { hue: number; tier: "high" | "mid" | "low" | "mini" } {
  if (v >= 10000) return { hue: 48, tier: "high" };   // altın sarısı
  if (v >= 1000)  return { hue: 190, tier: "mid" };   // aqua/cyan
  if (v >= 100)   return { hue: 225, tier: "low" };   // mavi
  return { hue: 280, tier: "mini" };                  // mor
}

export default function RadiCark() {
  // form
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");

  // veri
  const [basePrizes, setBasePrizes] = useState<Prize[]>([]);
  const [logoUrl, setLogoUrl] = useState<string>(""); // site logosu (arka plan pulse için)
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // animasyon state
  const [spinning, setSpinning] = useState(false);
  const [spinToken, setSpinToken] = useState<string | null>(null);
  const [result, setResult] = useState<{ label: string; image?: string | null } | null>(null);

  // reel state
  const [translate, setTranslate] = useState(0);
  const [duration, setDuration] = useState(0);

  // ödülleri + logo çek
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r1 = await fetch(`${API}/api/prizes`);
        if (!r1.ok) throw new Error(`HTTP ${r1.status}`);
        const rows: Prize[] = await r1.json();
        if (!alive) return;
        const sorted = (rows || []).slice().sort((a, b) => a.wheelIndex - b.wheelIndex);
        setBasePrizes(sorted);
        // site header - logo
        try {
          const r2 = await fetch(`${API}/api/site/header`);
          if (r2.ok) {
            const cfg: HeaderConfig = await r2.json();
            setLogoUrl((cfg?.logo_url || "").trim());
          }
        } catch {/* yut */}
        setErr("");
      } catch (e: any) {
        if (alive) { setErr(e?.message ?? "Ödüller alınamadı"); setBasePrizes([]); }
      } finally {
        alive && setLoading(false);
      }
    })();
    return () => { alive = false; };
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
    if (!username.trim() || !code.trim()) { setErr("Kullanıcı adı ve kod gerekli."); return; }
    if (!basePrizes.length) { setErr("Ödül verisi yok."); return; }
    if (spinning) return;

    try {
      setSpinning(true);
      // verify
      const vr: VerifyOut = await postJson(`${API}/api/verify-spin`, {
        code: code.trim(), username: username.trim(),
      } as VerifyIn);
      setSpinToken(vr.spinToken);

      // hedef label & pozisyon (uzun dönüş için sona yakın)
      const baseLen = basePrizes.length;
      const targetIndexInReel = (LOOPS - 2) * baseLen + (vr.targetIndex % baseLen);

      // Picker ortalama için offset: containerHeight/2 - ITEM_H/2
      const centerOffset = (VISIBLE * ITEM_H) / 2 - ITEM_H / 2;
      const targetY = targetIndexInReel * ITEM_H - centerOffset;

      // Reset (transition kapalı)
      setDuration(0); setTranslate(0);
      await raf();

      // Animasyon
      setDuration(SPIN_TIME);
      setTranslate(-targetY);

      // bitiş
      setTimeout(async () => {
        try {
          await postJson(`${API}/api/commit-spin`, { code: code.trim(), spinToken: vr.spinToken } as CommitIn);
        } catch {/* idempotent */}
        setResult({ label: vr.prizeLabel, image: vr.prizeImage });
        setSpinning(false);
      }, SPIN_TIME * 1000 + 120);
    } catch (e: any) {
      setErr(String(e?.message || "Spin başarısız"));
      setSpinning(false);
    }
  };

  return (
    <main className="slot">
      {/* SABİT ARKA PLAN – sadece LOGO pulse yapar */}
      <div
        className={`bgLogo ${spinning ? "run" : ""}`}
        style={logoUrl ? { backgroundImage: `url('${logoUrl}')` } : undefined}
        aria-hidden
      />

      <header className="hero">
        <div className="title">RADİ ÇARK</div>
        <div className="sub">Tek sütun çark – şansını dene! 🎉</div>
      </header>

      {/* REEL */}
      <section className="reelWrap">
        {/* Neon çerçeve – SABİT (dönmeyecek) */}
        <div className="neon" aria-hidden />
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
            const { hue, tier } = colorFromAmount(amt);
            const isWin =
              result && txt === result.label &&
              Math.abs(translate + (i * ITEM_H - ((VISIBLE * ITEM_H) / 2 - ITEM_H / 2))) < 1;

            return (
              <div
                key={`ri-${i}`}
                className={`card ${tier} ${isWin ? "win" : ""}`}
                style={{ height: ITEM_H, ["--tint" as any]: String(hue) } as any}
                title={txt}
              >
                {/* LED halka (sabit parıltı) */}
                <div className="led" aria-hidden />
                {/* Kazanan şerit */}
                {isWin && <div className="winRibbon" aria-hidden />}
                {/* Cam gövde + yazı */}
                <div className="glass">
                  <span className="txt">{txt}</span>
                </div>
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
/* ---------------- styles ---------------- */
const css = `
:root{
  --bg1:#0b1224; --bg2:#0e1a33; --text:#eaf2ff; --muted:#9fb1cc;
}
*{box-sizing:border-box}
.slot{max-width:720px;margin:0 auto;padding:16px;color:var(--text);position:relative;}

/* SABİT ARKA PLAN – SADECE LOGO PULSE */
.bgLogo{
  position:fixed; inset:0; z-index:-2; pointer-events:none;
  background-repeat:no-repeat; background-position:center; background-size:36vmin;
  opacity:.10; filter:drop-shadow(0 0 10px rgba(0,229,255,.25));
  animation:bgPulse 3s ease-in-out infinite;
}
.bgLogo.run{ animation-duration:1.8s; opacity:.14 }
@keyframes bgPulse{ 0%{transform:scale(.98)} 50%{transform:scale(1.03)} 100%{transform:scale(.98)} }

.hero{display:grid;place-items:center;margin:6px 0 10px}
.title{font-weight:1000;font-size:clamp(26px,5vw,38px);letter-spacing:2px}
.sub{color:#9fb1cc}

/* Reel alanı */
.reelWrap{
  position:relative; height:${VISIBLE * ITEM_H}px; overflow:hidden; border-radius:16px;
  background:#0a1327;                 /* sade koyu */
  border:1px solid rgba(255,255,255,.10);
  box-shadow:0 12px 36px rgba(0,0,0,.45);
}

/* Neon çerçeve – KAPALI */
.neon{ display:none }

/* Reel (kayan içerik) */
.reel{position:absolute; left:0; right:0; top:0; will-change: transform; z-index:1}

/* Kutu – cam + hafif tint (çok düşük) */
.card{
  height:${ITEM_H}px; display:flex; align-items:center; justify-content:center; position:relative;
  margin:10px 16px; border-radius:14px; text-align:center;
  font-weight:1000; font-size:22px; letter-spacing:.4px;
  color:#fdfdff; text-shadow:0 2px 10px rgba(0,0,0,.75);
  border:1px solid rgba(255,255,255,.10);
  background:
    linear-gradient(180deg, hsla(var(--tint, 200) 90% 55% / .10), hsla(var(--tint, 200) 90% 55% / .06)),
    linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.04));
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.05), 0 8px 20px rgba(0,0,0,.25);
  overflow:hidden;
}
/* Cam gövde */
.glass{
  position:absolute; inset:0; display:grid; place-items:center;
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
  backdrop-filter: blur(2px);
}
.card .txt{ position:relative; z-index:1; padding:0 14px }

/* LED halka – KAPALI */
.card .led{ display:none }

/* Tier kenar vurgusu (çok hafif) */
.card.high{ border-color: rgba(255,196,0,.45) }
.card.mid { border-color: rgba(0,229,255,.35) }
.card.low { border-color: rgba(120,170,255,.28) }
.card.mini{ border-color: rgba(255,255,255,.16) }

/* Kazanan şerit – belirgin ama sade */
.winRibbon{
  position:absolute; left:-10%; right:-10%; top:calc(50% - 18px); height:36px; z-index:1;
  background: linear-gradient(90deg, transparent, rgba(0,229,255,.85), transparent);
  box-shadow:0 0 18px rgba(0,229,255,.55), 0 0 26px rgba(0,229,255,.35);
  border-radius:12px;
}

/* Kazanan kutu – picker ortasında büyüt ve parlat */
.card.win{
  transform:scale(1.06);
  box-shadow:0 0 0 2px rgba(255,255,255,.12), 0 0 22px hsla(var(--tint, 200) 95% 60% / .5), 0 16px 30px rgba(0,0,0,.35);
}

/* Üst/alt maske (picker vurgusu) */
.mask{position:absolute; left:0; right:0; height:${ITEM_H}px; z-index:3;
  background:linear-gradient(180deg, rgba(5,10,20,.92), rgba(5,10,20,0));
  pointer-events:none;
}
.mask.top{top:0; transform:translateY(-38%)}
.mask.bottom{bottom:0; transform:translateY(38%)}

/* Ortadaki çizgi (picker) */
.selectLine{
  position:absolute; left:10%; right:10%; top:calc(50% - 1px); height:2px; z-index:4;
  background:linear-gradient(90deg, transparent, rgba(0,229,255,.95), transparent);
  box-shadow:0 0 12px rgba(0,229,255,.65);
  border-radius:2px; pointer-events:none;
}

/* form */
.panel{margin-top:14px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;justify-content:center;margin-bottom:10px}
.f{display:flex;flex-direction:column;gap:6px}
.f span{font-size:12px;color:var(--muted)}
input{background:#0e1730;border:1px solid rgba(255,255,255,.12);color:#eaf2ff;border-radius:10px;padding:10px 12px;min-width:260px}
.btn{background:linear-gradient(90deg,#00e5ff,#4aa7ff); color:#001018; border:none;border-radius:10px; padding:12px 16px; font-weight:900; cursor:pointer; box-shadow:0 8px 22px rgba(0,229,255,.25)}
.msg.error{color:#ffb3c0;margin-top:4px}

/* modal */
.modalWrap{position:fixed; inset:0; background:rgba(0,0,0,.55); display:grid; place-items:center; z-index:50}
.modal{position:relative; width:min(440px,92vw); background:#0f1628; border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:16px}
.m-title{font-weight:900;margin:0 0 10px}
.m-img{width:100%; height:140px; object-fit:cover; border-radius:10px; margin-bottom:8px}
.close{position:absolute;right:10px;top:10px;border:none;background:transparent;color:#9fb1cc;font-size:18px;cursor:pointer}
`;
