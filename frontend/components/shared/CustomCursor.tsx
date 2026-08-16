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

    const dotX = gsap.quickSetter(dot, "x", "px");
    const dotY = gsap.quickSetter(dot, "y", "px");
    const ringX = gsap.quickSetter(ring, "x", "px");
    const ringY = gsap.quickSetter(ring, "y", "px");
    const ringScale = gsap.quickTo(ring, "scale", {
      duration: 0.3,
      ease: "power3.out",
    });
    const ringFill = gsap.quickTo(ring, "backgroundColor", {
      duration: 0.3,
      ease: "power3.out",
    }) as unknown as (value: string) => void;

    const onMove = (e: PointerEvent) => {
      dotX(e.clientX);
      dotY(e.clientY);

      if (snap) {
        ringX(e.clientX);
        ringY(e.clientY);
      } else {
        gsap.to(ring, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.45,
          ease: "power3.out",
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
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-2 w-2 rounded-full"
        style={{ backgroundColor: "var(--primary)", margin: "-4px 0 0 -4px" }}
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-10 w-10 rounded-full border-2"
        style={{
          borderColor: "var(--primary)",
          backgroundColor: `rgba(${RING_RGB}, 0)`,
          margin: "-20px 0 0 -20px",
        }}
      />
    </>
  );
}