"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const RING_RGB = "255, 107, 0";
const INTERACTIVE =
  'a, button, [role="button"], input, select, textarea, [data-cursor-hover]';

export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [snap, setSnap] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const sync = () => {
      setEnabled(finePointer.matches);
      setSnap(reducedMotion.matches);
    };

    sync();

    finePointer.addEventListener("change", sync);
    reducedMotion.addEventListener("change", sync);

    return () => {
      finePointer.removeEventListener("change", sync);
      reducedMotion.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.body.classList.add("custom-cursor-enabled");
    document.documentElement.classList.add("custom-cursor-boot");

    const dotX = gsap.quickSetter(dot, "x", "px");
    const dotY = gsap.quickSetter(dot, "y", "px");
    const ringX = gsap.quickSetter(ring, "x", "px");
    const ringY = gsap.quickSetter(ring, "y", "px");
    const dotOpacity = gsap.quickSetter(dot, "opacity");
    const ringOpacity = gsap.quickSetter(ring, "opacity");
    const ringScale = gsap.quickTo(ring, "scale", {
      duration: 0.3,
      ease: "power3.out",
    });
    const ringFill = gsap.quickTo(ring, "backgroundColor", {
      duration: 0.3,
      ease: "power3.out",
    }) as unknown as (value: string) => void;

    let shown = false;

    const onMove = (e: PointerEvent) => {
      if (!shown) {
        shown = true;
        dotOpacity(1);
        ringOpacity(1);
      }

      dotX(e.clientX);
      dotY(e.clientY);

      if (snap) {
        ringX(e.clientX);
        ringY(e.clientY);
      } else {
        gsap.to(ring, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.7,
          ease: "power2.out",
          overwrite: "auto",
        });
      }
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target && target.closest(INTERACTIVE)) {
        ringScale(1.7);
        ringFill(`rgba(${RING_RGB}, 0.14)`);
      }
    };

    const onOut = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target && target.closest(INTERACTIVE)) {
        ringScale(1);
        ringFill(`rgba(${RING_RGB}, 0)`);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);

    return () => {
      document.body.classList.remove("custom-cursor-enabled");
      document.documentElement.classList.remove("custom-cursor-boot");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      gsap.killTweensOf(ring);
    };
  }, [enabled, snap]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor: "var(--primary)",
          margin: "-5px 0 0 -5px",
          opacity: 0,
        }}
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-8.5 w-8.5 rounded-full border-2"
        style={{
          borderColor: "var(--primary)",
          backgroundColor: `rgba(${RING_RGB}, 0)`,
          margin: "-20px 0 0 -20px",
          opacity: 0,
        }}
      />
    </>
  );
}