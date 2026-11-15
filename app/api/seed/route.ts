import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seedData";
import { broadcastInventoryEvent } from "@/lib/inventoryEmitter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/seed – resets & re-seeds the 65-item catalog + demo member, then notifies all tabs. */
export async function POST() {
  try {
    const result = await seedDatabase();
    await broadcastInventoryEvent({ type: "SEED_RESET", at: result.seededAt });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[seed]", err);
    return NextResponse.json(
      { ok: false, error: "Could not seed Redis. Is redis-server running on " + (process.env.REDIS_URL || "redis://127.0.0.1:6379") + "?" },
      { status: 500 }
    );
  }
}
