"use client";

import Image from "next/image";

export function AuthCarousel() {
  return (
    <div className="relative -mx-6 w-[calc(100%+3rem)] overflow-hidden">
      <Image
        src="/assets/cart.png"
        alt="RSC multi-outlet cart"
        width={280}
        height={360}
        sizes="(min-width: 768px) 378px, 100vw"
        className="block h-auto w-full"
      />
    </div>
  );
}
