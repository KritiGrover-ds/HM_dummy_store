import { NextRequest, NextResponse } from "next/server";
import { deductVariantStockAtomic, restoreVariantStock, type StockDeductionLine } from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth";
import { getProductsByIds, getStockSnapshot, logEvent, newId, saveOrder, saveUser } from "@/lib/db";
import { broadcastInventoryEvent } from "@/lib/inventoryEmitter";
import {
  EXPRESS_DELIVERY_FEE,
  FREE_DELIVERY_THRESHOLD,
  INR_PER_POINT,
  MEMBER_PLUS_THRESHOLD,
  MEMBER_PROMO_PERCENT,
  STANDARD_DELIVERY_FEE,
} from "@/lib/catalogConfig";
import type { DeliveryMethod, Order, OrderItem, ShippingAddress } from "@/types/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface OrderRequestBody {
  items: { productId: string; colorName: string; size: string; quantity: number }[];
  customer: { name: string; email: string; phone: string };
  shippingAddress: ShippingAddress;
  deliveryMethod: DeliveryMethod;
  applyMemberDiscount?: boolean;
  sessionId?: string | null;
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++; // no Sunday deliveries
  }
  return d;
}

/** POST /api/orders – simulated instant payment with atomic Redis Lua stock deduction. */
export async function POST(request: NextRequest) {
  let body: OrderRequestBody;
  try {
    body = (await request.json()) as OrderRequestBody;
  } catch {
    return bad("Invalid JSON body");
  }

  // ── Validate input ──
  if (!Array.isArray(body.items) || body.items.length === 0) return bad("Your shopping bag is empty.");
  if (body.items.length > 50) return bad("Too many items in one order.");
  const c = body.customer ?? ({} as OrderRequestBody["customer"]);
  const a = body.shippingAddress ?? ({} as ShippingAddress);
  if (!c.name?.trim()) return bad("Please enter your full name.");
  if (!/^\S+@\S+\.\S+$/.test(c.email ?? "")) return bad("Please enter a valid email address.");
  if ((c.phone ?? "").replace(/\D/g, "").length < 10) return bad("Please enter a valid 10-digit mobile number.");
  if (!a.street?.trim() || !a.city?.trim() || !a.state?.trim()) return bad("Please complete your shipping address.");
  if (!/^[1-9][0-9]{5}$/.test(a.pinCode ?? "")) return bad("Please enter a valid 6-digit PIN code.");
  const deliveryMethod: DeliveryMethod = body.deliveryMethod === "express" ? "express" : "standard";

  const user = await getCurrentUser();

  // ── Resolve products & server-side prices ──
  const productIds = Array.from(new Set(body.items.map((i) => i.productId)));
  const products = await getProductsByIds(productIds);
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines: StockDeductionLine[] = [];
  const orderItems: OrderItem[] = [];
  for (const item of body.items) {
    const product = byId.get(item.productId);
    if (!product) return bad(`A product in your bag is no longer available (${item.productId}).`, 404);
    const variant = product.variants.find((v) => v.colorName === item.colorName);
    if (!variant || !variant.sizes.some((s) => s.size === item.size)) {
      return bad(`${product.title} is not available in ${item.colorName} / ${item.size}.`, 404);
    }
    const quantity = Math.floor(Number(item.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 10) return bad(`Invalid quantity for ${product.title}.`);
    lines.push({ productId: product.id, colorName: item.colorName, size: item.size, quantity });
    orderItems.push({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      articleNumber: product.articleNumber,
      colorName: item.colorName,
      size: item.size,
      quantity,
      unitPrice: product.price,
      lineTotal: product.price * quantity,
      imageUrl: variant.imageUrl,
    });
  }

  // ── Atomic stock deduction (all-or-nothing inside Redis) ──
  const deduction = await deductVariantStockAtomic(lines);
  if (!deduction.ok) {
    const f = deduction.failedLine;
    const product = byId.get(f.productId)!;
    const remaining = Math.max(0, deduction.remaining);
    return NextResponse.json(
      {
        error:
          remaining === 0
            ? `Sorry, ${product.title} in ${f.colorName} / ${f.size} just sold out.`
            : `Only ${remaining} left of ${product.title} in ${f.colorName} / ${f.size} (you requested ${f.quantity}).`,
        item: {
          productId: f.productId,
          title: product.title,
          colorName: f.colorName,
          size: f.size,
          requested: f.quantity,
          remaining,
        },
      },
      { status: 409 }
    );
  }

  // ── Pricing ──
  const subtotal = orderItems.reduce((s, i) => s + i.lineTotal, 0);
  const memberDiscount = user && body.applyMemberDiscount ? Math.round((subtotal * MEMBER_PROMO_PERCENT) / 100) : 0;
  const afterDiscount = subtotal - memberDiscount;
  const freeStandard = afterDiscount >= FREE_DELIVERY_THRESHOLD || user?.tier === "Member Plus";
  const deliveryFee = deliveryMethod === "express" ? EXPRESS_DELIVERY_FEE : freeStandard ? 0 : STANDARD_DELIVERY_FEE;
  const total = afterDiscount + deliveryFee;
  const gstIncluded = Math.round((afterDiscount * 12) / 112);
  const pointsEarned = user ? Math.floor(total / INR_PER_POINT) : 0;

  const now = new Date();
  const eta = addBusinessDays(now, deliveryMethod === "express" ? 2 : 5);

  let tierAfterOrder: Order["tierAfterOrder"] = null;
  if (user) {
    user.memberPoints += pointsEarned;
    if (user.memberPoints >= MEMBER_PLUS_THRESHOLD) user.tier = "Member Plus";
    tierAfterOrder = user.tier;
  }

  const order: Order = {
    id: newId("ord").toUpperCase(),
    userId: user?.id ?? null,
    sessionId: body.sessionId ?? null,
    customer: { name: c.name.trim(), email: c.email.trim().toLowerCase(), phone: c.phone.trim() },
    shippingAddress: {
      street: a.street.trim(),
      locality: (a.locality ?? "").trim(),
      city: a.city.trim(),
      state: a.state.trim(),
      pinCode: a.pinCode.trim(),
    },
    items: orderItems,
    deliveryMethod,
    subtotal,
    memberDiscount,
    deliveryFee,
    gstIncluded,
    total,
    pointsEarned,
    tierAfterOrder,
    status: "confirmed",
    paymentMethod: "Simulated Instant Payment",
    estimatedDelivery: eta.toISOString(),
    createdAt: now.toISOString(),
  };

  try {
    await saveOrder(order);
    if (user) await saveUser(user);
  } catch (err) {
    console.error("[orders] persistence failed – restoring stock", err);
    await restoreVariantStock(lines);
    return bad("We could not place your order. Please try again.", 500);
  }

  // ── Silent telemetry ──
  await logEvent({
    eventType: "purchase_completed",
    userId: user?.id ?? null,
    sessionId: body.sessionId ?? null,
    payload: {
      orderId: order.id,
      total,
      itemCount: orderItems.reduce((s, i) => s + i.quantity, 0),
      deliveryMethod,
      memberDiscount,
      items: orderItems.map((i) => ({ productId: i.productId, colorName: i.colorName, size: i.size, quantity: i.quantity, unitPrice: i.unitPrice })),
    },
    path: "/checkout",
  });

  // ── Real-time stock broadcast to every open tab ──
  for (const productId of productIds) {
    const snap = await getStockSnapshot(productId);
    if (snap) await broadcastInventoryEvent({ type: "STOCK_UPDATE", ...snap });
  }

  return NextResponse.json({ ok: true, order, memberPoints: user?.memberPoints ?? null, tier: user?.tier ?? null }, { status: 201 });
}
