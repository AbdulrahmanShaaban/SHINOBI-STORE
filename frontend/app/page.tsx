'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import LoadingScreen from '@/components/LoadingScreen';
import SlidingImage from '@/components/shared/SlidingImage';
import Naruto1 from '@/components/characters/Naruto1';
import CardStack from '@/components/shared/CardStack';
import ShinobiLogo from '@/components/shared/ShinobiLogo';
import ChooseShinobi from '@/components/shared/ChooseShinobi';
import ShinobiCharacterCards from '@/components/shared/ShinobiCharacterCards';
import MadaraSpecialCard from '@/components/shared/MadaraSpecialCard';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  useGSAP(() => {
    const tl = gsap.timeline({ delay: 0.2 });
    tl.from('.naruto1-character', { x: 200, opacity: 0, duration: 1.2, ease: 'power3.out' }, '-=1');

    // Naruto1 float
    gsap.to('.naruto1-character', {
      y: -10,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    // Sakura petals fall
    gsap.utils.toArray('.petal').forEach((petal: any) => {
      gsap.to(petal, {
        y: '100vh',
        x: gsap.utils.random(-100, 100),
        rotation: gsap.utils.random(0, 360),
        duration: gsap.utils.random(4, 8),
        repeat: -1,
        delay: gsap.utils.random(0, 5),
        ease: 'none',
      });
    });

    // Logo animation from hero to fixed corner position
    gsap.to('#hero-logo', {
      scrollTrigger: {
        trigger: 'section',
        start: 'top top',
        end: '+=100%',
        scrub: 1.5,
      },
      position: 'fixed',
      top: '60px',
      left: '20px',
      width: '300px',
      scale: 1.5,
      ease: 'power2.inOut',
    });
  }, []);

  return (
    <main className="min-h-screen bg-[#0A0A0F]">
      <LoadingScreen />

      {/* Hero Section */}
      <section className="relative h-screen overflow-hidden">
        {/* Background sky */}
        <img
          src="/sky.webp"
          alt="Sky"
          className="absolute z-0 inset-0 w-full h-full object-cover"
        />

        {/* Mountain */}
        <img
          src="/mountain.webp"
          alt="Mountain"
          className="absolute z-5 inset-0 w-full h-full object-cover"
        />

        {/* Village rooftop silhouettes */}
        {/* <svg className="absolute bottom-0 left-0 w-full h-32" viewBox="0 0 1200 150" preserveAspectRatio="none">
          <path d="M0 150 L50 100 L100 150 L150 90 L200 150 L250 95 L300 150 L350 100 L400 150 L450 105 L500 150 L550 95 L600 150 L650 100 L700 150 L750 95 L800 150 L850 105 L900 150 L950 95 L1000 150 L1050 100 L1100 150 L1150 95 L1200 150 Z" fill="#0A0A1A" />
        </svg> */}

        {/* Sakura petals */}
        <div className="absolute z-5 inset-0 pointer-events-none">
          <svg className="petal absolute w-4 h-4" style={{ left: '10%', top: '5%' }} viewBox="0 0 20 20">
            <path d="M10 0 C15 5 15 15 10 20 C5 15 5 5 10 0" fill="#FFB7C5" opacity="1" />
          </svg>
          <svg className="petal absolute w-4 h-4" style={{ left: '22%', top: '15%' }} viewBox="0 0 20 20">
            <path d="M10 0 C15 5 15 15 10 20 C5 15 5 5 10 0" fill="#FFB7C5" opacity="1" />
          </svg>
          <svg className="petal absolute w-4 h-4" style={{ left: '34%', top: '8%' }} viewBox="0 0 20 20">
            <path d="M10 0 C15 5 15 15 10 20 C5 15 5 5 10 0" fill="#FFB7C5" opacity="1" />
          </svg>
          <svg className="petal absolute w-4 h-4" style={{ left: '46%', top: '12%' }} viewBox="0 0 20 20">
            <path d="M10 0 C15 5 15 15 10 20 C5 15 5 5 10 0" fill="#FFB7C5" opacity="1" />
          </svg>
          <svg className="petal absolute w-4 h-4" style={{ left: '58%', top: '20%' }} viewBox="0 0 20 20">
            <path d="M10 0 C15 5 15 15 10 20 C5 15 5 5 10 0" fill="#FFB7C5" opacity="1" />
          </svg>
          <svg className="petal absolute w-4 h-4" style={{ left: '70%', top: '10%' }} viewBox="0 0 20 20">
            <path d="M10 0 C15 5 15 15 10 20 C5 15 5 5 10 0" fill="#FFB7C5" opacity="1" />
          </svg>
          <svg className="petal absolute w-4 h-4" style={{ left: '82%', top: '18%' }} viewBox="0 0 20 20">
            <path d="M10 0 C15 5 15 15 10 20 C5 15 5 5 10 0" fill="#FFB7C5" opacity="1" />
          </svg>
          <svg className="petal absolute w-4 h-4" style={{ left: '94%', top: '7%' }} viewBox="0 0 20 20">
            <path d="M10 0 C15 5 15 15 10 20 C5 15 5 5 10 0" fill="#FFB7C5" opacity="1" />
          </svg>
        </div>

        {/* Clouds */}
        <SlidingImage />
        

        {/* Glowing particles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '10%', top: '10%', opacity: 0.3 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '20%', top: '30%', opacity: 0.4 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '30%', top: '50%', opacity: 0.2 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '40%', top: '20%', opacity: 0.5 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '50%', top: '40%', opacity: 0.3 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '60%', top: '60%', opacity: 0.4 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '70%', top: '25%', opacity: 0.2 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '80%', top: '45%', opacity: 0.5 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '90%', top: '35%', opacity: 0.3 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '15%', top: '70%', opacity: 0.4 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '25%', top: '80%', opacity: 0.2 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '35%', top: '15%', opacity: 0.5 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '45%', top: '75%', opacity: 0.3 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '55%', top: '85%', opacity: 0.4 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '65%', top: '55%', opacity: 0.2 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '75%', top: '90%', opacity: 0.5 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '85%', top: '65%', opacity: 0.3 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '95%', top: '95%', opacity: 0.4 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '5%', top: '45%', opacity: 0.2 }} />
          <div className="absolute w-1 h-1 bg-[#FF6B00] rounded-full" style={{ left: '95%', top: '5%', opacity: 0.5 }} />
        </div>

        <div className="relative z-10 container mx-auto px-6 h-full flex items-center">
          <div id="hero-logo" className="w-1/2 absolute top-10 left-[-50px]">
            <ShinobiLogo />
          </div>
          <div className="w-1/2 h-[150vh] absolute right-50 top-25">
            <Naruto1 />
          </div>
        </div>
      </section>

      {/* Card Stack Section */}
      <CardStack />

      {/* Choose Your Shinobi Section */}
      <ChooseShinobi />

      {/* Shinobi Character Cards */}
      <ShinobiCharacterCards />

      {/* Spacer between character cards and Madara special card */}
      <div className="h-24 md:h-36 lg:h-44" />

      {/* Legendary Madara Special Card */}
      <MadaraSpecialCard />
      </main>
  );
} 