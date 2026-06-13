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
        <div className="flex items-center gap-6">
          <div className="flex">
            {Array.from('SHINOBI').map((letter, i) => (
              <span key={i} className="shinobi-letter font-anton text-7xl md:text-9xl text-white">
                {letter}
              </span>
            ))}
          </div>
          <svg className="kunai w-48 h-16" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
            {/* Blade */}
            <path
              d="M 10 30 L 70 15 L 70 45 Z"
              fill="#C0C0C0"
              stroke="#A0A0A0"
              strokeWidth="2"
            />
            <path
              d="M 70 15 L 70 45"
              stroke="#808080"
              strokeWidth="1"
            />
            
            {/* Cross guard */}
            <rect x="70" y="20" width="15" height="20" fill="#3A3A3A" stroke="#2A2A2A" strokeWidth="2" />
            <rect x="70" y="25" width="15" height="10" fill="#4A4A4A" />
            
            {/* Handle */}
            <rect x="85" y="22" width="50" height="16" fill="#C8A96E" stroke="#A08050" strokeWidth="2" rx="2" />
            {/* Kanji markings on handle */}
            <line x1="95" y1="25" x2="95" y2="35" stroke="#8B6914" strokeWidth="1" />
            <line x1="105" y1="25" x2="105" y2="35" stroke="#8B6914" strokeWidth="1" />
            <line x1="115" y1="25" x2="115" y2="35" stroke="#8B6914" strokeWidth="1" />
            <line x1="125" y1="25" x2="125" y2="35" stroke="#8B6914" strokeWidth="1" />
            
            {/* Ring at end */}
            <circle cx="140" cy="30" r="6" fill="none" stroke="#808080" strokeWidth="3" />
            <circle cx="140" cy="30" r="3" fill="#606060" />
          </svg>
          <div className="flex">
            {Array.from('STORE').map((letter, i) => (
              <span key={i} className="store-letter font-anton text-7xl md:text-9xl text-white">
                {letter}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
