"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/types/store";
import ProductCard from "./ProductCard";

/** Horizontal scroll-snap carousel of product cards. */
export default function ProductRail({ title, href, products }: { title: string; href: string; products: Product[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });

  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-10">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="text-xl font-semibold md:text-2xl">{title}</h2>
        <div className="flex items-center gap-3">
          <Link href={href} className="text-sm underline underline-offset-4">View all</Link>
          <button onClick={() => scroll(-1)} aria-label="Scroll left" className="hidden border border-neutral-300 p-1.5 hover:border-black md:block"><ChevronLeft size={18} /></button>
          <button onClick={() => scroll(1)} aria-label="Scroll right" className="hidden border border-neutral-300 p-1.5 hover:border-black md:block"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto">
        {products.map((p, i) => (
          <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23%] xl:w-[19%]">
            <ProductCard product={p} eager={i < 4} />
          </div>
        ))}
      </div>
    </section>
  );
}
