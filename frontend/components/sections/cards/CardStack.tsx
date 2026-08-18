"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function CardStack() {
  useGSAP(() => {
    const cards = gsap.utils.toArray('.card-item') as HTMLElement[];
    const cardContents = gsap.utils.toArray('.card-content') as HTMLElement[];

    const headerHeight = 60;

    const mm = gsap.matchMedia();

    // ── Desktop (md+) ──
    mm.add("(min-width: 768px)", () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '.card-stack-container',
          start: 'top top',
          end: '+=300%',
          scrub: 1.5,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      tl.to(cards[0], { y: 0, scale: 1, duration: 1 });

      tl.fromTo(cards[1],
        { y: 600, x: -300, rotation: -25, opacity: 0, scale: 0.8 },
        { y: headerHeight, x: 0, rotation: 0, opacity: 1, scale: 1, duration: 1.5, ease: 'power3.out' },
        '-=0.5'
      );
      tl.fromTo(cardContents[1],
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.5, ease: 'power2.out' },
        '-=1.2'
      );

      tl.fromTo(cards[2],
        { y: 600, x: 300, rotation: 25, opacity: 0, scale: 0.8 },
        { y: headerHeight * 2, x: 0, rotation: 0, opacity: 1, scale: 1, duration: 1.5, ease: 'power3.out' },
        '-=0.5'
      );
      tl.fromTo(cardContents[2],
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.5, ease: 'power2.out' },
        '-=1.2'
      );

      tl.fromTo(cards[3],
        { y: 600, x: -300, rotation: -25, opacity: 0, scale: 0.8 },
        { y: headerHeight * 3, x: 0, rotation: 0, opacity: 1, scale: 1, duration: 1.5, ease: 'power3.out' },
        '-=0.5'
      );
      tl.fromTo(cardContents[3],
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.5, ease: 'power2.out' },
        '-=1.2'
      );
    });

    // ── Mobile (<768px) — smaller entry distances, faster response ──
    mm.add("(max-width: 767px)", () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '.card-stack-container',
          start: 'top top',
          end: '+=250%',
          scrub: 0.8,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Skip card[0] — it's already visible. Start directly with card entries.
      tl.fromTo(cards[1],
        { y: 300, x: -100, rotation: -12, opacity: 0, scale: 0.85 },
        { y: headerHeight, x: 0, rotation: 0, opacity: 1, scale: 1, duration: 1.5, ease: 'power3.out' }
      );
      tl.fromTo(cardContents[1],
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power2.out' },
        '-=1.2'
      );

      tl.fromTo(cards[2],
        { y: 300, x: 100, rotation: 12, opacity: 0, scale: 0.85 },
        { y: headerHeight * 2, x: 0, rotation: 0, opacity: 1, scale: 1, duration: 1.5, ease: 'power3.out' },
        '-=0.3'
      );
      tl.fromTo(cardContents[2],
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power2.out' },
        '-=1.2'
      );

      tl.fromTo(cards[3],
        { y: 300, x: -100, rotation: -12, opacity: 0, scale: 0.85 },
        { y: headerHeight * 3, x: 0, rotation: 0, opacity: 1, scale: 1, duration: 1.5, ease: 'power3.out' },
        '-=0.3'
      );
      tl.fromTo(cardContents[3],
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power2.out' },
        '-=1.2'
      );
    });

    return () => mm.revert();
  }, []);

  return (
    <section className="card-stack-container min-h-screen bg-[#0A0A0F] py-12 md:py-20">
      <div className="container absolute top-50 left-1/2 -translate-x-1/2 px-4 md:px-6">
        <div className="max-w-2xl mx-auto relative">
          {/* Card 1 */}
          <div className="card-item absolute top-0 left-0 right-0">
            <div className="card-header relative bg-[#F5E6C8] h-[60px] px-4 md:px-6 flex items-center justify-between border-b-2 border-[#FF7F00] box-border m-0">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-black" />
                ))}
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-black font-bangers tracking-wide">
                NO JUTSU SHORTCUTS
              </h2>
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-black" />
                ))}
              </div>
            </div>
            <div className="card-body bg-[#1A1A1A] rounded-b-xl p-5 md:p-8 flex flex-col items-center text-center pb-[20vh] md:pb-[35vh]">
              <div className="card-content flex flex-col items-center text-center">
                <img src="/kunai.svg" alt="" className="w-14 h-14 md:w-20 md:h-20 mb-4 md:mb-6" />
                <p className="text-[#F0F0F0] text-base md:text-lg leading-relaxed max-w-md">
                  Hard work beats talent when talent doesn't work hard. We don't rely on forbidden jutsu, just pure training and dedication.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="card-item absolute top-0 left-0 right-0">
            <div className="card-header relative bg-[#F5E6C8] h-[60px] px-4 md:px-6 flex items-center justify-between border-b-2 border-[#FF7F00] box-border m-0">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-black" />
                ))}
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-black font-bangers tracking-wide">
                NO LACK OF RESOLVE
              </h2>
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-black" />
                ))}
              </div>
            </div>
            <div className="card-body bg-[#1A1A1A] rounded-b-xl p-5 md:p-8 flex flex-col items-center text-center pb-[20vh] md:pb-[35vh]">
              <div className="card-content flex flex-col items-center text-center">
                <svg className="w-16 h-16 md:w-24 md:h-24 mb-4 md:mb-6 text-[#FF7F00]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                  {/* Shuriken */}
                  <path d="M50 10 L60 40 L90 50 L60 60 L50 90 L40 60 L10 50 L40 40 Z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="50" cy="50" r="8" />
                </svg>
                <p className="text-[#F0F0F0] text-base md:text-lg leading-relaxed max-w-md">
                  We never go back on our word. That is our ninja way. If it doesn't align with the village's mission, it doesn't make the cut.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="card-item absolute top-0 left-0 right-0">
            <div className="card-header relative bg-[#F5E6C8] h-[60px] px-4 md:px-6 flex items-center justify-between border-b-2 border-[#FF7F00] box-border m-0">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-black" />
                ))}
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-black font-bangers tracking-wide">
                NO CHAKRA WASTE
              </h2>
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-black" />
                ))}
              </div>
            </div>
            <div className="card-body bg-[#1A1A1A] rounded-b-xl p-5 md:p-8 flex flex-col items-center text-center pb-[20vh] md:pb-[35vh]">
              <div className="card-content flex flex-col items-center text-center">
                <svg className="w-16 h-16 md:w-24 md:h-24 mb-4 md:mb-6 text-[#FF7F00]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                  {/* Chakra Flame */}
                  <path d="M50 10 Q65 30 65 50 Q65 70 50 85 Q35 70 35 50 Q35 30 50 10" strokeLinecap="round" />
                  <path d="M50 25 Q58 40 58 52 Q58 64 50 72 Q42 64 42 52 Q42 40 50 25" strokeLinecap="round" />
                  <path d="M50 40 Q54 48 54 54 Q54 60 50 65 Q46 60 46 54 Q46 48 50 40" strokeLinecap="round" />
                </svg>
                <p className="text-[#F0F0F0] text-base md:text-lg leading-relaxed max-w-md">
                  Perfect chakra control. No unnecessary ingredients, no fillers. Just the essential energy needed to complete the mission.
                </p>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="card-item absolute top-0 left-0 right-0">
            <div className="card-header relative bg-[#F5E6C8] h-[60px] px-4 md:px-6 flex items-center justify-between border-b-2 border-[#FF7F00] box-border m-0">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-black" />
                ))}
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-black font-bangers tracking-wide">
                NO DESERTION
              </h2>
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-black" />
                ))}
              </div>
            </div>
            <div className="card-body bg-[#1A1A1A] rounded-b-xl p-5 md:p-8 flex flex-col items-center text-center pb-[20vh] md:pb-[35vh]">
              <div className="card-content flex flex-col items-center text-center">
                <svg className="w-16 h-16 md:w-24 md:h-24 mb-4 md:mb-6 text-[#FF7F00]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                  {/* Ninja Headband */}
                  <rect x="10" y="35" width="80" height="20" rx="2" />
                  <path d="M10 45 L5 35 L15 45" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M90 45 L95 35 L85 45" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Leaf Village Symbol */}
                  <path d="M50 25 L50 35 M50 35 L40 45 M50 35 L60 45 M45 40 L55 40" strokeLinecap="round" />
                  <circle cx="50" cy="32" r="3" />
                </svg>
                <p className="text-[#F0F0F0] text-base md:text-lg leading-relaxed max-w-md">
                  Loyalty above all. A bond that cannot be broken by rogue elements. We stay true to our allies and our diet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

