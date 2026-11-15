"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart } from "lucide-react";
import type { Product } from "@/types/store";
import ProductImage from "./ProductImage";
import { useAuth } from "@/context/AuthContext";
import { useLiveProduct } from "@/hooks/useInventoryStream";
import { trackEvent } from "@/lib/telemetryClient";
import { formatINR } from "@/lib/catalogConfig";

export default function ProductCard({ product: initial, eager = false }: { product: Product; eager?: boolean }) {
  const product = useLiveProduct(initial);
  const { isFavourite, toggleFavourite } = useAuth();
  const [variantIndex, setVariantIndex] = useState(0);
  const variant = product.variants[variantIndex] ?? product.variants[0];
  const variantStock = variant.sizes.reduce((s, x) => s + x.stock, 0);
  const minSizeStock = Math.min(...variant.sizes.filter((s) => s.stock > 0).map((s) => s.stock));
  const saved = isFavourite(product.id);
  const discount = product.isSale && product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

  let badge: { text: string; className: string } | null = null;
  if (variantStock === 0) badge = { text: "Sold Out", className: "bg-neutral-800 text-white" };
  else if (minSizeStock <= 2) badge = { text: `Only ${minSizeStock} left`, className: "bg-white text-[#E50010]" };
  else if (product.isSale) badge = { text: `SALE -${discount}%`, className: "bg-[#E50010] text-white" };
  else if (product.isNewArrival) badge = { text: "New Arrival", className: "bg-white text-black" };

  const href = `/products/${product.slug}?color=${encodeURIComponent(variant.colorName)}`;
  const fallbacks = [variant.hoverImageUrl, ...variant.galleryImages];

  return (
    <article className="group relative flex flex-col">
      <div className="relative">
        <Link href={href} aria-label={product.title}>
          <ProductImage
            src={variant.imageUrl}
            hoverSrc={variant.hoverImageUrl}
            fallbacks={fallbacks}
            alt={`${product.title} – ${variant.colorName}`}
            placeholderLabel={product.title}
            colorHex={variant.colorHex}
            eager={eager}
            imgClassName={variantStock === 0 ? "grayscale-[40%]" : ""}
          />
        </Link>
        {badge && (
          <span className={`pointer-events-none absolute left-2 top-2 px-2 py-0.5 text-[11px] font-semibold tracking-wide ${badge.className}`}>
            {badge.text}
          </span>
        )}
        <button
          type="button"
          aria-label={saved ? "Remove from Favourites" : "Save to Favourites"}
          onClick={() =>
            toggleFavourite(product.id, { department: product.department, subcategory: product.subcategory, price: product.price, source: "card" })
          }
          className="absolute right-2 top-2 rounded-full bg-white/85 p-1.5 transition hover:bg-white"
        >
          <Heart size={18} className={saved ? "fill-[#E50010] text-[#E50010]" : "text-black"} strokeWidth={1.5} />
        </button>
      </div>

      <div className="mt-2 flex flex-col gap-1">
        <Link href={href} className="text-[13px] leading-snug text-neutral-900 hover:underline">
          {product.title}
        </Link>
        <div className="flex items-baseline gap-2 text-[13px]">
          <span className={product.isSale ? "font-semibold text-[#E50010]" : "font-semibold"}>{formatINR(product.price)}</span>
          {product.isSale && product.originalPrice && (
            <span className="text-neutral-500 line-through">{formatINR(product.originalPrice)}</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {product.variants.map((v, i) => (
            <button
              key={v.colorName}
              type="button"
              title={v.colorName}
              aria-label={`Colour ${v.colorName}`}
              onClick={() => {
                setVariantIndex(i);
                trackEvent(
                  "color_swatch_selected",
                  { colorName: v.colorName, source: "product_card", department: product.department, subcategory: product.subcategory },
                  product.id
                );
              }}
              className={`h-3.5 w-3.5 rounded-full border transition ${i === variantIndex ? "ring-1 ring-black ring-offset-2" : "border-neutral-300"}`}
              style={{ backgroundColor: v.colorHex }}
            />
          ))}
          {product.isConscious && <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-emerald-700">Conscious</span>}
        </div>
      </div>
    </article>
  );
}
