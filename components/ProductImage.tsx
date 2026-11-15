"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Clean H&M studio lookbook placeholder (inline SVG data URI) – shown only when
 * every real photo URL fails (offline, blocked hotlink, slow CDN).
 */
export function studioPlaceholder(label = "H&M", colorHex = "#e9e6e1"): string {
  const safeLabel = label.replace(/[<>&"]/g, "").slice(0, 40);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f2ef"/><stop offset="1" stop-color="#e7e3dd"/></linearGradient></defs>
  <rect width="600" height="800" fill="url(#g)"/>
  <path d="M220 170 L170 200 L110 330 L165 355 L200 290 L200 640 L400 640 L400 290 L435 355 L490 330 L430 200 L380 170 Q300 230 220 170 Z" fill="${colorHex}" opacity="0.92" stroke="#00000014" stroke-width="3"/>
  <text x="300" y="715" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#555" text-anchor="middle">${safeLabel}</text>
  <text x="300" y="100" font-family="Georgia, serif" font-weight="700" font-size="44" fill="#E50010" text-anchor="middle">H&amp;M</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface ProductImageProps {
  src: string;
  alt: string;
  hoverSrc?: string;
  fallbacks?: string[];
  colorHex?: string;
  placeholderLabel?: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}

/**
 * Real-photo renderer: plain <img> (no next/image domain whitelist), H&M 3:4
 * portrait crop, hover lookbook angle, and a chained onError fallback.
 */
export default function ProductImage({
  src,
  alt,
  hoverSrc,
  fallbacks = [],
  colorHex,
  placeholderLabel,
  className = "",
  imgClassName = "",
  eager = false,
}: ProductImageProps) {
  const candidates = useMemo(
    () => Array.from(new Set([src, ...fallbacks].filter(Boolean))),
    [src, fallbacks]
  );
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [hoverFailed, setHoverFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Reset when the colour variant (src) changes
  useEffect(() => {
    setIndex(0);
    setHoverFailed(false);
    setLoaded(false);
  }, [src]);

  const placeholder = useMemo(() => studioPlaceholder(placeholderLabel ?? alt, colorHex), [placeholderLabel, alt, colorHex]);
  const current = index < candidates.length ? candidates[index] : placeholder;
  const showHover = Boolean(hoverSrc && hovered && !hoverFailed && hoverSrc !== current);

  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden bg-[#efece8] ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-[#ece8e3]" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setIndex((i) => i + 1)}
        className={`absolute inset-0 h-full w-full object-cover text-[0px] transition-opacity duration-500 ${showHover ? "opacity-0" : "opacity-100"} ${imgClassName}`}
      />
      {hoverSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hoverSrc}
          alt=""
          aria-hidden
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setHoverFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${showHover ? "opacity-100" : "opacity-0"} ${imgClassName}`}
        />
      )}
    </div>
  );
}
