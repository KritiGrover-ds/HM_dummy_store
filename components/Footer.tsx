"use client";

import Link from "next/link";
import { useState } from "react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) setStatus({ ok: false, msg: data.error });
      else {
        setStatus({ ok: true, msg: data.alreadySubscribed ? "You’re already subscribed – thank you!" : "Thanks! You’ll get 10% off your next order by email." });
        setEmail("");
      }
    } catch {
      setStatus({ ok: false, msg: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  const cols: { title: string; links: [string, string][] }[] = [
    { title: "Shop", links: [["Ladies", "/shop?department=ladies"], ["Men", "/shop?department=men"], ["Kids", "/shop?department=kids"], ["Baby", "/shop?department=baby"], ["H&M HOME", "/shop?department=home"], ["Sport", "/shop?department=sport"], ["Sale", "/shop?isSale=true"]] },
    { title: "Corporate Info", links: [["Sustainability", "/sustainability"], ["Garment Collecting", "/sustainability"], ["Conscious Choice", "/shop?search=conscious"]] },
    { title: "Help", links: [["My account", "/profile"], ["My orders", "/profile?tab=orders"], ["Favourites", "/favourites"], ["Delivery & Returns", "/shop"]] },
  ];

  return (
    <footer className="mt-20 bg-[#faf9f8] text-[13px]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-14 md:grid-cols-4">
        {cols.map((c) => (
          <div key={c.title}>
            <p className="mb-3 font-semibold">{c.title}</p>
            <ul className="space-y-2 text-neutral-700">
              {c.links.map(([label, href]) => (
                <li key={label}><Link href={href} className="hover:underline">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="mb-2 font-semibold">Become a member</p>
          <p className="mb-3 text-neutral-700">Join for free and get 10% off your next purchase plus member-only offers.</p>
          <form onSubmit={subscribe} className="flex">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full border border-neutral-400 bg-white px-3 py-2 outline-none focus:border-black"
            />
            <button disabled={busy} className="bg-black px-4 text-xs font-semibold uppercase text-white disabled:opacity-50">Sign up</button>
          </form>
          {status && <p className={`mt-2 text-xs ${status.ok ? "text-emerald-700" : "text-[#E50010]"}`}>{status.msg}</p>}
        </div>
      </div>
      <div className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-2 px-4 py-6 text-center text-[11px] text-neutral-500">
          <span className="font-serif text-2xl font-bold italic text-[#E50010]">H&amp;M</span>
          <p>India | ₹ INR · Educational demo clone built with Next.js &amp; Redis. Not affiliated with H &amp; M Hennes &amp; Mauritz AB.</p>
          <p>The content of this site is for demonstration only. Prices include GST.</p>
        </div>
      </div>
    </footer>
  );
}
