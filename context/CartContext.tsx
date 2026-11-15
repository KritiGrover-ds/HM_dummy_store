"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CartItem, InventoryEvent, Product, ProductVariant } from "@/types/store";
import { trackEvent } from "@/lib/telemetryClient";
import { useInventoryStream } from "@/hooks/useInventoryStream";

const STORAGE_KEY = "hm_cart_v1";
const MAX_PER_LINE = 10;

export const makeVariantKey = (productId: string, colorName: string, size: string) => `${productId}_${colorName}_${size}`;

interface CartContextValue {
  items: CartItem[];
  hydrated: boolean;
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  notices: string[];
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, variant: ProductVariant, size: string, quantity?: number) => { ok: boolean; message?: string };
  removeItem: (variantKey: string) => void;
  setQuantity: (variantKey: string, quantity: number) => void;
  clearCart: () => void;
  dismissNotice: (index: number) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function snapshot(items: CartItem[]) {
  return items.map((i) => ({ productId: i.productId, colorName: i.colorName, size: i.size, quantity: i.quantity, price: i.price }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [notices, setNotices] = useState<string[]>([]);
  const itemsRef = useRef<CartItem[]>([]);
  itemsRef.current = items;

  // Hydration-safe: read localStorage only after mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* corrupted storage – start empty */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full / private mode */
    }
  }, [items, hydrated]);

  // Keep carts in sync across tabs of the same browser
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setItems(JSON.parse(e.newValue) as CartItem[]);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Real-time clamp: when another shopper buys the last pieces, reduce our quantities
  const onInventory = useCallback((event: InventoryEvent) => {
    if (event.type !== "STOCK_UPDATE") return;
    const affected = itemsRef.current.filter((i) => i.productId === event.productId);
    if (affected.length === 0) return;
    const newNotices: string[] = [];
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.productId !== event.productId) return item;
          const stock = event.variants.find((v) => v.colorName === item.colorName)?.sizes.find((s) => s.size === item.size)?.stock;
          if (stock === undefined) return item;
          if (stock <= 0) {
            newNotices.push(`${item.title} (${item.colorName}, ${item.size}) just sold out and was removed from your bag.`);
            return null;
          }
          if (item.quantity > stock) {
            newNotices.push(`Only ${stock} left of ${item.title} (${item.colorName}, ${item.size}) – we updated your bag.`);
            return { ...item, quantity: stock, maxStock: stock };
          }
          return { ...item, maxStock: stock };
        })
        .filter((x): x is CartItem => x !== null)
    );
    if (newNotices.length) setNotices((n) => [...n, ...newNotices]);
  }, []);
  useInventoryStream(onInventory);

  const addItem = useCallback(
    (product: Product, variant: ProductVariant, size: string, quantity = 1) => {
      const stock = variant.sizes.find((s) => s.size === size)?.stock ?? 0;
      if (stock <= 0) return { ok: false, message: "This size is sold out." };
      const key = makeVariantKey(product.id, variant.colorName, size);
      const existing = itemsRef.current.find((i) => i.variantKey === key);
      const limit = Math.min(stock, MAX_PER_LINE);
      const currentQty = existing?.quantity ?? 0;
      if (currentQty >= limit) return { ok: false, message: `You already have the maximum available (${limit}) in your bag.` };
      const newQty = Math.min(limit, currentQty + quantity);

      const next: CartItem[] = existing
        ? itemsRef.current.map((i) => (i.variantKey === key ? { ...i, quantity: newQty, maxStock: stock } : i))
        : [
            ...itemsRef.current,
            {
              variantKey: key,
              productId: product.id,
              slug: product.slug,
              title: product.title,
              articleNumber: product.articleNumber,
              colorName: variant.colorName,
              colorHex: variant.colorHex,
              size,
              price: product.price,
              imageUrl: variant.imageUrl,
              quantity: newQty,
              maxStock: stock,
            },
          ];
      setItems(next);
      setIsOpen(true);
      trackEvent(
        "cart_add",
        {
          colorName: variant.colorName,
          size,
          quantity: newQty - currentQty,
          price: product.price,
          department: product.department,
          subcategory: product.subcategory,
          cartSnapshot: snapshot(next),
        },
        product.id
      );
      return { ok: true };
    },
    []
  );

  const removeItem = useCallback((variantKey: string) => {
    const item = itemsRef.current.find((i) => i.variantKey === variantKey);
    const next = itemsRef.current.filter((i) => i.variantKey !== variantKey);
    setItems(next);
    if (item) {
      trackEvent(
        "cart_remove",
        { colorName: item.colorName, size: item.size, quantity: item.quantity, price: item.price, cartSnapshot: snapshot(next) },
        item.productId
      );
    }
  }, []);

  const setQuantity = useCallback(
    (variantKey: string, quantity: number) => {
      const item = itemsRef.current.find((i) => i.variantKey === variantKey);
      if (!item) return;
      if (quantity <= 0) {
        removeItem(variantKey);
        return;
      }
      const clamped = Math.min(quantity, item.maxStock, MAX_PER_LINE);
      if (clamped === item.quantity) return;
      const next = itemsRef.current.map((i) => (i.variantKey === variantKey ? { ...i, quantity: clamped } : i));
      setItems(next);
      trackEvent(
        "cart_quantity_change",
        { colorName: item.colorName, size: item.size, from: item.quantity, to: clamped, price: item.price, cartSnapshot: snapshot(next) },
        item.productId
      );
    },
    [removeItem]
  );

  const clearCart = useCallback(() => setItems([]), []);
  const dismissNotice = useCallback((index: number) => setNotices((n) => n.filter((_, i) => i !== index)), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      hydrated,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
      isOpen,
      notices,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      dismissNotice,
    }),
    [items, hydrated, isOpen, notices, addItem, removeItem, setQuantity, clearCart, dismissNotice]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
