"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
  { src: "/assets/rsc-asset-dessert.png", alt: "RSC Dessert" },
  { src: "/assets/rsc-asset-italian.png", alt: "RSC Italian" },
  { src: "/assets/rsc-asset-continental.png", alt: "RSC Continental" },
];

export function AuthCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden mt-4">
      {slides.map((slide, i) => (
        <div
          key={slide.src}
          className={`transition-opacity duration-700 ease-in-out ${
            i === current ? "opacity-100 relative" : "opacity-0 absolute inset-0"
          }`}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            width={210}
            height={256}
            className="w-full h-64 object-cover"
            priority={i === 0}
          />
        </div>
      ))}

      {/* Pagination dots */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? "w-5 bg-white" : "w-2 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
