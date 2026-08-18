"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SHINOBI_LETTERS = ["S", "H", "I", "N", "O", "B", "I"];

export default function ChooseShinobi() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const outlineRowRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!sectionRef.current || !headingRef.current || !outlineRowRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 80%",
        once: true,
      },
    });

    // "CHOOSE YOUR" fades in and drops down from 40px above
    tl.fromTo(
      headingRef.current,
      { y: -40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
    );

    // Each letter of "SHINOBI" animates in individually
    const validLetters = lettersRef.current.filter(Boolean);
    tl.fromTo(
      validLetters,
      { y: 80, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.06,
      },
      "-=0.3"
    );

    // After all letters land, subtle scale pulse on the whole word
    tl.to(outlineRowRef.current, {
      scale: 1.03,
      duration: 0.8,
      ease: "power2.inOut",
    });
    tl.to(outlineRowRef.current, {
      scale: 1,
      duration: 0.8,
      ease: "power2.inOut",
    });
  }, []);

  return (
    <section
      ref={sectionRef}
      className="choose-shinobi-section"
    >
      {/* "CHOOSE YOUR" line */}
      <div ref={headingRef} className="choose-your-heading">
        CHOOSE YOUR
      </div>

      {/* "SHINOBI" outlined text row */}
      <div ref={outlineRowRef} className="shinobi-outline-row">
        {SHINOBI_LETTERS.map((letter, i) => (
          <span
            key={i}
            ref={(el) => { lettersRef.current[i] = el; }}
            className="shinobi-outline-letter"
          >
            {letter}
          </span>
        ))}
      </div>
    </section>
  );
}
