'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useState } from 'react';

export default function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);

  useGSAP(() => {
    const tl = gsap.timeline();

    // Split each word into individual letter spans before animating
    tl.to('.shinobi-letter', {
      opacity: 0,
      y: -20,
      stagger: { each: 0.05, from: 'end' },
      duration: 0.3,
      ease: 'power2.in',
    })
      .to(
        '.store-letter',
        {
          opacity: 0,
          y: -20,
          stagger: { each: 0.05, from: 'end' },
          duration: 0.3,
          ease: 'power2.in',
        },
        '-=0.2'
      )
      .to(
        '.kunai',
        {
          x: '120vw',
          duration: 0.6,
          ease: 'power3.in',
        },
        '-=0.1'
      )
      .to('.loading-screen', {
        opacity: 0,
        duration: 0.4,
        onComplete: () => setIsLoading(false),
      });
  }, []);

  if (!isLoading) return null;

  return (
    <div className="loading-screen fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
          <div className="flex">
            {Array.from('SHINOBI').map((letter, i) => (
              <span key={i} className="shinobi-letter font-anton text-6xl sm:text-7xl md:text-9xl text-white">
                {letter}
              </span>
            ))}
          </div>
          <img src="/kunai.svg" alt="" className="kunai w-32 h-10 md:w-48 md:h-16" />
          <div className="flex">
            {Array.from('STORE').map((letter, i) => (
              <span key={i} className="store-letter font-anton text-6xl sm:text-7xl md:text-9xl text-white">
                {letter}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
