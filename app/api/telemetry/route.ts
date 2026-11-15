import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ALLOWED_CLIENT_EVENTS, logEvent } from "@/lib/db";
import type { CustomerEventType } from "@/types/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/telemetry { eventType, sessionId, productId?, payload?, path? }
 * Silent ingestion into Redis Stream hm:telemetry:stream + List hm:telemetry:events
 * + hm:user:{userId}:metrics. Always answers 204 so the UI is never affected.
 */
export async function POST(request: NextRequest) {
  try {
    const text = await request.text();
    if (!text || text.length > 32_000) return new NextResponse(null, { status: 204 });
    const body = JSON.parse(text) as {
      eventType?: string;
      sessionId?: string;
      productId?: string;
      payload?: Record<string, unknown>;
      path?: string;
    };
    if (!body.eventType || !ALLOWED_CLIENT_EVENTS.includes(body.eventType as CustomerEventType)) {
      return new NextResponse(null, { status: 204 });
    }
    const user = await getCurrentUser();
    await logEvent({
      eventType: body.eventType as CustomerEventType,
      userId: user?.id ?? null,
      sessionId: typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : null,
      productId: typeof body.productId === "string" ? body.productId.slice(0, 64) : undefined,
      payload: body.payload && typeof body.payload === "object" ? body.payload : {},
      path: typeof body.path === "string" ? body.path.slice(0, 300) : undefined,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? undefined,
    });
  } catch {
    /* telemetry is best-effort and silent */
  }
  return new NextResponse(null, { status: 204 });
}
