import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { addRecyclingSubmission, logEvent, newId, saveUser } from "@/lib/db";
import { MEMBER_PLUS_THRESHOLD } from "@/lib/catalogConfig";
import type { GarmentRecyclingSubmission } from "@/types/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POINTS = 50;
const VOUCHER_PERCENT = 15;

/** POST /api/sustainability/recycle { bagCount, garmentTypes[], estimatedWeightKg, dropOffStore, sessionId? } */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in as an H&M Member to log a Garment Collecting drop-off." }, { status: 401 });
  let body: { bagCount?: number; garmentTypes?: string[]; estimatedWeightKg?: number; dropOffStore?: string; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const bagCount = Math.max(1, Math.min(5, Math.floor(Number(body.bagCount ?? 1)) || 1));
  const garmentTypes = Array.isArray(body.garmentTypes) ? body.garmentTypes.slice(0, 10).map(String) : [];
  const estimatedWeightKg = Math.max(0.5, Math.min(25, Number(body.estimatedWeightKg ?? 2) || 2));
  const dropOffStore = (body.dropOffStore ?? "").trim() || "Any H&M store in India";

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const submission: GarmentRecyclingSubmission = {
    id: newId("rcy"),
    userId: user.id,
    bagCount,
    garmentTypes,
    estimatedWeightKg,
    dropOffStore,
    voucherCode: `HMRECYCLE15-${randomBytes(3).toString("hex").toUpperCase()}`,
    voucherPercent: VOUCHER_PERCENT,
    voucherValidUntil: validUntil.toISOString(),
    pointsAwarded: POINTS,
    createdAt: new Date().toISOString(),
  };

  user.memberPoints += POINTS;
  if (user.memberPoints >= MEMBER_PLUS_THRESHOLD) user.tier = "Member Plus";

  await addRecyclingSubmission(submission);
  await saveUser(user);
  await logEvent({
    eventType: "recycling_pledge",
    userId: user.id,
    sessionId: body.sessionId ?? null,
    payload: { bagCount, estimatedWeightKg, garmentTypes, dropOffStore },
  });

  return NextResponse.json({ submission, memberPoints: user.memberPoints, tier: user.tier }, { status: 201 });
}
