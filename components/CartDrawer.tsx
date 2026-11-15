"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import ProductImage from "./ProductImage";
import { FREE_DELIVERY_THRESHOLD, STANDARD_DELIVERY_FEE, formatINR } from "@/lib/catalogConfig";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, setQuantity, subtotal, itemCount, notices, dismissNotice } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeCart]);

  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD || user?.tier === "Member Plus";
  const remainingForFree = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const delivery = items.length === 0 ? 0 : freeDelivery ? 0 : STANDARD_DELIVERY_FEE;

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={closeCart}
        aria-hidden
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        aria-label="Shopping bag"
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold">Shopping bag ({itemCount})</h2>
          <button onClick={closeCart} aria-label="Close shopping bag"><X size={22} strokeWidth={1.5} /></button>
        </div>

        {notices.length > 0 && (
          <div className="space-y-2 border-b border-neutral-200 bg-[#fff6f6] px-5 py-3">
            {notices.map((n, i) => (
              <div key={i} className="flex items-start justify-between gap-2 text-xs text-[#b0000c]">
                <span>{n}</span>
                <button onClick={() => dismissNotice(i)} aria-label="Dismiss"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag size={40} strokeWidth={1} />
            <p className="text-sm">Your shopping bag is empty</p>
            <Link href="/shop" onClick={closeCart} className="bg-black px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white">
              Continue shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="border-b border-neutral-200 px-5 py-3 text-xs">
              {freeDelivery ? (
                <p className="font-semibold text-emerald-700">You’ve unlocked free standard delivery!</p>
              ) : (
                <>
                  <p>Add <span className="font-semibold">{formatINR(remainingForFree)}</span> more for free delivery.</p>
                  <div className="mt-2 h-1 bg-neutral-200">
                    <div className="h-1 bg-black" style={{ width: `${Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)}%` }} />
                  </div>
                </>
              )}
            </div>

            <ul className="flex-1 divide-y divide-neutral-200 overflow-y-auto px-5">
              {items.map((item) => (
                <li key={item.variantKey} className="flex gap-4 py-4">
                  <Link href={`/products/${item.slug}?color=${encodeURIComponent(item.colorName)}`} onClick={closeCart} className="w-24 shrink-0">
                    <ProductImage src={item.imageUrl} alt={item.title} colorHex={item.colorHex} />
                  </Link>
                  <div className="flex flex-1 flex-col text-[13px]">
                    <div className="flex justify-between gap-2">
                      <Link href={`/products/${item.slug}`} onClick={closeCart} className="hover:underline">{item.title}</Link>
                      <button onClick={() => removeItem(item.variantKey)} aria-label="Remove item" className="text-neutral-500 hover:text-black">
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                    <p className="mt-0.5 font-semibold">{formatINR(item.price)}</p>
                    <p className="mt-1 text-xs text-neutral-600">Art. no. {item.articleNumber}</p>
                    <p className="text-xs text-neutral-600">Colour: {item.colorName} · Size: {item.size}</p>
                    {item.maxStock <= 2 && <p className="text-xs font-semibold text-[#E50010]">Only {item.maxStock} left</p>}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center border border-neutral-300">
                        <button onClick={() => setQuantity(item.variantKey, item.quantity - 1)} className="p-1.5" aria-label="Decrease quantity"><Minus size={14} /></button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => setQuantity(item.variantKey, item.quantity + 1)}
                          disabled={item.quantity >= Math.min(item.maxStock, 10)}
                          className="p-1.5 disabled:opacity-30"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="font-semibold">{formatINR(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-neutral-200 px-5 py-4 text-sm">
              <div className="flex justify-between"><span>Order value</span><span>{formatINR(subtotal)}</span></div>
              <div className="mt-1 flex justify-between"><span>Delivery</span><span>{delivery === 0 ? "Free" : formatINR(delivery)}</span></div>
              <div className="mt-3 flex justify-between border-t border-neutral-200 pt-3 text-base font-semibold">
                <span>Total</span><span>{formatINR(subtotal + delivery)}</span>
              </div>
              <Link href="/checkout" onClick={closeCart} className="mt-4 block w-full bg-black py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-white hover:bg-neutral-800">
                Continue to checkout
              </Link>
              {!user && (
                <p className="mt-2 text-center text-xs text-neutral-600">
                  <Link href="/login" onClick={closeCart} className="underline">Sign in</Link> to earn LINEA Member points on this order.
                </p>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
