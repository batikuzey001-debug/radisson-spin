@@ -1,17 +1,13 @@
// web/src/components/Header.tsx
import { useEffect, useMemo, useState } from "react";
import { getHeaderConfig, type HeaderConfig } from "../api/site";

/**
 * Global Header (TV tarzı)
 * - Logo: admin CMS (logo_url boş olabilir)
 * - LIVE + sayı: saat dilimine göre min/max aralıklarda dalgalanır
 *   Kurallar (yerel saat):
 *     03:00–06:00  -> minimum seviyede
 *     06:00–15:00  -> minimum-orta arası
 *     15:00–22:00  -> maksimum seviyeye yakın
 *     22:00–03:00  -> maksimum seviyelerde
 * - Sağ: Hızlı Bonus (mock) + Giriş CTA (metin/link CMS’den)
 * Global Header
 * - Logo (CMS)
 * - LIVE sayaç (daha küçük)
 * - Sağda: Hızlı Bonus (ghost pill) + Giriş CTA (primary pill)
 * - Altındaki kırmızı çizgi (liveUnderline) yanıp kayar
 */

type HeaderConfigExt = HeaderConfig & {
@@ -25,12 +21,11 @@
  const [dir, setDir] = useState<1 | -1>(1);
  const [clicked, setClicked] = useState(false);

  // CMS'den header ayarları
  // CMS'den ayar
  useEffect(() => {
    getHeaderConfig()
      .then((data) => {
        setCfg(data as HeaderConfigExt);
        // Başlangıç değeri: saat bandına göre hedef aralıktan
        const { low, high } = calcBandRange(data);
        setOnline(randInt(low, high));
      })
@@ -42,19 +37,16 @@
      });
  }, []);

  // 4 sn'de bir online sayısını band hedeflerine doğru güncelle
  // 4 sn'de bir dalgalanma
  useEffect(() => {
    const t = setInterval(() => {
      const { low, high } = calcBandRange(cfg);
      const target = randInt(low, high);
      setOnline((n) => {
        // düşük adımlarla hedefe yaklaş (ani zıplama olmasın)
        const diff = target - n;
        const step = clamp(Math.round(diff * 0.25) + jitter(2), -120, 120);
        let next = n + step * dir;
        // sınırlar içinde tut
        next = Math.max(low, Math.min(high, next));
        // yön değiştir (çok yaklaştıysa)
        if (Math.abs(diff) < 20) setDir((d) => (d === 1 ? -1 : 1));
        return next;
      });
@@ -66,7 +58,7 @@
  return (
    <header className="hdr">
      <div className="hdr__in">
        {/* Sol: Logo + LIVE strip */}
        {/* Sol: Logo + LIVE */}
        <div className="left">
          {cfg?.logo_url ? (
            <a className="logoWrap" href="/" onClick={(e) => e.preventDefault()}>
@@ -78,23 +70,24 @@

        {/* Sağ: Hızlı Bonus + Giriş */}
        <div className="right">
          <button className="btn bonus" onClick={(e) => e.preventDefault()} title="Hızlı Bonus (demo)">
            <BellIcon />
          <button className="pill ghost" onClick={(e) => e.preventDefault()} title="Hızlı Bonus (demo)">
            <span className="ico" aria-hidden>🔔</span>
            <span>Hızlı Bonus</span>
            <span className="notif" aria-hidden />
            <span className="dot" aria-hidden />
          </button>

          <button
            className={`btn cta ${clicked ? "clicked" : ""}`}
            className="pill primary"
            onClick={() => {
              if (!cfg?.login_cta_url) return;
              setClicked(true);
              setTimeout(() => setClicked(false), 600);
              setTimeout(() => setClicked(false), 550);
              window.location.assign(cfg.login_cta_url);
            }}
            data-clicked={clicked ? "1" : "0"}
            title={cfg?.login_cta_text || "Giriş"}
          >
            <MouseClickIcon />
            <span className="ico" aria-hidden>🟢</span>
            <span>{cfg?.login_cta_text || "Giriş"}</span>
          </button>
        </div>
@@ -105,22 +98,20 @@
  );
}

/* ----------------- LIVE (kırmızı) + dijital sayı + kayan neon alt şerit ----------------- */
/* ----------------- LIVE (kırmızı) + dijital sayı + kayan neon şerit ----------------- */
function LiveStrip({ value }: { value: number }) {
  const parts = useMemo(() => splitThousands(value), [value]);
  return (
    <div className="liveWrap" aria-label="live">
      <div className="liveRow">
        <span className="liveWord">
          <span className="dot" />
          <span className="dotR" />
          LIVE
        </span>
        <span className="roller">
          {parts.map((p, i) =>
            p.kind === "sep" ? (
              <span key={`sep-${i}`} className="sep">
                .
              </span>
              <span key={`sep-${i}`} className="sep">.</span>
            ) : (
              <DigitGroup key={`grp-${i}`} digits={p.value} />
            )
@@ -148,9 +139,7 @@
    <span className="digit">
      <span className="col" style={{ transform: `translateY(-${t * 10}%)` }}>
        {Array.from({ length: 10 }).map((_, n) => (
          <span key={n} className="cell">
            {n}
          </span>
          <span key={n} className="cell">{n}</span>
        ))}
      </span>
    </span>
@@ -159,41 +148,16 @@

/* ----------------- Helpers ----------------- */
function calcBandRange(cfg?: HeaderConfigExt | null): { low: number; high: number } {
  // CMS değerlerini sayıya çevir
  const min = toNum(cfg?.online_min, 4800);
  const max = toNum(cfg?.online_max, 6800);
  const span = Math.max(0, max - min);

  const hour = new Date().getHours(); // tarayıcı yerel saat (IST varsayılan)
  // Saat bandına göre aralık seçimi
  if (hour >= 3 && hour < 6) {
    // Minimum
    return {
      low: min,
      high: min + Math.max(10, Math.round(span * 0.15)),
    };
  }
  if (hour >= 6 && hour < 15) {
    // Min-orta
    return {
      low: min + Math.round(span * 0.20),
      high: min + Math.round(span * 0.55),
    };
  }
  if (hour >= 15 && hour < 22) {
    // Maks seviyeye yakın
    return {
      low: min + Math.round(span * 0.70),
      high: max - Math.round(span * 0.10),
    };
  }
  // 22:00–03:00 Maks seviyeler
  return {
    low: max - Math.round(span * 0.15),
    high: max,
  };
  const hour = new Date().getHours();
  if (hour >= 3 && hour < 6) return { low: min, high: min + Math.max(10, Math.round(span * 0.15)) };
  if (hour >= 6 && hour < 15) return { low: min + Math.round(span * 0.2), high: min + Math.round(span * 0.55) };
  if (hour >= 15 && hour < 22) return { low: min + Math.round(span * 0.7), high: max - Math.round(span * 0.1) };
  return { low: max - Math.round(span * 0.15), high: max };
}

function toNum(v: unknown, def: number): number {
  if (v === null || v === undefined) return def;
  const n = typeof v === "string" ? parseInt(v, 10) : (v as number);
@@ -229,88 +193,66 @@
  return parts;
}

/* ----------------- Icons ----------------- */
function MouseClickIcon() {
  return (
    <svg className="mouse" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a5 5 0 0 1 5 5v4H7V7a5 5 0 0 1 5-5Z" fill="currentColor" />
      <path d="M7 11h10v5a5 5 0 0 1-10 0v-5Z" fill="currentColor" opacity=".7" />
      <path d="M12 6v12" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5a6 6 0 0 0-12 0v5l-2 2v1h16v-1l-2-2Z" fill="currentColor" />
    </svg>
  );
}

/* ----------------- CSS ----------------- */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800;900&display=swap');

:root{
  --bg:#0b1224; --bg2:#0e1a33; --text:#eaf2ff; --aqua:#00e5ff; --red:#ff2a2a;
  --digital:'Orbitron', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
*{box-sizing:border-box}
.hdr{background:rgba(8,14,28,.5);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.06)}
/* Header zemin */
.hdr{background:linear-gradient(180deg,var(--bg),var(--bg2));border-bottom:1px solid rgba(255,255,255,.06)}
.hdr__in{max-width:1200px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.left,.right{display:flex;align-items:center;gap:12px}
.left,.right{display:flex;align-items:center;gap:12px;flex-wrap:nowrap}

/* Logo */
.logo{height:36px;display:block;filter:drop-shadow(0 0 10px rgba(0,229,255,.26))}
@media (max-width:720px){ .logo{height:32px} }
.logo{height:32px;display:block;filter:drop-shadow(0 0 10px rgba(0,229,255,.22))}
@media (max-width:720px){ .logo{height:28px} }

/* LIVE strip */
.liveWrap{display:flex;flex-direction:column;align-items:flex-start;gap:4px}
.liveRow{display:flex;align-items:center;gap:10px}
.liveWord{
  display:inline-flex;align-items:center;gap:6px;
  font-family:var(--digital); font-weight:800; letter-spacing:.8px;
  color:var(--red); font-size:18px; line-height:1;
}
.dot{width:8px;height:8px;border-radius:999px;background:var(--red);box-shadow:0 0 10px rgba(255,42,42,.85);animation:blink 1s infinite}
/* LIVE (küçültüldü) */
.liveWrap{display:flex;flex-direction:column;align-items:flex-start;gap:2px}
@media (max-width:820px){ .liveWrap{display:none} }
.liveRow{display:flex;align-items:center;gap:6px}
.liveWord{display:inline-flex;align-items:center;gap:5px;font-weight:800;color:var(--red);font-size:13px;line-height:1}
.dotR{width:6px;height:6px;border-radius:999px;background:var(--red);box-shadow:0 0 8px rgba(255,42,42,.8);animation:blink 1s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}

.roller{
  display:inline-flex;align-items:center;gap:4px;
  font-family:var(--digital); font-weight:800; font-size:18px; color:#fff;
}
.roller{display:inline-flex;align-items:center;gap:2px;font-weight:800;font-size:13px;color:#fff}
.sep{opacity:.7;margin:0 1px}

/* Digit roller */
.grp{display:inline-flex;gap:1px}
.digit{display:inline-block;width:14px;height:18px;overflow:hidden}
.digit{display:inline-block;width:11px;height:13px;overflow:hidden}
.col{display:flex;flex-direction:column;transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.cell{height:18px;line-height:18px;text-align:center}
.cell{height:13px;line-height:13px;text-align:center;font-size:12px;color:#fff}

/* Kayan neon alt şerit */
/* Kayan kırmızı çizgi (aktif) */
.liveUnderline{
  width:100%; height:2px; border-radius:2px;
  width:100%; height:2px; border-radius:2px; overflow:hidden;
  background:linear-gradient(90deg, rgba(255,42,42,0), rgba(255,42,42,1), rgba(255,42,42,0));
  background-size:180% 100%;
  animation:slidebar 2.8s linear infinite;
  box-shadow:0 0 10px rgba(255,42,42,.55);
  animation:slidebar 2.6s linear infinite;
  box-shadow:0 0 8px rgba(255,42,42,.5);
}
@keyframes slidebar{ 0%{background-position:0% 0} 100%{background-position:180% 0} }

/* Buttons */
.btn{display:inline-flex;align-items:center;gap:8px;cursor:pointer;border:1px solid transparent;background:transparent;color:var(--text);padding:8px 12px;border-radius:12px;transition:.15s}
.btn:hover{filter:brightness(1.06);transform:translateY(-1px)}
.btn.bonus{color:#fff;border-color:rgba(255,255,255,.18)}
.btn.bonus .notif{display:inline-block;width:9px;height:9px;border-radius:999px;background:#ff4d6d;box-shadow:0 0 0 8px rgba(255,77,109,.18);animation:pulse 1.8s infinite}
@keyframes pulse{0%{transform:scale(.9)}50%{transform:scale(1.15)}100%{transform:scale(.9)}}
.btn.cta{
  color:#001018;background:linear-gradient(90deg,var(--aqua),#4aa7ff);
  border-color:#0f6d8c;box-shadow:0 4px 16px rgba(0,229,255,.22),inset 0 0 0 1px rgba(255,255,255,.18);
  font-weight:900;letter-spacing:.3px;position:relative;overflow:hidden
/* PILL butonlar (düzgün hizalı) */
.pill{
  display:inline-flex; align-items:center; gap:8px;
  height:34px; padding:0 12px;
  border-radius:999px; border:1px solid transparent;
  font-weight:700; font-size:13px; line-height:34px; color:#eaf2ff;
  white-space:nowrap; text-decoration:none; cursor:pointer; position:relative;
}
.pill .ico{font-size:13px}
.pill.ghost{
  background: rgba(255,255,255,.06);
  border-color: rgba(255,255,255,.12);
}
.pill.ghost .dot{
  width:8px;height:8px;border-radius:999px;background:#ff4d6d;
  box-shadow:0 0 0 6px rgba(255,77,109,.18); margin-left:2px;
}
.btn.cta.clicked::after{
  content:"";position:absolute;inset:0;background:radial-gradient(120px 120px at 50% 50%,rgba(255,255,255,.45),transparent 60%);animation:clickflash .45s ease-out forwards
.pill.primary{
  background: linear-gradient(90deg,#00e5ff,#4aa7ff);
  color:#001018;
  border-color:#0f6d8c;
  box-shadow: 0 4px 12px rgba(0,229,255,.22), inset 0 0 0 1px rgba(255,255,255,.18);
}
@keyframes clickflash{0%{opacity:.9;transform:scale(.9)}100%{opacity:0;transform:scale(1.2)}}
.mouse{color:#001018}
.pill:hover{ filter:brightness(1.06) }
`;
