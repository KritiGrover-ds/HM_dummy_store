import { NextRequest, NextResponse } from "next/server";
import { subscribeNewsletter } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/newsletter { email } – stores subscriber in Redis Set hm:newsletter:subscribers */
export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const isNew = await subscribeNewsletter(email);
    return NextResponse.json({ ok: true, alreadySubscribed: !isNew });
  } catch {
    return NextResponse.json({ error: "Subscription failed. Please try again." }, { status: 500 });
  }
}
