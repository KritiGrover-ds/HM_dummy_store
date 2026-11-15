"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Leaf, Recycle, Shirt } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getSessionId } from "@/lib/telemetryClient";
import HeroImage from "@/components/HeroImage";
import type { GarmentRecyclingSubmission } from "@/types/store";

const GARMENTS = ["T-shirts & tops", "Jeans & trousers", "Dresses", "Knitwear", "Jackets", "Kidswear", "Home textiles", "Socks & underwear"];
const STORES = [
  "H&M Select Citywalk, New Delhi",
  "H&M Phoenix Palladium, Mumbai",
  "H&M Orion Mall, Bengaluru",
  "H&M Express Avenue, Chennai",
  "H&M Inorbit Mall, Hyderabad",
  "H&M South City Mall, Kolkata",
  "H&M Phoenix Marketcity, Pune",
];

export default function SustainabilityPage() {
  const { user, refresh } = useAuth();
  const [bags, setBags] = useState(1);
  const [weight, setWeight] = useState("2");
  const [types, setTypes] = useState<string[]>(["T-shirts & tops"]);
  const [store, setStore] = useState(STORES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GarmentRecyclingSubmission | null>(null);

  const toggleType = (t: string) => setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sustainability/recycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bagCount: bags, estimatedWeightKg: Number(weight), garmentTypes: types, dropOffStore: store, sessionId: getSessionId() }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Could not log your drop-off");
      else {
        setResult(data.submission);
        await refresh();
      }
    } catch {
      setError("Network error – please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <section className="group relative h-[52vh] min-h-[360px] overflow-hidden bg-[#9caf88]">
        <HeroImage src="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1800&q=85" fallback="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=85" alt="Garment collecting" />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1200px] px-6 pb-10 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.25em]">Let’s close the loop</p>
          <h1 className="mt-2 max-w-2xl text-4xl font-semibold md:text-5xl">H&amp;M Garment Collecting &amp; Conscious Choice</h1>
          <p className="mt-3 max-w-xl">Bring any unwanted clothes or textiles, any brand, any condition, to an H&amp;M store — and get rewarded.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-6 px-4 py-12 md:grid-cols-3">
        {[
          { icon: <Shirt />, title: "1. Bag it", text: "Collect clothes and home textiles you no longer use — any brand, any condition." },
          { icon: <Recycle />, title: "2. Drop it off", text: "Hand the bag in at the cash desk of any H&M store in India." },
          { icon: <Leaf />, title: "3. Get rewarded", text: "Log it here to earn +50 H&M Member points and a 15% off voucher." },
        ].map((s) => (
          <div key={s.title} className="bg-[#faf9f8] p-6">
            <span className="text-emerald-700">{s.icon}</span>
            <p className="mt-3 font-semibold">{s.title}</p>
            <p className="mt-1 text-sm text-neutral-600">{s.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-[1200px] px-4">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">Log your drop-off</h2>
            {!user ? (
              <div className="mt-4 bg-[#faf9f8] p-6 text-sm">
                <p>Sign in as an H&amp;M Member to log your Garment Collecting bag and collect your reward.</p>
                <Link href="/login?next=/sustainability" className="mt-4 inline-block bg-black px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white">Sign in</Link>
              </div>
            ) : result ? (
              <div className="mt-4 border border-emerald-600 p-6">
                <p className="flex items-center gap-2 text-lg font-semibold text-emerald-800"><CheckCircle2 /> Thank you for recycling!</p>
                <p className="mt-2 text-sm">You earned <span className="font-semibold">+{result.pointsAwarded} points</span>. Your new balance is <span className="font-semibold">{user.memberPoints} pts</span>.</p>
                <div className="mt-4 border border-dashed border-black p-4 text-center">
                  <p className="text-3xl font-semibold">{result.voucherPercent}% OFF</p>
                  <p className="mt-1 font-mono text-sm">{result.voucherCode}</p>
                  <p className="text-xs text-neutral-600">Valid until {new Date(result.voucherValidUntil).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => setResult(null)} className="border border-black px-5 py-2.5 text-xs font-semibold uppercase">Log another bag</button>
                  <Link href="/profile?tab=rewards" className="bg-black px-5 py-2.5 text-xs font-semibold uppercase text-white">My vouchers</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-5 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-xs">
                    <span className="font-semibold">Number of bags</span>
                    <select value={bags} onChange={(e) => setBags(Number(e.target.value))} className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm">
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs">
                    <span className="font-semibold">Estimated weight (kg)</span>
                    <input value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="mt-1 w-full border border-neutral-300 px-3 py-2.5 text-sm" />
                  </label>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold">What’s in the bag?</p>
                  <div className="flex flex-wrap gap-2">
                    {GARMENTS.map((g) => (
                      <button type="button" key={g} onClick={() => toggleType(g)} className={`border px-3 py-1.5 text-xs ${types.includes(g) ? "border-black bg-black text-white" : "border-neutral-300"}`}>{g}</button>
                    ))}
                  </div>
                </div>
                <label className="block text-xs">
                  <span className="font-semibold">Drop-off store</span>
                  <select value={store} onChange={(e) => setStore(e.target.value)} className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm">
                    {STORES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
                {error && <p className="bg-[#fff1f1] p-3 text-xs text-[#b0000c]">{error}</p>}
                <button disabled={busy} className="w-full bg-black py-3.5 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-50">
                  {busy ? "Logging…" : "Log my bag · earn +50 pts & 15% off"}
                </button>
              </form>
            )}
          </div>

          <div className="bg-[#f1f5ee] p-8">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-800"><Leaf size={16} /> Conscious choice</p>
            <h3 className="mt-2 text-xl font-semibold">Look for the green tag</h3>
            <p className="mt-2 text-sm text-neutral-700">
              Conscious choice products contain at least 50% more sustainably sourced materials — like organic cotton, linen, TENCEL™ lyocell
              or recycled polyester. Some products contain 100%.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>• Organic cotton grown without synthetic pesticides</li>
              <li>• Recycled polyester made from PET bottles</li>
              <li>• Linen that needs less water than conventional cotton</li>
            </ul>
            <Link href="/shop?search=linen" className="mt-6 inline-block border border-black px-6 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-black hover:text-white">
              Shop the Linen Edit
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
