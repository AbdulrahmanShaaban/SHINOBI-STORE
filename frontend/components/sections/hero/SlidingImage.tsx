"use client";
import gsap from "gsap";
import { useEffect, useRef } from "react";

/**
 * Endlessly slides two copies of the cloud strip. The loop lives inside the
 * effect closure and is cancelled on unmount so it can never outlive the
 * homepage (previously the rAF chain kept running across route changes).
 */
const SlidingImage = () => {
  const firstImage = useRef<HTMLImageElement>(null);
  const secondImage = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let raf = 0;
    let xPercent = 0;

    const animation = () => {
      if (xPercent >= 100) xPercent = 0;
      gsap.set(firstImage.current, { xPercent });
      gsap.set(secondImage.current, { xPercent: xPercent - 100 });
      xPercent += 0.05;
      raf = requestAnimationFrame(animation);
    };

    raf = requestAnimationFrame(animation);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="absolute -bottom-10 left-0 flex w-full h-full pointer-events-none overflow-hidden">
      <img
        ref={firstImage}
         src={"/sections/cloud.webp"}
        alt=""
        className="absolute left-0 bottom-0 h-full min-w-full w-auto max-w-none object-cover"
      />
      <img
        ref={secondImage}
         src={"/sections/cloud.webp"}
        alt=""
        className="absolute left-0 bottom-0 h-full min-w-full w-auto max-w-none object-cover"
      />
    </div>
  );
};

export default SlidingImage;
