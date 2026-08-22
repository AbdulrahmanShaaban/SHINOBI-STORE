"use client";
import gsap from "gsap";
import Image from "next/image";
import React, { useEffect, useRef } from "react";

const SlidingImage = () => {
  const firstImage = useRef<HTMLImageElement>(null);
  const secondImage = useRef<HTMLImageElement>(null);
  let xPercent = 0;
  let direction = 1;
  
  useEffect(() => {
    requestAnimationFrame(animation);
  }, []);
  
  const animation = () => {
    if (xPercent >= 100) xPercent = 0;
    gsap.set(firstImage.current, {
      xPercent: xPercent,
    });
    gsap.set(secondImage.current, {
      xPercent: xPercent - 100,
    });
    xPercent += 0.05 * direction;
    requestAnimationFrame(animation);
  };
  
  return (
    <div className="absolute -bottom-10 left-0 flex w-full h-full pointer-events-none overflow-hidden">
      <img
        ref={firstImage}
        src={"/cloud.webp"}
        alt="cloud"
        className="absolute left-0 bottom-0 h-full min-w-full w-auto max-w-none object-cover"
      />
      <img
        ref={secondImage}
        src={"/cloud.webp"}
        alt="cloud"
        className="absolute left-0 bottom-0 h-full min-w-full w-auto max-w-none object-cover"
      />
    </div>
  );
};

export default SlidingImage;
