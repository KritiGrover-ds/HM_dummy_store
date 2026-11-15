"use client";

import { useState } from "react";

/** Full-bleed campaign photo with graceful fallback (keeps the tinted background if all URLs fail). */
export default function HeroImage({ src, fallback, alt }: { src: string; fallback?: string; alt: string }) {
  const [current, setCurrent] = useState(src);
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => {
        if (fallback && current !== fallback) setCurrent(fallback);
        else setFailed(true);
      }}
      className="absolute inset-0 h-full w-full object-cover text-[0px] transition duration-700 group-hover:scale-[1.02]"
    />
  );
}
