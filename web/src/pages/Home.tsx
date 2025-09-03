// web/src/pages/Home.tsx
import LiveFeatured from "../components/LiveFeatured";

export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <h1 className="title">Hoş Geldiniz</h1>
        <p className="sub">Canlı ve yaklaşan popüler maçları buradan takip edebilirsiniz</p>
      </section>

      <LiveFeatured />

      <style>{css}</style>
    </main>
  );
}

const css = `
.home{max-width:1200px;margin:0 auto;padding:16px}
.hero{text-align:center;padding:40px 16px}
.title{margin:0;font-size:28px;font-weight:800;color:#eaf2ff}
.sub{margin:8px 0 0;font-size:16px;color:#9fb1cc}
`;
