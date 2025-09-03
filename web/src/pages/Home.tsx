// web/src/pages/Home.tsx
import { useEffect, useState } from "react";
import { getHomeBanners, type HomeBanner } from "../api/home";

export default function Home() {
  const [items, setItems] = useState<HomeBanner[] | null>(null);
  const [err, setErr] = useState<string>("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    getHomeBanners().then(setItems).catch((e) => setErr(e?.message ?? "Hata"));
  }, []);

  // Otomatik geçiş
  useEffect(() => {
    if (!items || !items.length) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [items]);

  if (err) return <div style={{ padding: 16 }}>Hata: {err}</div>;
  if (!items) return <div style={{ padding: 16 }}>Yükleniyor…</div>;
  if (!items.length) return <div style={{ padding: 16 }}>Henüz banner eklenmemiş.</div>;

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 12 }}>
      {items.map((b, i) => (
        <div
          key={b.id}
          style={{
            position: "absolute",
            inset: 0,
            opacity: i === index ? 1 : 0,
            transition: "opacity 1s ease-in-out",
          }}
        >
          <img
            src={b.image_url}
            alt=""
            style={{ width: "100%", display: "block" }}
            loading="lazy"
          />
          {(b.title || b.subtitle) && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "flex-end",
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.6))",
                color: "white",
                padding: 16,
              }}
            >
              <div>
                {b.title && (
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{b.title}</div>
                )}
                {b.subtitle && (
                  <div style={{ fontSize: 16, opacity: 0.9 }}>{b.subtitle}</div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Noktalar (indicator) */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 6,
        }}
      >
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              border: "none",
              background: i === index ? "white" : "rgba(255,255,255,0.5)",
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </div>
  );
}
