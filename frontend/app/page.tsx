'use client';

import LoadingScreen from '@/components/LoadingScreen';
import HeroSection from '@/components/sections/hero/HeroSection';
import CardStack from '@/components/sections/cards/CardStack';
import ChooseShinobi from '@/components/sections/cards/ChooseShinobi';
import ShinobiCharacterCards from '@/components/sections/cards/ShinobiCharacterCards';
import MadaraSpecialCard from '@/components/sections/madara/MadaraSpecialCard';
import QuoteSection from '@/components/sections/showcase/QuoteSection';
import CharacterShowcase from '@/components/sections/showcase/CharacterShowcase';
import StoreFooter from '@/components/shared/StoreFooter';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0F]">
      <LoadingScreen />
      <HeroSection />
      <CardStack />
      <ChooseShinobi />
      <ShinobiCharacterCards />
      <MadaraSpecialCard />
      <QuoteSection />
      <CharacterShowcase />
      <StoreFooter />
    </main>
  );
}
