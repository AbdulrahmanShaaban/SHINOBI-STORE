"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const CHARACTERS = [
  {
    name: "NARUTO",
    id: "naruto",
    price: 29.99,
    defaultImg: "/characters/naruto-default.png",
    jutsuImg: "/characters/naruto-rasengan.png",
    borderColor: "var(--primary) 0px 0px 10px",
    accentVar: "var(--primary)",
  },
  {
    name: "ITACHI",
    id: "itachi",
    price: 34.99,
    defaultImg: "/characters/itachi-default.png",
    jutsuImg: "/characters/itachi-mangekyou.png",
    borderColor: "var(--red) 0px 0px 10px",
    accentVar: "var(--red)",
  },
  {
    name: "SASUKE",
    id: "sasuke",
    price: 31.99,
    defaultImg: "/characters/sasuke-default.png",
    jutsuImg: "/characters/sasuke-chidori.png",
    borderColor: "var(--sasuke-accent) 0px 0px 10px",
    accentVar: "var(--sasuke-accent)",
  },
];

export default function ShinobiCharacterCards() {
  const sectionRef = useRef<HTMLElement>(null);
  const narutoRef = useRef<HTMLDivElement>(null);
  const itachiRef = useRef<HTMLDivElement>(null);
  const sasukeRef = useRef<HTMLDivElement>(null);
  const narutoJutsuRef = useRef<HTMLImageElement>(null);
  const itachiJutsuRef = useRef<HTMLImageElement>(null);
  const sasukeJutsuRef = useRef<HTMLImageElement>(null);
  const narutoDefaultRef = useRef<HTMLImageElement>(null);
  const itachiDefaultRef = useRef<HTMLImageElement>(null);
  const sasukeDefaultRef = useRef<HTMLImageElement>(null);

  useGSAP(() => {
    if (!sectionRef.current) return;

    const mm = gsap.matchMedia();

    // Mobile: each card has its own ScrollTrigger for individual in/out
    mm.add("(max-width: 767px)", () => {
      const cards = [itachiRef.current, narutoRef.current, sasukeRef.current];
      cards.forEach((card) => {
        if (!card) return;
        gsap.fromTo(card,
          { y: 80, opacity: 0, scale: 0.92 },
          {
            y: 0, opacity: 1, scale: 1,
            duration: 0.6,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              end: "top 50%",
              scrub: 1,
            },
          }
        );
      });
    });

    // Desktop: all cards animate together with stagger
    mm.add("(min-width: 768px)", () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 85%",
          end: "top 35%",
          scrub: 1,
        },
      });

      tl.fromTo(
        [itachiRef.current, narutoRef.current, sasukeRef.current],
        { y: 100, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "power3.out", stagger: 0.15 }
      );
    });

    return () => mm.revert();
  }, []);

  const handlePointerEnter = (defaultRef: React.RefObject<HTMLImageElement | null>, jutsuRef: React.RefObject<HTMLImageElement | null>) => {
    gsap.to(defaultRef.current, { opacity: 0, duration: 0.4, ease: "power2.out" });
    gsap.to(jutsuRef.current, { opacity: 1, scale: 1.04, duration: 0.4, ease: "power2.out" });
  };

  const handlePointerLeave = (defaultRef: React.RefObject<HTMLImageElement | null>, jutsuRef: React.RefObject<HTMLImageElement | null>) => {
    gsap.to(defaultRef.current, { opacity: 1, duration: 0.4, ease: "power2.out" });
    gsap.to(jutsuRef.current, { opacity: 0, scale: 1, duration: 0.4, ease: "power2.out" });
  };

  // Touch toggle: tap to swap between default/jutsu on touch devices
  const handleTouchToggle = (defaultRef: React.RefObject<HTMLImageElement | null>, jutsuRef: React.RefObject<HTMLImageElement | null>) => {
    if (!jutsuRef.current) return;
    const isShowing = Number(jutsuRef.current.style.opacity) > 0;
    if (isShowing) {
      handlePointerLeave(defaultRef, jutsuRef);
    } else {
      handlePointerEnter(defaultRef, jutsuRef);
    }
  };

  return (
    <section ref={sectionRef} className="w-full py-8 md:py-12 min-h-auto md:min-h-[95vh] mb-16 md:mb-20 flex justify-center">
      <div className="w-full max-w-[1900px] px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[8px]">
        {/* NARUTO */}
        <div
          ref={narutoRef}
          className="flex flex-col rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--naruto-card-bg)", border: "2px solid var(--primary)" }}
          onPointerEnter={() => handlePointerEnter(narutoDefaultRef, narutoJutsuRef)}
          onPointerLeave={() => handlePointerLeave(narutoDefaultRef, narutoJutsuRef)}
          onTouchStart={() => handleTouchToggle(narutoDefaultRef, narutoJutsuRef)}
        >
          <div className="flex flex-col items-center w-full flex-1 p-5 md:p-6 lg:p-8 pb-0">
            <div className="font-anton uppercase text-[24px] md:text-[28px] lg:text-[32px] leading-none" style={{ color: "#F5E6C8" }}>NARUTO</div>
            <div className="font-inter text-sm mt-1 text-center" style={{ color: "rgba(245,230,200,0.85)" }}>
              Never gives up. Never backs down.
            </div>
            <div className="relative w-full flex-1 min-h-[320px] sm:min-h-[450px] md:min-h-[550px] lg:min-h-[650px] overflow-hidden rounded-lg flex items-center justify-center mt-4">
              <img ref={narutoDefaultRef} src="/characters/naruto-default.png" alt="Naruto" className="absolute inset-0 w-full h-full object-contain" />
              <img ref={narutoJutsuRef} src="/characters/naruto-rasengan.png" alt="Naruto Rasengan" className="absolute inset-0 w-full h-full object-contain" style={{ opacity: 0 }} />
            </div>
          </div>
          <div className="w-full p-4 sm:p-5 md:p-6 lg:p-8 pt-4 md:pt-5 pb-8 sm:pb-12 lg:pb-14 mt-auto">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 mx-0 sm:mx-4 md:mx-6 lg:mx-8">
              <Link
                href="/products/naruto-rasengan-hoodie"
                className="flex-1 h-[52px] sm:h-[64px] md:h-[68px] lg:h-[72px] px-4 sm:px-8 md:px-10 lg:px-12 rounded-lg font-cinzel font-bold text-[13px] sm:text-[15px] md:text-[16px] flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ backgroundColor: "#F4E9D3", color: "#1A1A1A" }}
              >
                <span>BUY NOW</span>
                <span className="font-bebas text-2xl sm:text-3xl leading-none">$29.99</span>
              </Link>
              <Link
                href="/products/naruto-rasengan-hoodie"
                className="flex-1 h-[52px] sm:h-[64px] md:h-[68px] lg:h-[72px] px-4 sm:px-8 md:px-10 lg:px-12 rounded-lg font-cinzel font-bold text-[13px] sm:text-[15px] md:text-[16px] flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ backgroundColor: "transparent", color: "white", border: "1.5px solid white" }}
              >
                <span>VIEW PRODUCT</span>
                <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* ITACHI */}
        <div
          ref={itachiRef}
          className="flex flex-col rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--itachi-card-bg)", border: "2px solid var(--itachi-card-accent)" }}
          onPointerEnter={() => handlePointerEnter(itachiDefaultRef, itachiJutsuRef)}
          onPointerLeave={() => handlePointerLeave(itachiDefaultRef, itachiJutsuRef)}
          onTouchStart={() => handleTouchToggle(itachiDefaultRef, itachiJutsuRef)}
        >
          <div className="flex flex-col items-center w-full flex-1 p-5 md:p-6 lg:p-8 pb-0">
            <div className="font-anton uppercase text-[24px] md:text-[28px] lg:text-[32px] leading-none" style={{ color: "#F5E6C8" }}>ITACHI</div>
            <div className="font-inter text-sm mt-1 text-center" style={{ color: "rgba(245,230,200,0.85)" }}>
              Sacrifice everything for peace.
            </div>
            <div className="relative w-full flex-1 min-h-[320px] sm:min-h-[450px] md:min-h-[550px] lg:min-h-[650px] overflow-hidden rounded-lg flex items-center justify-center mt-4">
              <img ref={itachiDefaultRef} src="/characters/itachi-default.png" alt="Itachi" className="absolute inset-0 w-full h-full object-contain" />
              <img ref={itachiJutsuRef} src="/characters/itachi-mangekyou.png" alt="Itachi Mangekyo" className="absolute inset-0 w-full h-full object-contain" style={{ opacity: 0 }} />
            </div>
          </div>
          <div className="w-full p-4 sm:p-5 md:p-6 lg:p-8 pt-4 md:pt-5 pb-8 sm:pb-12 lg:pb-14 mt-auto">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 mx-0 sm:mx-4 md:mx-6 lg:mx-8">
              <Link
                href="/products/itachi-akatsuki-hoodie"
                className="flex-1 h-[52px] sm:h-[64px] md:h-[68px] lg:h-[72px] px-4 sm:px-8 md:px-10 lg:px-12 rounded-lg font-cinzel font-bold text-[13px] sm:text-[15px] md:text-[16px] flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ backgroundColor: "#F4E9D3", color: "#1A1A1A" }}
              >
                <span>BUY NOW</span>
                <span className="font-bebas text-2xl sm:text-3xl leading-none">$34.99</span>
              </Link>
              <Link
                href="/products/itachi-akatsuki-hoodie"
                className="flex-1 h-[52px] sm:h-[64px] md:h-[68px] lg:h-[72px] px-4 sm:px-8 md:px-10 lg:px-12 rounded-lg font-cinzel font-bold text-[13px] sm:text-[15px] md:text-[16px] flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ backgroundColor: "transparent", color: "white", border: "1.5px solid white" }}
              >
                <span>VIEW PRODUCT</span>
                <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* SASUKE */}
        <div
          ref={sasukeRef}
          className="flex flex-col rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--sasuke-card-bg)", border: "2px solid var(--sasuke-accent)" }}
          onPointerEnter={() => handlePointerEnter(sasukeDefaultRef, sasukeJutsuRef)}
          onPointerLeave={() => handlePointerLeave(sasukeDefaultRef, sasukeJutsuRef)}
          onTouchStart={() => handleTouchToggle(sasukeDefaultRef, sasukeJutsuRef)}
        >
          <div className="flex flex-col items-center w-full flex-1 p-5 md:p-6 lg:p-8 pb-0">
            <div className="font-anton uppercase text-[24px] md:text-[28px] lg:text-[32px] leading-none" style={{ color: "#F5E6C8" }}>SASUKE</div>
            <div className="font-inter text-sm mt-1 text-center" style={{ color: "rgba(245,230,200,0.85)" }}>
              Power at any cost.
            </div>
            <div className="relative w-full flex-1 min-h-[320px] sm:min-h-[450px] md:min-h-[550px] lg:min-h-[650px] overflow-hidden rounded-lg flex items-center justify-center mt-4">
              <img ref={sasukeDefaultRef} src="/characters/sasuke-default.png" alt="Sasuke" className="absolute inset-0 w-full h-full object-contain" />
              <img ref={sasukeJutsuRef} src="/characters/sasuke-chidori.png" alt="Sasuke Chidori" className="absolute inset-0 w-full h-full object-contain" style={{ opacity: 0 }} />
            </div>
          </div>
          <div className="w-full p-4 sm:p-5 md:p-6 lg:p-8 pt-4 md:pt-5 pb-8 sm:pb-12 lg:pb-14 mt-auto">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 mx-0 sm:mx-4 md:mx-6 lg:mx-8">
              <Link
                href="/products/sasuke-chidori-hoodie"
                className="flex-1 h-[52px] sm:h-[64px] md:h-[68px] lg:h-[72px] px-4 sm:px-8 md:px-10 lg:px-12 rounded-lg font-cinzel font-bold text-[13px] sm:text-[15px] md:text-[16px] flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ backgroundColor: "#F4E9D3", color: "#1A1A1A" }}
              >
                <span>BUY NOW</span>
                <span className="font-bebas text-2xl sm:text-3xl leading-none">$31.99</span>
              </Link>
              <Link
                href="/products/sasuke-chidori-hoodie"
                className="flex-1 h-[52px] sm:h-[64px] md:h-[68px] lg:h-[72px] px-4 sm:px-8 md:px-10 lg:px-12 rounded-lg font-cinzel font-bold text-[13px] sm:text-[15px] md:text-[16px] flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ backgroundColor: "transparent", color: "white", border: "1.5px solid white" }}
              >
                <span>VIEW PRODUCT</span>
                <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
