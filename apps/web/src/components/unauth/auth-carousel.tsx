"use client";

import Image from "next/image";

export function AuthCarousel() {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden">
      <Image
        src={"/assets/cart.png"}
        alt={"cart"}
        width={280}
        height={360}
        className="w-full h-auto"
      />
    </div>
  );
}
