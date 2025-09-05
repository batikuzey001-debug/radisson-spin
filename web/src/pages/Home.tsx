// web/src/pages/Home.tsx
import Hero from "../components/Hero";
import HeroUpcomingStrip from "../components/HeroUpcomingStrip";
import QuickBonus from "../components/QuickBonus";
import EventsGrid from "../components/EventsGrid";

export default function Home() {
  return (
    <main>
      <Hero />
      {/* Hero üstünde yatay şerit – yakındaki maçlar */}
      <HeroUpcomingStrip />
      <QuickBonus />
      <EventsGrid />
    </main>
  );
}
