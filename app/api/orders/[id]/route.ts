import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/orders/{id} – receipt. Member orders are only visible to their owner. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.userId) {
    const user = await getCurrentUser();
    if (!user || user.id !== order.userId) {
      return NextResponse.json({ error: "Please sign in to view this order." }, { status: 403 });
    }
  }
  return NextResponse.json({ order });
}
