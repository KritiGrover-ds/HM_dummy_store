"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { PublicUser } from "@/types/store";
import { getSessionId, trackEvent } from "@/lib/telemetryClient";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  memberPoints: number;
  wishlist: string[];
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: PublicUser | null) => void;
  isFavourite: (productId: string) => boolean;
  toggleFavourite: (productId: string, meta?: Record<string, unknown>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await res.json()) as { user: PublicUser | null };
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, sessionId: getSessionId() }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Sign in failed" };
    setUser(data.user);
    return { ok: true };
  }, []);

  const register = useCallback(async (payload: { name: string; email: string; password: string; phone?: string }) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, sessionId: getSessionId() }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Registration failed" };
    setUser(data.user);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    router.push("/");
    router.refresh();
  }, [router]);

  const isFavourite = useCallback((productId: string) => Boolean(user?.wishlist.includes(productId)), [user]);

  const toggleFavourite = useCallback(
    async (productId: string, meta: Record<string, unknown> = {}) => {
      if (!user) {
        // Guests: remember intent silently and send them to sign in
        trackEvent("wishlist_toggle", { ...meta, saved: true, guest: true }, productId);
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const wasSaved = user.wishlist.includes(productId);
      // Optimistic update
      setUser({
        ...user,
        wishlist: wasSaved ? user.wishlist.filter((id) => id !== productId) : [...user.wishlist, productId],
      });
      try {
        const res = await fetch("/api/profile/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, sessionId: getSessionId() }),
        });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { wishlist: string[] };
        setUser((u) => (u ? { ...u, wishlist: data.wishlist } : u));
      } catch {
        setUser((u) => (u ? { ...u, wishlist: user.wishlist } : u));
      }
    },
    [user, router]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      memberPoints: user?.memberPoints ?? 0,
      wishlist: user?.wishlist ?? [],
      login,
      register,
      logout,
      refresh,
      setUser,
      isFavourite,
      toggleFavourite,
    }),
    [user, loading, login, register, logout, refresh, isFavourite, toggleFavourite]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
