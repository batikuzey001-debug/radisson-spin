// web/src/pages/Home.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { getHomeBanners, type HomeBanner } from "../api/home";

export default function Home() {
  const [items, setItems] = useState<HomeBanner[] | null>(null);
  const [err, setErr] = useState<string>("");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Why: Görsel boyutlama sorunlarını engellemek için background-image (cover) kullanıyoruz.
  useEffect(() => {
    getHomeBanners()
      .then((data) => setItems(data))
      .catch((e) => setErr(e?.message ?? "Hata"));
  }, []);

  const len = items?.length ?? 0;
  const safeIndex = useMemo(() => (len ? index % len : 0), [index, len]);

  useEffect(() => {
    if (!items || items.length < 2 || paused) return;
    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 4000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [items, paused]);

  if (err) return <DivWrap><p className="err">Hata: {err}</p></DivWrap>;
  if (!items) return <DivWrap><Skeleton /></DivWrap>;
  if (!items.length) {
    return (
      <DivWrap>
        <Empty />
      </DivWrap>
    );
  }

  return (
    <DivWrap>
      <div
        className="hero"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Slides */}
        {items.map((b, i) => (
          <div
            key={b.id}
            className="slide"
            aria-hidden={i !== safeIndex}
            style={{
              opacity: i === safeIndex ? 1 : 0,
              backgroundImage: `url("${b.image_url}")`,
            }}
          >
            {(b.title || b.subtitle) && (
              <div className="overlay">
                {b.title && <h2 className="title">{b.title}</h2>}
                {b.subtitle && <p className="subtitle">{b.subtitle}</p>}
              </div>
            )}
          </div>
        ))}

        {/* Arrows */}
        {items.length > 1 && (
          <>
            <button
              className="nav nav-left"
              aria-label="Önceki"
              onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
            >
              ‹
            </button>
            <button
              className="nav nav-right"
              aria-label="Sonraki"
              onClick={() => setIndex((i) => (i + 1) % items.length)}
            >
              ›
            </button>
          </>
        )}

        {/* Dots */}
        {items.length > 1 && (
          <div className="dots">
            {items.map((_, i) => (
              <button
                key={i}
                className={`dot ${i === safeIndex ? "active" : ""}`}
                aria-label={`Slayt ${i + 1}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Küçük alt bilgi */}
      <div className="hint">
        {paused ? "Durduruldu" : "Otomatik kayıyor"} • {items.length} görsel
      </div>

      <style>{css}</style>
    </DivWrap>
  );
}

/* Basit kabuk */
function DivWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap">
      <header className="top">
        <span className="brand">Radisson Spin</span>
        <nav className="links">
          <a href="/" onClick={(e) => e.preventDefault()}>
            Ana Sayfa
          </a>
          <a href="/spin" onClick={(e) => e.preventDefault()}>
            Çark (yakında)
          </a>
        </nav>
      </header>
      {children}
    </div>
  );
}

/* Yükleniyor */
function Skeleton() {
  return (
    <div className="hero">
      <div className="shimmer" />
      <style>{`
        .shimmer{
          position:absolute; inset:0; border-radius:16px;
          background: linear-gradient(90deg,#1f2230 0%,#24283a 20%,#1f2230 40%);
          background-size: 200% 100%;
          animation: sh 1.2s infinite;
        }
        @keyframes sh { 0%{background-position:0% 0} 100%{background-position:200% 0} }
      `}</style>
    </div>
  );
}

/* Boş durum */
function Empty() {
  return (
    <div className="empty">
      <div>Henüz banner eklenmemiş.</div>
      <small>
        Admin panelinden <code>/admin/home-banners</code> sayfasına gidip en az bir görsel
        ekleyin ve <b>Aktif</b> yapın.
      </small>
    </div>
  );
}

/* Basit CSS (component içinde) */
const css = `
.wrap{max-width:1100px;margin:18px auto;padding:0 16px;font-family:system-ui,Segoe UI,Roboto}
.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.brand{font-weight:800;letter-spacing:.3px}
.links a{color:#4b5563;text-decoration:none;margin-left:12px}
.links a:hover{color:#111827}
.hero{
  position:relative; border-radius:16px; overflow:hidden;
  height:min(60vh,520px); min-height:340px; background:#0f1115;
}
.slide{
  position:absolute; inset:0;
  background-position:center; background-size:cover; background-repeat:no-repeat;
  transition:opacity .9s ease;
}
.overlay{
  position:absolute; inset:0; display:flex; align-items:flex-end;
  background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(0,0,0,.55));
  color:#fff; padding:24px;
}
.title{font-size:clamp(18px,3vw,28px); font-weight:800; margin:0 0 6px}
.subtitle{font-size:clamp(13px,2vw,16px); opacity:.9; margin:0}
.nav{
  position:absolute; top:50%; transform:translateY(-50%);
  width:40px; height:40px; border-radius:999px; border:none; cursor:pointer;
  background:rgba(0,0,0,.35); color:#fff; font-size:24px; line-height:38px;
}
.nav:hover{background:rgba(0,0,0,.55)}
.nav-left{left:10px}
.nav-right{right:10px}
.dots{
  position:absolute; left:50%; transform:translateX(-50%); bottom:12px;
  display:flex; gap:8px;
}
.dot{
  width:10px; height:10px; border-radius:999px; border:none; cursor:pointer;
  background:rgba(255,255,255,.5);
}
.dot.active{background:#fff}
.hint{color:#6b7280; font-size:12px; margin-top:8px}
.empty{
  display:grid; place-items:center; height:220px; border:1px dashed #d1d5db; border-radius:12px; color:#6b7280; gap:6px;
}
`;

/*
Notlar:
- Görseller background-image olarak render edilir (cover). Büyük CDN görselleri için ideal.
- Autoplay 4sn; hover/focus'ta durur. Ok/nokta ile manuel kontrol edilebilir.
- Boş/yanıt/hata durumları gösterilir; debug kolaydır.
*/
