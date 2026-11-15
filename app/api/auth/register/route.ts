import { NextRequest, NextResponse } from "next/server";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { createUser, logEvent, newId, stitchSessionToUser, toPublicUser } from "@/lib/db";
import type { User } from "@/types/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/auth/register { name, email, password, phone?, sessionId? } */
export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; password?: string; phone?: string; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (name.length < 2) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const id = newId("usr");
  const user: User = {
    id,
    memberId: `HM-IN-${new Date().getFullYear()}-${id.slice(-6).toUpperCase()}`,
    name,
    email,
    phone: (body.phone ?? "").trim(),
    passwordHash: hashPassword(password),
    tier: "Member",
    memberPoints: 50, // welcome bonus
    preferredDepartment: "",
    savedSizes: { top: "", bottom: "", shoe: "" },
    shippingAddress: { street: "", locality: "", city: "", state: "", pinCode: "" },
    createdAt: new Date().toISOString(),
  };

  try {
    await createUser(user);
  } catch (err) {
    if ((err as Error).message === "EMAIL_TAKEN") {
      return NextResponse.json({ error: "An account with this email already exists. Please sign in." }, { status: 409 });
    }
    console.error("[register]", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }

  await setSessionCookie(user.id);
  await stitchSessionToUser(body.sessionId, user.id);
  await logEvent({ eventType: "register", userId: user.id, sessionId: body.sessionId ?? null, payload: {} });
  return NextResponse.json({ user: await toPublicUser(user) }, { status: 201 });
}
