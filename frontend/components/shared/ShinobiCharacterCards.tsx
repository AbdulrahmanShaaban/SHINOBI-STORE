"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const CHARACTERS = [
  {
    name: "NARUTO",
    defaultImg: "/naruto-default.png",
    jutsuImg: "/naruto-rasengan.png",
    borderColor: "var(--primary) 0px 0px 10px",
    accentVar: "var(--primary)",
  },
  {
    name: "ITACHI",
    defaultImg: "/itachi-default.png",
    jutsuImg: "/itachi-mangekyou.png",
    borderColor: "var(--red) 0px 0px 10px",
    accentVar: "var(--red)",
  },
  {
    name: "SASUKE",
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

  const handleMouseEnter = (defaultRef: React.RefObject<HTMLImageElement | null>, jutsuRef: React.RefObject<HTMLImageElement | null>) => {
    gsap.to(defaultRef.current, { opacity: 0, duration: 0.4, ease: "power2.out" });
    gsap.to(jutsuRef.current, { opacity: 1, scale: 1.04, duration: 0.4, ease: "power2.out" });
  };

  const handleMouseLeave = (defaultRef: React.RefObject<HTMLImageElement | null>, jutsuRef: React.RefObject<HTMLImageElement | null>) => {
    gsap.to(defaultRef.current, { opacity: 1, duration: 0.4, ease: "power2.out" });
    gsap.to(jutsuRef.current, { opacity: 0, scale: 1, duration: 0.4, ease: "power2.out" });
  };

  return (
    <section ref={sectionRef} className="w-full py-16 px-4 flex justify-center">
      <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row justify-center items-end gap-10 px-6">
        {/* NARUTO */}
        <div
          ref={narutoRef}
          className="flex-1 flex flex-col items-center p-6"
          onMouseEnter={() => handleMouseEnter(narutoDefaultRef, narutoJutsuRef)}
          onMouseLeave={() => handleMouseLeave(narutoDefaultRef, narutoJutsuRef)}
        >
          <div className="font-anton uppercase text-[28px] leading-none" style={{ color: "#F5E6C8" }}>NARUTO</div>
          <div className="font-inter text-sm mt-1" style={{ color: "rgba(245,230,200,0.85)" }}>
            Never gives up. Never backs down.
          </div>
          <div className="relative w-full flex-1 min-h-[450px] md:min-h-[650px] overflow-hidden rounded-lg flex items-center justify-center mt-4" style={{ backgroundColor: "var(--naruto-card-bg)", border: "2px solid var(--primary)" }}>
            <img ref={narutoDefaultRef} src="/naruto-default.png" alt="Naruto" className="absolute inset-0 w-full h-full object-contain" />
            <img ref={narutoJutsuRef} src="/naruto-rasengan.png" alt="Naruto Rasengan" className="absolute inset-0 w-full h-full object-contain" style={{ opacity: 0 }} />
          </div>
        </div>

        {/* ITACHI */}
        <div
          ref={itachiRef}
          className="flex-1 flex flex-col items-center p-6"
          onMouseEnter={() => handleMouseEnter(itachiDefaultRef, itachiJutsuRef)}
          onMouseLeave={() => handleMouseLeave(itachiDefaultRef, itachiJutsuRef)}
        >
          <div className="font-anton uppercase text-[28px] leading-none" style={{ color: "#F5E6C8" }}>ITACHI</div>
          <div className="font-inter text-sm mt-1" style={{ color: "rgba(245,230,200,0.85)" }}>
            Sacrifice everything for peace.
          </div>
          <div className="relative w-full flex-1 min-h-[450px] md:min-h-[650px] overflow-hidden rounded-lg flex items-center justify-center mt-4" style={{ backgroundColor: "var(--itachi-card-bg)", border: "2px solid var(--itachi-card-accent)" }}>
            <img ref={itachiDefaultRef} src="/itachi-default.png" alt="Itachi" className="absolute inset-0 w-full h-full object-contain" />
            <img ref={itachiJutsuRef} src="/itachi-mangekyou.png" alt="Itachi Mangekyo" className="absolute inset-0 w-full h-full object-contain" style={{ opacity: 0 }} />
          </div>
        </div>

        {/* SASUKE */}
        <div
          ref={sasukeRef}
          className="flex-1 flex flex-col items-center p-6"
          onMouseEnter={() => handleMouseEnter(sasukeDefaultRef, sasukeJutsuRef)}
          onMouseLeave={() => handleMouseLeave(sasukeDefaultRef, sasukeJutsuRef)}
        >
          <div className="font-anton uppercase text-[28px] leading-none" style={{ color: "#F5E6C8" }}>SASUKE</div>
          <div className="font-inter text-sm mt-1" style={{ color: "rgba(245,230,200,0.85)" }}>
            Power at any cost.
          </div>
          <div className="relative w-full flex-1 min-h-[450px] md:min-h-[650px] overflow-hidden rounded-lg flex items-center justify-center mt-4" style={{ backgroundColor: "var(--sasuke-card-bg)", border: "2px solid var(--sasuke-accent)" }}>
            <img ref={sasukeDefaultRef} src="/sasuke-default.png" alt="Sasuke" className="absolute inset-0 w-full h-full object-contain" />
            <img ref={sasukeJutsuRef} src="/sasuke-chidori.png" alt="Sasuke Chidori" className="absolute inset-0 w-full h-full object-contain" style={{ opacity: 0 }} />
          </div>
        </div>
      </div>
    </section>
  );
}
