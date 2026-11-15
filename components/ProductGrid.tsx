"use client";

import type { Product } from "@/types/store";
import ProductCard from "./ProductCard";

export default function ProductGrid({ products, eagerCount = 4 }: { products: Product[]; eagerCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} eager={i < eagerCount} />
      ))}
    </div>
  );
}
