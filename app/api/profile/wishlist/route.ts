import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProductById, logEvent, toggleWishlist } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/profile/wishlist { productId, sessionId? } → toggles membership of the Redis Set */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in to save Favourites." }, { status: 401 });
  let body: { productId?: string; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });
  const product = await getProductById(body.productId);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const result = await toggleWishlist(user.id, product.id);
  await logEvent({
    eventType: "wishlist_toggle",
    userId: user.id,
    sessionId: body.sessionId ?? null,
    productId: product.id,
    payload: { saved: result.saved, department: product.department, subcategory: product.subcategory, price: product.price },
  });
  return NextResponse.json(result);
}
