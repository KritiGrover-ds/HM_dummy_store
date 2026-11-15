import "server-only";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getUserById } from "./db";
import type { User } from "@/types/store";

export { hashPassword, verifyPassword } from "./password";

// ─────────────────────────────────────────────────────────────────────────────
// Zero-dependency, Windows-safe auth using only Node's built-in `crypto`.
//   • Passwords: scrypt (N=16384, r=8, p=1) with a 16-byte random salt
//   • Sessions:  HMAC-SHA256 signed token in HTTP-only cookie `hm_session`
// ─────────────────────────────────────────────────────────────────────────────

export const SESSION_COOKIE = "hm_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
// AUTH_SECRET if set; otherwise derived from the (private) REDIS_URL so a hosted
// deployment never falls back to the public default secret.
const SECRET =
  process.env.AUTH_SECRET ||
  (process.env.REDIS_URL
    ? createHash("sha256").update(`linea-session:${process.env.REDIS_URL}`).digest("hex")
    : "linea-dev-secret-change-me-in-production");

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

interface SessionPayload {
  uid: string;
  iat: number;
  exp: number;
}

export function createSessionToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { uid: userId, iat: now, exp: now + SESSION_TTL_SECONDS };
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.uid || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

/** Sets the signed session cookie (call from a Route Handler). */
export async function setSessionCookie(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(userId), sessionCookieOptions);
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}

/** Reads `hm_session`, verifies the HMAC and loads hm:user:{userId} from Redis. */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const payload = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  try {
    return await getUserById(payload.uid);
  } catch (err) {
    console.error("[auth] getCurrentUser failed:", (err as Error).message);
    return null;
  }
}
