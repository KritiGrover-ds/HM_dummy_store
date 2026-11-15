import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRecyclingSubmissions, getUserOrders, saveUser, toPublicUser } from "@/lib/db";
import type { Department, SavedSizes, ShippingAddress } from "@/types/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEPTS: (Department | "")[] = ["", "ladies", "men", "kids", "baby", "home", "sport"];

/** GET /api/profile → { user, orders, recycling } */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const [publicUser, orders, recycling] = await Promise.all([
    toPublicUser(user),
    getUserOrders(user.id),
    getRecyclingSubmissions(user.id),
  ]);
  return NextResponse.json({ user: publicUser, orders, recycling });
}

/** PUT /api/profile { name?, phone?, savedSizes?, preferredDepartment?, shippingAddress? } */
export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  let body: {
    name?: string;
    phone?: string;
    savedSizes?: Partial<SavedSizes>;
    preferredDepartment?: Department | "";
    shippingAddress?: Partial<ShippingAddress>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.name === "string") {
    if (body.name.trim().length < 2) return NextResponse.json({ error: "Name is too short." }, { status: 400 });
    user.name = body.name.trim();
  }
  if (typeof body.phone === "string") {
    const digits = body.phone.replace(/\D/g, "");
    if (body.phone.trim() && digits.length < 10) return NextResponse.json({ error: "Please enter a valid 10-digit mobile number." }, { status: 400 });
    user.phone = body.phone.trim();
  }
  if (body.preferredDepartment !== undefined) {
    if (!DEPTS.includes(body.preferredDepartment)) return NextResponse.json({ error: "Unknown department." }, { status: 400 });
    user.preferredDepartment = body.preferredDepartment;
  }
  if (body.savedSizes) {
    const s = body.savedSizes;
    const toNum = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(v));
    user.savedSizes = {
      top: String(s.top ?? user.savedSizes.top ?? ""),
      bottom: String(s.bottom ?? user.savedSizes.bottom ?? ""),
      shoe: String(s.shoe ?? user.savedSizes.shoe ?? ""),
      chestCm: toNum(s.chestCm) ?? user.savedSizes.chestCm,
      waistCm: toNum(s.waistCm) ?? user.savedSizes.waistCm,
      hipCm: toNum(s.hipCm) ?? user.savedSizes.hipCm,
    };
  }
  if (body.shippingAddress) {
    const a = { ...user.shippingAddress, ...body.shippingAddress };
    if (a.pinCode && !/^[1-9][0-9]{5}$/.test(a.pinCode)) {
      return NextResponse.json({ error: "Please enter a valid 6-digit PIN code." }, { status: 400 });
    }
    user.shippingAddress = {
      street: (a.street ?? "").trim(),
      locality: (a.locality ?? "").trim(),
      city: (a.city ?? "").trim(),
      state: (a.state ?? "").trim(),
      pinCode: (a.pinCode ?? "").trim(),
    };
  }

  await saveUser(user);
  return NextResponse.json({ user: await toPublicUser(user) });
}
