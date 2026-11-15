import "server-only";
import { EventEmitter } from "events";
import { getRedis, getRedisSubscriber, keys } from "./redis";
import type { InventoryEvent } from "@/types/store";

// ─────────────────────────────────────────────────────────────────────────────
// Global inventory event bus
//
//   broadcastInventoryEvent()  ──PUBLISH──▶  Redis channel hm:inventory:channel
//                                                   │
//   every Next.js server process (SUBSCRIBE) ◀──────┘
//          │
//          ▼
//   globalThis.hmInventoryEmitter.emit("inventory", event)
//          │
//          ▼
//   /api/inventory/stream  ──SSE──▶  every open browser tab
//
// Using Redis Pub/Sub means multiple server instances (or `next dev` worker
// reloads) all receive every stock update.
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var hmInventoryEmitter: EventEmitter | undefined;
  // eslint-disable-next-line no-var
  var hmInventoryBridgeReady: boolean | undefined;
}

export const INVENTORY_EVENT = "inventory";

function getEmitter(): EventEmitter {
  if (!globalThis.hmInventoryEmitter) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(1000); // many concurrent SSE connections
    globalThis.hmInventoryEmitter = emitter;
  }
  return globalThis.hmInventoryEmitter;
}

export const hmInventoryEmitter = getEmitter();

/** Lazily subscribe this server process to the Redis inventory channel (once). */
export function ensureInventoryBridge(): void {
  if (globalThis.hmInventoryBridgeReady) return;
  globalThis.hmInventoryBridgeReady = true;

  const sub = getRedisSubscriber();
  sub
    .subscribe(keys.inventoryChannel)
    .catch((err) => {
      console.error("[inventory] Redis subscribe failed:", err.message);
      globalThis.hmInventoryBridgeReady = false;
    });

  sub.on("message", (channel, message) => {
    if (channel !== keys.inventoryChannel) return;
    try {
      const event = JSON.parse(message) as InventoryEvent;
      getEmitter().emit(INVENTORY_EVENT, event);
    } catch (err) {
      console.error("[inventory] bad pub/sub message", err);
    }
  });
}

/**
 * Broadcast a stock event to every SSE subscriber in every server process.
 * Falls back to an in-process emit if Redis PUBLISH fails.
 */
export async function broadcastInventoryEvent(event: InventoryEvent): Promise<void> {
  ensureInventoryBridge();
  try {
    const receivers = await getRedis().publish(keys.inventoryChannel, JSON.stringify(event));
    if (receivers === 0) {
      // Nobody subscribed yet (e.g. first request) – deliver locally.
      getEmitter().emit(INVENTORY_EVENT, event);
    }
  } catch (err) {
    console.error("[inventory] publish failed, emitting locally:", (err as Error).message);
    getEmitter().emit(INVENTORY_EVENT, event);
  }
}
