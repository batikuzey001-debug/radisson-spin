// web/src/pages/Home.tsx
import HeroUpcomingStrip from "../components/HeroUpcomingStrip";
import Hero from "../components/Hero";
import QuickBonus from "../components/QuickBonus";
import EventsGrid from "../components/EventsGrid";

export default function Home() {
  return (
    <main>
      {/* Header'ın hemen altında, Hero'nun üzerinde canlı maç şeridi */}
      <HeroUpcomingStrip />

      {/* Ana görsel/hero */}
      <Hero />

      {/* Diğer bölümler */}
      <QuickBonus />
      <EventsGrid />
    </main>
  );
}
