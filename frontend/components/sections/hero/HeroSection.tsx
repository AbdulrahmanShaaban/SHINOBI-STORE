'use client';

import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Naruto from '@/components/sections/hero/NarutoHeroImage';
import SlidingImage from '@/components/sections/hero/SlidingImage';

gsap.registerPlugin(ScrollTrigger);

export interface HeroSectionProps {
  /** CMS-driven hero copy — all optional; absent values keep today's imagery-only hero. */
  title?: string;
  subtitle?: string;
  /** Extra decorative art layer rendered between the mountain and the petals. */
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export default function HeroSection({
  title = '',
  subtitle = '',
  imageUrl = '',
  ctaLabel = '',
  ctaHref = '',
}: HeroSectionProps) {
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

          gsap.utils.toArray<Element>('.petal').forEach((petal: Element) => {
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

          gsap.utils.toArray<Element>('.petal').forEach((petal: Element) => {
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
      {/* Background sky (decorative; LCP layer → priority) */}
      <Image
        src="/sections/sky.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="z-0 object-cover"
      />

      {/* Mountain (decorative) */}
      <Image
        src="/sections/mountain.webp"
        alt=""
        fill
        sizes="100vw"
        className="z-5 object-cover"
      />

      {/* CMS-provided art layer (decorative, sits under petals/clouds) */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 z-[4] h-full w-full object-cover"
        />
      ) : null}

      {/* Sakura petals (decorative) */}
      <div className="absolute z-5 inset-0 pointer-events-none" aria-hidden="true">
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

      {/* Glowing particles (decorative) */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
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

        {/* CMS-driven copy overlay — rendered only when the API supplies a title.
            Without a title an sr-only h1 keeps exactly one page heading. */}
        {title ? (
          <div className="pointer-events-none relative z-20 flex flex-col items-start px-5 pt-[14svh] sm:px-8 md:px-12 md:pt-[16svh] lg:px-16">
            <h1 className="max-w-[16ch] font-bebas text-[clamp(2.75rem,7vw,6rem)] uppercase leading-[0.95] tracking-wide text-[#F5E6C8] drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-3 max-w-md font-inter text-sm leading-relaxed text-[#F5E6C8]/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] md:mt-4 md:text-lg">
                {subtitle}
              </p>
            ) : null}
            {ctaHref && ctaLabel ? (
              <a
                href={ctaHref}
                className="pointer-events-auto mt-6 inline-flex items-center gap-2 rounded-lg bg-[#FF6B00] px-6 py-3 font-cinzel text-sm font-bold tracking-wider text-black transition-colors hover:bg-[#FF8A33] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5E6C8] md:mt-8 md:text-base"
              >
                {ctaLabel}
              </a>
            ) : null}
          </div>
        ) : (
          <h1 className="sr-only">Shinobi Store</h1>
        )}

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
