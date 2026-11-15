import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { getUserByEmail, logEvent, stitchSessionToUser, toPublicUser } from "@/lib/db";
import { DEMO_MEMBER_EMAIL, ensureDemoMember } from "@/lib/seedData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/auth/login { email, password, sessionId? } – auto-provisions the demo member. */
export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) return NextResponse.json({ error: "Please enter your email and password." }, { status: 400 });

  let user = await getUserByEmail(email);
  if (!user && email === DEMO_MEMBER_EMAIL) user = await ensureDemoMember();
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  await setSessionCookie(user.id);
  const stitched = await stitchSessionToUser(body.sessionId, user.id);
  await logEvent({ eventType: "login", userId: user.id, sessionId: body.sessionId ?? null, payload: { stitched } });
  return NextResponse.json({ user: await toPublicUser(user) });
}
