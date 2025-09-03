// web/src/pages/Home.tsx
import Hero from "../components/Hero";

export default function Home() {
  return (
    <main className="home">
      <Hero />
      <style>{css}</style>
    </main>
  );
}

const css = `
.home{max-width:1200px;margin:0 auto;padding:16px}
`;
