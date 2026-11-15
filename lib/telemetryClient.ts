"use client";

import type { CustomerEventType } from "@/types/store";

// Silent, non-blocking behavioural telemetry. Nothing is ever shown in the UI.

const SESSION_KEY = "hm_session_id";

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `sid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Persistent anonymous shopper session id (localStorage `hm_session_id`). */
export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = generateId();
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Fire-and-forget POST /api/telemetry. Never throws, never awaits in the caller. */
export function trackEvent(
  eventType: CustomerEventType,
  payload: Record<string, unknown> = {},
  productId?: string
): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      eventType,
      sessionId: getSessionId(),
      productId,
      payload,
      path: window.location.pathname + window.location.search,
    });
    // sendBeacon survives page unloads (needed for product_dwell_time)
    if (navigator.sendBeacon && eventType === "product_dwell_time") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/telemetry", blob)) return;
    }
    void fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  } catch {
    /* silent */
  }
}
