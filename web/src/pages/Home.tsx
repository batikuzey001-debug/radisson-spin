// web/src/pages/Home.tsx
import Hero from "../components/Hero";
import QuickBonus from "../components/QuickBonus";
import EventsGrid from "../components/EventsGrid";

export default function Home() {
  return (
    <main className="home">
      <section className="heroSection">
        <Hero />
      </section>
      <QuickBonus />
      <EventsGrid />

      <style>{css}</style>
    </main>
  );
}

