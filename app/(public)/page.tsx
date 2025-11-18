// app/(public)/page.tsx
import { Hero, ProgramsOverview, WhyChooseUs, Testimonials } from '@/components/sections';

export default function HomePage() {
  return (
    <main>
      <Hero />
      <ProgramsOverview />
      <WhyChooseUs />
      <Testimonials />
    </main>
  );
}

