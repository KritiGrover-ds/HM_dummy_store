import { ensureInventoryBridge, hmInventoryEmitter, INVENTORY_EVENT } from "@/lib/inventoryEmitter";
import type { InventoryEvent } from "@/types/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/inventory/stream – Server-Sent Events: STOCK_UPDATE & SEED_RESET, 15 s heartbeat. */
export async function GET(request: Request) {
  ensureInventoryBridge();
  const encoder = new TextEncoder();
  let cleanup: () => void = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      const onEvent = (event: InventoryEvent) => {
        send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      };
      hmInventoryEmitter.on(INVENTORY_EVENT, onEvent);

      const heartbeat = setInterval(() => send(`: heartbeat ${Date.now()}\n\n`), 15000);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        hmInventoryEmitter.off(INVENTORY_EVENT, onEvent);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener("abort", cleanup);
      send(`retry: 3000\n: connected\n\n`);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
