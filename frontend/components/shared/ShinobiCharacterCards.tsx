"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useCartStore } from "./Cart";

gsap.registerPlugin(ScrollTrigger);

const CHARACTERS = [
  {
    name: "NARUTO",
    id: "naruto",
    price: 29.99,
    defaultImg: "/naruto-default.png",
    jutsuImg: "/naruto-rasengan.png",
    borderColor: "var(--primary) 0px 0px 10px",
    accentVar: "var(--primary)",
  },
  {
    name: "ITACHI",
    id: "itachi",
    price: 34.99,
    defaultImg: "/itachi-default.png",
    jutsuImg: "/itachi-mangekyou.png",
    borderColor: "var(--red) 0px 0px 10px",
    accentVar: "var(--red)",
  },
  {
    name: "SASUKE",
    id: "sasuke",
    price: 31.99,
    defaultImg: "/sasuke-default.png",
    jutsuImg: "/sasuke-chidori.png",
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

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 75%",
        once: true,
      },
    });

    tl.fromTo(
      [itachiRef.current, narutoRef.current, sasukeRef.current],
      { y: 100, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "power3.out", stagger: 0.15 }
    );
  }, []);

  const addItem = useCartStore((s) => s.addItem);

  const handleMouseEnter = (defaultRef: React.RefObject<HTMLImageElement | null>, jutsuRef: React.RefObject<HTMLImageElement | null>) => {
    gsap.to(defaultRef.current, { opacity: 0, duration: 0.4, ease: "power2.out" });
    gsap.to(jutsuRef.current, { opacity: 1, scale: 1.04, duration: 0.4, ease: "power2.out" });
  };

  const handleMouseLeave = (defaultRef: React.RefObject<HTMLImageElement | null>, jutsuRef: React.RefObject<HTMLImageElement | null>) => {
    gsap.to(defaultRef.current, { opacity: 1, duration: 0.4, ease: "power2.out" });
    gsap.to(jutsuRef.current, { opacity: 0, scale: 1, duration: 0.4, ease: "power2.out" });
  };

  return (
    <section ref={sectionRef} className="w-full py-8 md:py-12 min-h-[90vh] md:min-h-[95vh] mb-16 md:mb-20 flex justify-center">
      <div className="w-full max-w-[1900px] px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[8px]">
        {/* NARUTO */}
        <div
          ref={narutoRef}
          className="flex flex-col rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--naruto-card-bg)", border: "2px solid var(--primary)" }}
          onMouseEnter={() => handleMouseEnter(narutoDefaultRef, narutoJutsuRef)}
          onMouseLeave={() => handleMouseLeave(narutoDefaultRef, narutoJutsuRef)}
        >
          <div className="flex flex-col items-center w-full flex-1 p-5 md:p-6 lg:p-8 pb-0">
            <div className="font-anton uppercase text-[24px] md:text-[28px] lg:text-[32px] leading-none" style={{ color: "#F5E6C8" }}>NARUTO</div>
            <div className="font-inter text-sm mt-1 text-center" style={{ color: "rgba(245,230,200,0.85)" }}>
              Never gives up. Never backs down.
            </div>
            <div className="relative w-full flex-1 min-h-[500px] md:min-h-[650px] lg:min-h-[750px] overflow-hidden rounded-lg flex items-center justify-center mt-4">
              <img ref={narutoDefaultRef} src="/naruto-default.png" alt="Naruto" className="absolute inset-0 w-full h-full object-contain" />
              <img ref={narutoJutsuRef} src="/naruto-rasengan.png" alt="Naruto Rasengan" className="absolute inset-0 w-full h-full object-contain" style={{ opacity: 0 }} />
            </div>
          </div>
          <div className="w-full p-5 md:p-6 lg:p-8 pt-4 md:pt-5 pb-10 lg:pb-12 mt-auto">
            <div className="flex gap-3 md:gap-4">
              <button
                onClick={() => addItem({ id: "naruto", name: "NARUTO", price: 29.99, quantity: 1, image: "/naruto-default.png" })}
                className="flex-1 h-[64px] md:h-[68px] lg:h-[72px] px-8 md:px-10 lg:px-12 rounded-lg font-cinzel font-bold text-[15px] md:text-[16px] flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ backgroundColor: "#F4E9D3", color: "#1A1A1A" }}
              >
                <span>ADD TO CART</span>
                <span className="font-inter text-[13px] md:text-[14px] font-semibold">$29.99</span>
              </button>
              <Link
                href={`/product/naruto`}
                className="flex-1 h-[64px] md:h-[68px] lg:h-[72px] px-8 md:px-10 lg:px-12 rounded-lg font-cinzel font-bold text-[15px] md:text-[16px] flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ backgroundColor: "transparent", color: "white", border: "1.5px solid white" }}
              >
                <span>VIEW PRODUCT</span>
                <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          onMouseEnter={() => handleMouseEnter(itachiDefaultRef, itachiJutsuRef)}
          onMouseLeave={() => handleMouseLeave(itachiDefaultRef, itachiJutsuRef)}
        >
          <div className="flex flex-col items-center w-full flex-1 p-5 md:p-6 lg:p-8 pb-0">
            <div className="font-anton uppercase text-[24px] md:text-[28px] lg:text-[32px] leading-none" style={{ color: "#F5E6C8" }}>ITACHI</div>
            <div className="font-inter text-sm mt-1 text-center" style={{ color: "rgba(245,230,200,0.85)" }}>
              Sacrifice everything for peace.
            </div>
            <div className="relative w-full flex-1 min-h-[500px] md:min-h-[650px] lg:min-h-[750px] overflow-hidden rounded-lg flex items-center justify-center mt-4">
              <img ref={itachiDefaultRef} src="/itachi-default.png" alt="Itachi" className="absolute inset-0 w-full h-full object-contain" />
              <img ref={itachiJutsuRef} src="/itachi-mangekyou.png" alt="Itachi Mangekyo" className="absolute inset-0 w-full h-full object-contain" style={{ opacity: 0 }} />
            </div>
          </div>
          <div className="w-full p-5 md:p-6 lg:p-8 pt-4 md:pt-5 pb-10 lg:pb-12 mt-auto">
            <div className="flex gap-3 md:gap-4">
              <button
                onClick={() => addItem({ id: "itachi", name: "ITACHI", price: 34.99, quantity: 1, image: "/itachi-default.png" })}
                className="flex-1 h-[64px] md:h-[68px] lg:h-[72px] px-8 md:px-10 lg:px-12 rounded-lg font-cinzel font-bold text-[15px] md:text-[16px] flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ backgroundColor: "#F4E9D3", color: "#1A1A1A" }}
              >
                <span>ADD TO CART</span>
                <span className="font-inter text-[13px] md:text-[14px] font-semibold">$34.99</span>
              </button>
              <Link
                href={`/product/itachi`}
                className="flex-1 h-[64px] md:h-[68px] lg:h-[72px] px-8 md:px-10 lg:px-12 rounded-lg font-cinzel font-bold text-[15px] md:text-[16px] flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ backgroundColor: "transparent", color: "white", border: "1.5px solid white" }}
              >
                <span>VIEW PRODUCT</span>
                <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          onMouseEnter={() => handleMouseEnter(sasukeDefaultRef, sasukeJutsuRef)}
          onMouseLeave={() => handleMouseLeave(sasukeDefaultRef, sasukeJutsuRef)}
        >
          <div className="flex flex-col items-center w-full flex-1 p-5 md:p-6 lg:p-8 pb-0">
            <div className="font-anton uppercase text-[24px] md:text-[28px] lg:text-[32px] leading-none" style={{ color: "#F5E6C8" }}>SASUKE</div>
            <div className="font-inter text-sm mt-1 text-center" style={{ color: "rgba(245,230,200,0.85)" }}>
              Power at any cost.
            </div>
            <div className="relative w-full flex-1 min-h-[500px] md:min-h-[650px] lg:min-h-[750px] overflow-hidden rounded-lg flex items-center justify-center mt-4">
              <img ref={sasukeDefaultRef} src="/sasuke-default.png" alt="Sasuke" className="absolute inset-0 w-full h-full object-contain" />
              <img ref={sasukeJutsuRef} src="/sasuke-chidori.png" alt="Sasuke Chidori" className="absolute inset-0 w-full h-full object-contain" style={{ opacity: 0 }} />
            </div>
          </div>
          <div className="w-full p-5 md:p-6 lg:p-8 pt-4 md:pt-5 pb-10 lg:pb-12 mt-auto">
            <div className="flex gap-3 md:gap-4">
              <button
                onClick={() => addItem({ id: "sasuke", name: "SASUKE", price: 31.99, quantity: 1, image: "/sasuke-default.png" })}
                className="flex-1 h-[64px] md:h-[68px] lg:h-[72px] px-8 md:px-10 lg:px-12 rounded-lg font-cinzel font-bold text-[15px] md:text-[16px] flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ backgroundColor: "#F4E9D3", color: "#1A1A1A" }}
              >
                <span>ADD TO CART</span>
                <span className="font-inter text-[13px] md:text-[14px] font-semibold">$31.99</span>
              </button>
              <Link
                href={`/product/sasuke`}
                className="flex-1 h-[64px] md:h-[68px] lg:h-[72px] px-8 md:px-10 lg:px-12 rounded-lg font-cinzel font-bold text-[15px] md:text-[16px] flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ backgroundColor: "transparent", color: "white", border: "1.5px solid white" }}
              >
                <span>VIEW PRODUCT</span>
                <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
