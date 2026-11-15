"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import type { Product } from "@/types/store";
import ProductImage from "./ProductImage";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useLiveProduct } from "@/hooks/useInventoryStream";
import { formatINR } from "@/lib/catalogConfig";

/** Favourites with quick colour/size "Move to Bag". */
export default function WishlistGrid() {
  const { wishlist, user } = useAuth();
  const [products, setProducts] = useState<Product[] | null>(null);
  const key = wishlist.slice().sort().join(",");

  useEffect(() => {
    if (!user) return;
    if (!key) {
      setProducts([]);
      return;
    }
    fetch(`/api/products?ids=${encodeURIComponent(key)}&limit=200`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]));
  }, [key, user]);

  if (products === null) return <p className="py-10 text-sm text-neutral-500">Loading your favourites…</p>;
  const visible = products.filter((p) => wishlist.includes(p.id));
  if (visible.length === 0) {
    return (
      <div className="py-14 text-center">
        <Heart size={36} strokeWidth={1} className="mx-auto" />
        <p className="mt-3 text-sm">You haven’t saved any favourites yet. Tap the heart on any item to save it here.</p>
        <Link href="/shop" className="mt-5 inline-block bg-black px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white">Start shopping</Link>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {visible.map((p) => <WishlistItem key={p.id} product={p} />)}
    </div>
  );
}

function WishlistItem({ product: initial }: { product: Product }) {
  const product = useLiveProduct(initial);
  const { toggleFavourite } = useAuth();
  const { addItem } = useCart();
  const [vi, setVi] = useState(0);
  const [size, setSize] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const variant = product.variants[vi];
  const available = variant.sizes.filter((s) => s.stock > 0);

  const moveToBag = () => {
    const chosen = size || (available.length === 1 ? available[0].size : "");
    if (!chosen) {
      setMsg("Select a size");
      return;
    }
    const res = addItem(product, variant, chosen, 1);
    if (res.ok) void toggleFavourite(product.id, { source: "move_to_bag" });
    else setMsg(res.message ?? "Could not add");
  };

  return (
    <div className="flex flex-col">
      <div className="relative">
        <Link href={`/products/${product.slug}?color=${encodeURIComponent(variant.colorName)}`}>
          <ProductImage src={variant.imageUrl} hoverSrc={variant.hoverImageUrl} fallbacks={variant.galleryImages} alt={product.title} colorHex={variant.colorHex} />
        </Link>
        <button onClick={() => toggleFavourite(product.id, { source: "favourites" })} aria-label="Remove from Favourites" className="absolute right-2 top-2 rounded-full bg-white/85 p-1.5">
          <Heart size={18} className="fill-[#E50010] text-[#E50010]" />
        </button>
      </div>
      <p className="mt-2 text-[13px]">{product.title}</p>
      <p className="text-[13px] font-semibold">{formatINR(product.price)}</p>
      <div className="mt-2 flex gap-1.5">
        {product.variants.map((v, i) => (
          <button key={v.colorName} title={v.colorName} onClick={() => { setVi(i); setSize(""); }} className={`h-4 w-4 rounded-full border ${i === vi ? "ring-1 ring-black ring-offset-2" : "border-neutral-300"}`} style={{ backgroundColor: v.colorHex }} />
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <select value={size} onChange={(e) => { setSize(e.target.value); setMsg(null); }} className="flex-1 border border-neutral-300 bg-white px-2 py-2 text-xs">
          <option value="">{available.length ? "Size" : "Sold out"}</option>
          {variant.sizes.map((s) => (
            <option key={s.size} value={s.size} disabled={s.stock === 0}>
              {s.size}{s.stock === 0 ? " – out of stock" : s.stock <= 2 ? ` – only ${s.stock} left` : ""}
            </option>
          ))}
        </select>
        <button onClick={moveToBag} disabled={available.length === 0} className="bg-black px-3 text-[11px] font-semibold uppercase text-white disabled:bg-neutral-300">
          Move to bag
        </button>
      </div>
      {msg && <p className="mt-1 text-xs text-[#E50010]">{msg}</p>}
    </div>
  );
}
