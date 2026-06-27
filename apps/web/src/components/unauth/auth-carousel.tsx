"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function AuthCarousel() {
  const [current, setCurrent] = useState(0);

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
