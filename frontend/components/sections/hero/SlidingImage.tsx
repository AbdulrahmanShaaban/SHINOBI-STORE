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
      xPercent: xPercent,
    });
    xPercent += 0.07 * direction;
    requestAnimationFrame(animation);
  };
  
  return (
    <div className="absolute -bottom-10 flex w-full h-full">
      <Image
        ref={firstImage}
        src={"/cloud.webp"}
        alt="cloud"
        fill
        priority
        className="absolute left-0 top-0 z-1 object-cover"
      />
      <Image
        style={{ left: "-100%" }}
        ref={secondImage}
        src={"/cloud.webp"}
        alt="cloud"
        fill
        className="absolute left-full z-1 top-0 object-cover"
      />
    </div>
  );
};

export default SlidingImage;
