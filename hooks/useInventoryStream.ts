"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { InventoryEvent, Product, ProductVariant } from "@/types/store";

// ─────────────────────────────────────────────────────────────────────────────
// One shared EventSource per tab → /api/inventory/stream
// Live stock is kept in a tiny external store so any component can read the
// freshest colour/size stock without page refreshes.
// ─────────────────────────────────────────────────────────────────────────────

type LiveStock = { variants: ProductVariant[]; totalStock: number };
type Listener = () => void;
type EventListener = (event: InventoryEvent) => void;

const liveStock = new Map<string, LiveStock>();
const storeListeners = new Set<Listener>();
const eventListeners = new Set<EventListener>();
let version = 0;
let source: EventSource | null = null;
let refCount = 0;

function emitStore() {
  version++;
  storeListeners.forEach((l) => l());
}

function handle(event: InventoryEvent) {
  if (event.type === "STOCK_UPDATE") {
    liveStock.set(event.productId, { variants: event.variants, totalStock: event.totalStock });
  } else if (event.type === "SEED_RESET") {
    liveStock.clear();
  }
  emitStore();
  eventListeners.forEach((l) => l(event));
}

function connect() {
  if (source || typeof window === "undefined" || !("EventSource" in window)) return;
  source = new EventSource("/api/inventory/stream");
  const onMessage = (e: MessageEvent) => {
    try {
      handle(JSON.parse(e.data) as InventoryEvent);
    } catch {
      /* ignore malformed frames */
    }
  };
  source.addEventListener("STOCK_UPDATE", onMessage as unknown as globalThis.EventListener);
  source.addEventListener("SEED_RESET", onMessage as unknown as globalThis.EventListener);
  source.onmessage = onMessage;
  // EventSource reconnects automatically (server sends retry: 3000)
}

function disconnect() {
  if (source) {
    source.close();
    source = null;
  }
}

function subscribeStore(listener: Listener) {
  storeListeners.add(listener);
  return () => storeListeners.delete(listener);
}

/**
 * Subscribe to the real-time inventory stream. Optional callback receives every
 * STOCK_UPDATE / SEED_RESET event.
 */
export function useInventoryStream(onEvent?: EventListener): void {
  useEffect(() => {
    refCount++;
    connect();
    if (onEvent) eventListeners.add(onEvent);
    return () => {
      if (onEvent) eventListeners.delete(onEvent);
      refCount--;
      if (refCount <= 0) {
        refCount = 0;
        // keep the connection briefly in case another component mounts right away
        setTimeout(() => refCount === 0 && disconnect(), 2000);
      }
    };
  }, [onEvent]);
}

/** Returns the product with the freshest live stock overlaid. */
export function useLiveProduct<T extends Product | null | undefined>(product: T): T {
  useInventoryStream();
  const v = useSyncExternalStore(subscribeStore, () => version, () => 0);
  return useMemo(() => {
    if (!product) return product;
    const live = liveStock.get(product.id);
    if (!live) return product;
    return { ...product, variants: mergeVariants(product.variants, live.variants), totalStock: live.totalStock };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, v]);
}

function mergeVariants(base: ProductVariant[], live: ProductVariant[]): ProductVariant[] {
  return base.map((bv) => {
    const lv = live.find((x) => x.colorName === bv.colorName);
    return lv ? { ...bv, sizes: lv.sizes } : bv;
  });
}

/** Read the latest known stock for one colour/size (null when no live update has arrived). */
export function getLiveSizeStock(productId: string, colorName: string, size: string): number | null {
  const live = liveStock.get(productId);
  if (!live) return null;
  const s = live.variants.find((v) => v.colorName === colorName)?.sizes.find((x) => x.size === size);
  return s ? s.stock : null;
}
