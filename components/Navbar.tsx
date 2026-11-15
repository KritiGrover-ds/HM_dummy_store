"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, Menu, RefreshCw, Search, ShoppingBag, User, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { DEPARTMENT_LABELS, DEPARTMENT_SUBCATEGORIES } from "@/lib/catalogConfig";
import type { Department } from "@/types/store";
import SearchModal from "./SearchModal";

const NAV: { label: string; href: string; dept?: Department; accent?: boolean }[] = [
  { label: "Ladies", href: "/shop?department=ladies", dept: "ladies" },
  { label: "Men", href: "/shop?department=men", dept: "men" },
  { label: "Kids", href: "/shop?department=kids", dept: "kids" },
  { label: "Baby", href: "/shop?department=baby", dept: "baby" },
  { label: "H&M HOME", href: "/shop?department=home", dept: "home" },
  { label: "Sport", href: "/shop?department=sport", dept: "sport" },
  { label: "Sale", href: "/shop?isSale=true", accent: true },
  { label: "Sustainability", href: "/sustainability" },
];

export default function Navbar() {
  const { user, wishlist, loading } = useAuth();
  const { itemCount, openCart, hydrated } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [openDept, setOpenDept] = useState<Department | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  useEffect(() => {
    setOpenDept(null);
    setMobileOpen(false);
  }, [pathname]);

  async function reseed() {
    if (seeding) return;
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      setSeedMsg(res.ok ? `Inventory reset – ${data.products} products restocked` : data.error ?? "Seeding failed");
      if (res.ok) router.refresh();
    } catch {
      setSeedMsg("Could not reach the server");
    } finally {
      setSeeding(false);
      setTimeout(() => setSeedMsg(null), 4000);
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white">
      {/* Utility bar */}
      <div className="bg-[#faf9f8] text-[11px] text-neutral-700">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-1 px-4 py-1.5 sm:flex-row">
          <p className="text-center">
            Free shipping for H&amp;M Members on orders above ₹1,999 <span className="mx-1 text-neutral-400">|</span>
            <span className="font-semibold text-[#E50010]">Flat 25% Off Selected Styles</span>
            <span className="mx-1 text-neutral-400">|</span> Estimated delivery: 2–5 days across India
          </p>
          <div className="flex items-center gap-3">
            {seedMsg && <span className="text-neutral-600">{seedMsg}</span>}
            <button onClick={reseed} disabled={seeding} className="flex items-center gap-1 underline-offset-2 hover:underline disabled:opacity-50">
              <RefreshCw size={12} className={seeding ? "animate-spin" : ""} />
              Reset / Re-seed 60+ Demo Inventory
            </button>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="relative border-b border-neutral-200" onMouseLeave={() => setOpenDept(null)}>
        <div className="mx-auto grid max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-4 pt-3">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
              {mobileOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
            </button>
            <div className="hidden gap-4 text-[12px] text-neutral-700 lg:flex">
              <Link href="/shop" className="hover:underline">Shop all</Link>
              <Link href="/shop?isNewArrival=true" className="hover:underline">New Arrivals</Link>
            </div>
          </div>

          <Link href="/" aria-label="H&M India home" className="select-none text-center">
            <span className="font-serif text-[40px] font-bold italic leading-none tracking-tighter text-[#E50010]">H&amp;M</span>
          </Link>

          <div className="flex items-center justify-end gap-4 text-[12px]">
            <Link href={user ? "/profile" : "/login"} className="flex items-center gap-1.5 hover:underline">
              <User size={20} strokeWidth={1.5} />
              <span className="hidden md:inline">
                {loading ? "…" : user ? `${user.name.split(" ")[0]} · ${user.memberPoints} pts` : "Sign in"}
              </span>
            </Link>
            <Link href="/favourites" className="relative flex items-center gap-1.5 hover:underline" aria-label="Favourites">
              <Heart size={20} strokeWidth={1.5} />
              <span className="hidden md:inline">Favourites</span>
              {wishlist.length > 0 && (
                <span className="absolute -right-2 -top-1.5 rounded-full bg-black px-1.5 text-[10px] text-white md:static md:bg-transparent md:p-0 md:text-[12px] md:text-black">
                  ({wishlist.length})
                </span>
              )}
            </Link>
            <button onClick={() => setSearchOpen(true)} className="flex items-center gap-1.5 hover:underline" aria-label="Search">
              <Search size={20} strokeWidth={1.5} />
              <span className="hidden md:inline">Search</span>
            </button>
            <button onClick={openCart} className="relative flex items-center gap-1.5 hover:underline" aria-label="Shopping bag">
              <ShoppingBag size={20} strokeWidth={1.5} />
              <span className="hidden md:inline">Shopping bag</span>
              <span className="font-semibold">({hydrated ? itemCount : 0})</span>
            </button>
          </div>
        </div>

        {/* Department links */}
        <nav className="mx-auto hidden max-w-[1440px] justify-center gap-7 px-4 pb-3 pt-3 text-[13px] lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              onMouseEnter={() => setOpenDept(n.dept ?? null)}
              onClick={() => setOpenDept(null)}
              className={`border-b-2 pb-0.5 transition ${openDept && openDept === n.dept ? "border-black" : "border-transparent hover:border-black"} ${n.accent ? "font-semibold text-[#E50010]" : ""}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Mega-menu */}
        {openDept && (
          <div className="absolute inset-x-0 top-full hidden border-b border-neutral-200 bg-white shadow-sm lg:block">
            <div className="mx-auto grid max-w-[1100px] grid-cols-4 gap-8 px-6 py-8">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Shop by product</p>
                <ul className="space-y-2 text-[13px]">
                  <li><Link href={`/shop?department=${openDept}`} className="font-semibold hover:underline">View all {DEPARTMENT_LABELS[openDept]}</Link></li>
                  {DEPARTMENT_SUBCATEGORIES[openDept].map((s) => (
                    <li key={s}>
                      <Link href={`/shop?department=${openDept}&subcategory=${encodeURIComponent(s)}`} className="hover:underline">{s}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Highlights</p>
                <ul className="space-y-2 text-[13px]">
                  <li><Link href={`/shop?department=${openDept}&isNewArrival=true`} className="hover:underline">New Arrivals</Link></li>
                  <li><Link href={`/shop?department=${openDept}&sort=bestsellers`} className="hover:underline">Bestsellers</Link></li>
                  <li><Link href={`/shop?department=${openDept}&isSale=true`} className="text-[#E50010] hover:underline">Sale</Link></li>
                  <li><Link href="/sustainability" className="hover:underline">Conscious Choice</Link></li>
                </ul>
              </div>
              <div className="col-span-2 flex items-end bg-[#f4f1ec] p-6">
                <div>
                  <p className="font-serif text-2xl">{DEPARTMENT_LABELS[openDept]} — New Season</p>
                  <p className="mt-1 text-sm text-neutral-600">Fresh styles in linen, denim and soft cotton. Members get free delivery above ₹1,999.</p>
                  <Link href={`/shop?department=${openDept}&sort=newest`} className="mt-4 inline-block bg-black px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white">
                    Shop now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-neutral-200 bg-white px-4 py-4 lg:hidden">
            {NAV.map((n) => (
              <div key={n.label} className="border-b border-neutral-100 py-2">
                <Link href={n.href} className={`block text-sm font-semibold ${n.accent ? "text-[#E50010]" : ""}`}>{n.label}</Link>
                {n.dept && (
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {DEPARTMENT_SUBCATEGORIES[n.dept].map((s) => (
                      <Link key={s} href={`/shop?department=${n.dept}&subcategory=${encodeURIComponent(s)}`} className="text-xs text-neutral-600">{s}</Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
