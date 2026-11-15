"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import WishlistGrid from "@/components/WishlistGrid";

export default function FavouritesPage() {
  const { user, loading } = useAuth();
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10">
      <h1 className="text-2xl font-semibold">Favourites</h1>
      {loading ? (
        <p className="mt-6 text-sm text-neutral-500">Loading…</p>
      ) : !user ? (
        <div className="mt-8 max-w-md">
          <p className="text-sm">Sign in to save your favourite items and access them on any device.</p>
          <Link href="/login?next=/favourites" className="mt-4 inline-block bg-black px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white">Sign in</Link>
        </div>
      ) : (
        <div className="mt-6"><WishlistGrid /></div>
      )}
    </div>
  );
}
