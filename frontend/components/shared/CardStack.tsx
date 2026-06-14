"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function CardStack() {
  useGSAP(() => {
    const cards = gsap.utils.toArray('.card-item') as HTMLElement[];
    const headers = gsap.utils.toArray('.card-header') as HTMLElement[];
    
    // Calculate header height for stacking
    const headerHeight = 80; // Approximate header height
    
    // Create timeline with ScrollTrigger
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.card-stack-container',
        start: 'top top',
        end: '+=300%',
        scrub: true,
        pin: true,
        anticipatePin: 1,
      },
    });

    // Card 1: Pin to top
    tl.to(cards[0], {
      y: 0,
      scale: 1,
      duration: 1,
    });

    // Card 2: Enter from bottom-left with tilt, then straighten and slide over Card 1
    tl.fromTo(
      cards[1],
      {
        y: 500,
        x: -200,
        rotation: -15,
        opacity: 0,
      },
      {
        y: headerHeight,
        x: 0,
        rotation: 0,
        opacity: 1,
        duration: 1,
      },
      '-=0.5'
    );

    // Card 3: Enter from bottom-right, slide over Card 2
    tl.fromTo(
      cards[2],
      {
        y: 500,
        x: 200,
        rotation: 15,
        opacity: 0,
      },
      {
        y: headerHeight * 2,
        x: 0,
        rotation: 0,
        opacity: 1,
        duration: 1,
      },
      '-=0.5'
    );

    // Card 4: Enter from bottom-left, pin below Card 3's header
    tl.fromTo(
      cards[3],
      {
        y: 500,
        x: -200,
        rotation: -15,
        opacity: 0,
      },
      {
        y: headerHeight * 3,
        x: 0,
        rotation: 0,
        opacity: 1,
        duration: 1,
      },
      '-=0.5'
    );

    // Final state: ensure headers are stacked
    tl.to(
      headers,
      {
        y: (i: number) => i * headerHeight,
        duration: 0.5,
      },
      '-=0.3'
    );
  }, []);

  return (
    <section className="card-stack-container min-h-screen bg-[#0A0A0F] py-20">
      <div className="container absolute left-1/2 -translate-x-1/2 -translate-y-1/2 mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          {/* Card 1 */}
          <div className="card-item absolute top-0 left-0 right-0">
            <div className="card-header relative bg-[#F5E6C8] px-6 py-4 flex items-center justify-between border-b-2 border-[#FF7F00]">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-black" />
                ))}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-black font-bangers tracking-wide">
                NO JUTSU SHORTCUTS
              </h2>
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-black" />
                ))}
              </div>
            </div>
            <div className="card-body bg-[#1A1A1A] rounded-b-xl p-8 flex flex-col items-center text-center">
              <svg className="w-24 h-24 mb-6 text-[#FF7F00]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                {/* Kunai */}
                <path d="M50 10 L50 70" strokeLinecap="round" />
                <path d="M30 50 L50 70 L70 50" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="50" cy="75" r="8" />
                <path d="M35 25 L65 25" strokeLinecap="round" />
              </svg>
              <p className="text-[#F0F0F0] text-lg leading-relaxed max-w-md">
                Hard work beats talent when talent doesn't work hard. We don't rely on forbidden jutsu, just pure training and dedication.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="card-item absolute top-0 left-0 right-0">
            <div className="card-header relative bg-[#F5E6C8] px-6 py-4 flex items-center justify-between border-b-2 border-[#FF7F00]">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-black" />
                ))}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-black font-bangers tracking-wide">
                NO LACK OF RESOLVE
              </h2>
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-black" />
                ))}
              </div>
            </div>
            <div className="card-body bg-[#1A1A1A] rounded-b-xl p-8 flex flex-col items-center text-center">
              <svg className="w-24 h-24 mb-6 text-[#FF7F00]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                {/* Shuriken */}
                <path d="M50 10 L60 40 L90 50 L60 60 L50 90 L40 60 L10 50 L40 40 Z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="50" cy="50" r="8" />
              </svg>
              <p className="text-[#F0F0F0] text-lg leading-relaxed max-w-md">
                We never go back on our word. That is our ninja way. If it doesn't align with the village's mission, it doesn't make the cut.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="card-item absolute top-0 left-0 right-0">
            <div className="card-header relative bg-[#F5E6C8] px-6 py-4 flex items-center justify-between border-b-2 border-[#FF7F00]">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-black" />
                ))}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-black font-bangers tracking-wide">
                NO CHAKRA WASTE
              </h2>
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-black" />
                ))}
              </div>
            </div>
            <div className="card-body bg-[#1A1A1A] rounded-b-xl p-8 flex flex-col items-center text-center">
              <svg className="w-24 h-24 mb-6 text-[#FF7F00]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                {/* Chakra Flame */}
                <path d="M50 10 Q65 30 65 50 Q65 70 50 85 Q35 70 35 50 Q35 30 50 10" strokeLinecap="round" />
                <path d="M50 25 Q58 40 58 52 Q58 64 50 72 Q42 64 42 52 Q42 40 50 25" strokeLinecap="round" />
                <path d="M50 40 Q54 48 54 54 Q54 60 50 65 Q46 60 46 54 Q46 48 50 40" strokeLinecap="round" />
              </svg>
              <p className="text-[#F0F0F0] text-lg leading-relaxed max-w-md">
                Perfect chakra control. No unnecessary ingredients, no fillers. Just the essential energy needed to complete the mission.
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="card-item absolute top-0 left-0 right-0">
            <div className="card-header relative bg-[#F5E6C8] px-6 py-4 flex items-center justify-between border-b-2 border-[#FF7F00]">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-black" />
                ))}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-black font-bangers tracking-wide">
                NO DESERTION
              </h2>
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-black" />
                ))}
              </div>
            </div>
            <div className="card-body bg-[#1A1A1A] rounded-b-xl p-8 flex flex-col items-center text-center">
              <svg className="w-24 h-24 mb-6 text-[#FF7F00]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                {/* Ninja Headband */}
                <rect x="10" y="35" width="80" height="20" rx="2" />
                <path d="M10 45 L5 35 L15 45" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M90 45 L95 35 L85 45" strokeLinecap="round" strokeLinejoin="round" />
                {/* Leaf Village Symbol */}
                <path d="M50 25 L50 35 M50 35 L40 45 M50 35 L60 45 M45 40 L55 40" strokeLinecap="round" />
                <circle cx="50" cy="32" r="3" />
              </svg>
              <p className="text-[#F0F0F0] text-lg leading-relaxed max-w-md">
                Loyalty above all. A bond that cannot be broken by rogue elements. We stay true to our allies and our diet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
