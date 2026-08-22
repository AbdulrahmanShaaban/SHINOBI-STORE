'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Naruto from '@/components/sections/hero/NarutoHeroImage';
import SlidingImage from '@/components/sections/hero/SlidingImage';

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add(
      {
        isDesktop: '(min-width: 768px)',
        isMobile: '(max-width: 767px)',
        reduceMotion: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const { isDesktop, isMobile, reduceMotion } = context.conditions as {
          isDesktop: boolean;
          isMobile: boolean;
          reduceMotion: boolean;
        };

        if (reduceMotion) {
          // Keep it simple and accessible, no complex pinning or scaling
          return;
        }

        if (isDesktop) {
          gsap.fromTo('.naruto-character', 
            { y: 80, opacity: 0, scale: 0.95 },
            { 
              y: 0, opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out', delay: 0.2,
              onComplete: () => {
                gsap.to('.naruto-character', {
                  y: -10,
                  duration: 2,
                  repeat: -1,
                  yoyo: true,
                  ease: 'sine.inOut',
                });
              }
            }
          );

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

        }

        if (isMobile) {
          gsap.fromTo('.naruto-character', 
            { y: 60, opacity: 0, scale: 0.95 },
            { 
              y: 0, opacity: 1, scale: 1, duration: 1, ease: 'power3.out', delay: 0.2,
              onComplete: () => {
                gsap.to('.naruto-character', {
                  y: -6,
                  duration: 2.5,
                  repeat: -1,
                  yoyo: true,
                  ease: 'sine.inOut',
                });
              }
            }
          );

          gsap.utils.toArray('.petal').forEach((petal: any) => {
            gsap.to(petal, {
              y: '100vh',
              x: gsap.utils.random(-40, 40),
              rotation: gsap.utils.random(0, 360),
              duration: gsap.utils.random(5, 9),
              repeat: -1,
              delay: gsap.utils.random(0, 5),
              ease: 'none',
            });
          });

        }
      }
    );

    return () => mm.revert();
  }, []);

  return (
    <section className="relative min-h-[100svh] h-screen overflow-hidden">
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

      {/* Sakura petals */}
      <div className="absolute z-5 inset-0 pointer-events-none">
        <svg className="petal absolute w-3 h-3 md:w-4 md:h-4" style={{ left: '10%', top: '5%' }} viewBox="0 0 20 20">
          <path d="M10 0 C15 5 15 15 10 20 C5 15 5 5 10 0" fill="#FFB7C5" opacity="1" />
        </svg>
        <svg className="petal absolute w-3 h-3 md:w-4 md:h-4" style={{ left: '22%', top: '15%' }} viewBox="0 0 20 20">
          <path d="M10 0 C15 5 15 15 10 20 C5 15 5 5 10 0" fill="#FFB7C5" opacity="1" />
        </svg>
        <svg className="petal absolute w-3 h-3 md:w-4 md:h-4" style={{ left: '34%', top: '8%' }} viewBox="0 0 20 20">
          <path d="M10 0 C15 5 15 15 10 20 C5 15 5 5 10 0" fill="#FFB7C5" opacity="1" />
        </svg>
        <svg className="petal absolute w-3 h-3 md:w-4 md:h-4" style={{ left: '46%', top: '12%' }} viewBox="0 0 20 20">
          <path d="M10 0 C15 5 15 15 10 20 C5 15 5 5 10 0" fill="#FFB7C5" opacity="1" />
        </svg>
        <svg className="petal absolute w-3 h-3 md:w-4 md:h-4" style={{ left: '58%', top: '20%' }} viewBox="0 0 20 20">
          <path d="M10 0 C15 5 15 15 10 20 C5 15 5 5 10 0" fill="#FFB7C5" opacity="1" />
        </svg>
        <svg className="petal absolute w-3 h-3 md:w-4 md:h-4" style={{ left: '70%', top: '10%' }} viewBox="0 0 20 20">
          <path d="M10 0 C15 5 15 15 10 20 C5 15 5 5 10 0" fill="#FFB7C5" opacity="1" />
        </svg>
        <svg className="petal absolute w-3 h-3 md:w-4 md:h-4" style={{ left: '82%', top: '18%' }} viewBox="0 0 20 20">
          <path d="M10 0 C15 5 15 15 10 20 C5 15 5 5 10 0" fill="#FFB7C5" opacity="1" />
        </svg>
        <svg className="petal absolute w-3 h-3 md:w-4 md:h-4" style={{ left: '94%', top: '7%' }} viewBox="0 0 20 20">
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

      {/* Content layer */}
      <div className="relative z-10 h-full flex flex-col">


        {/* Naruto - centered, bottom-anchored, fluid width */}
        <div className="naruto-wrapper absolute inset-x-0 bottom-0 flex justify-center z-10 pointer-events-none">
          <div className="relative pointer-events-auto" style={{ width: 'clamp(380px, 140vw, 750px)' }}>
            <Naruto />
          </div>
        </div>
      </div>
    </section>
  );
}
