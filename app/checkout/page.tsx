"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import ProductImage from "@/components/ProductImage";
import { getSessionId, trackEvent } from "@/lib/telemetryClient";
import {
  EXPRESS_DELIVERY_FEE,
  FREE_DELIVERY_THRESHOLD,
  INDIAN_STATES,
  INR_PER_POINT,
  MEMBER_PROMO_PERCENT,
  STANDARD_DELIVERY_FEE,
  formatINR,
} from "@/lib/catalogConfig";
import type { DeliveryMethod } from "@/types/store";

interface FormState {
  name: string;
  email: string;
  phone: string;
  street: string;
  locality: string;
  city: string;
  state: string;
  pinCode: string;
}

const EMPTY: FormState = { name: "", email: "", phone: "", street: "", locality: "", city: "", state: "", pinCode: "" };

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, hydrated, clearCart } = useCart();
  const { user, loading: authLoading, refresh } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [delivery, setDelivery] = useState<DeliveryMethod>("standard");
  const [applyMember, setApplyMember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const tracked = useRef(false);
  const prefilled = useRef(false);

  // Auto-fill from the signed-in H&M Member
  useEffect(() => {
    if (!user || prefilled.current) return;
    prefilled.current = true;
    setForm((f) => ({
      name: f.name || user.name,
      email: f.email || user.email,
      phone: f.phone || user.phone,
      street: f.street || user.shippingAddress.street,
      locality: f.locality || user.shippingAddress.locality,
      city: f.city || user.shippingAddress.city,
      state: f.state || user.shippingAddress.state,
      pinCode: f.pinCode || user.shippingAddress.pinCode,
    }));
  }, [user]);

  useEffect(() => {
    if (hydrated && items.length > 0 && !tracked.current) {
      tracked.current = true;
      trackEvent("checkout_started", {
        itemCount: items.reduce((s, i) => s + i.quantity, 0),
        subtotal,
        signedIn: Boolean(user),
        cartSnapshot: items.map((i) => ({ productId: i.productId, colorName: i.colorName, size: i.size, quantity: i.quantity, price: i.price })),
      });
    }
  }, [hydrated, items, subtotal, user]);

  const isMember = Boolean(user);
  const memberDiscount = isMember && applyMember ? Math.round((subtotal * MEMBER_PROMO_PERCENT) / 100) : 0;
  const afterDiscount = subtotal - memberDiscount;
  const freeStandard = afterDiscount >= FREE_DELIVERY_THRESHOLD || user?.tier === "Member Plus";
  const deliveryFee = delivery === "express" ? EXPRESS_DELIVERY_FEE : freeStandard ? 0 : STANDARD_DELIVERY_FEE;
  const total = afterDiscount + deliveryFee;
  const points = isMember ? Math.floor(total / INR_PER_POINT) : 0;

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [k]: undefined }));
  };

  function validate(): boolean {
    const fe: Partial<Record<keyof FormState, string>> = {};
    if (form.name.trim().length < 2) fe.name = "Enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) fe.email = "Enter a valid email";
    if (form.phone.replace(/\D/g, "").length < 10) fe.phone = "Enter a 10-digit mobile number";
    if (!form.street.trim()) fe.street = "Enter your house / street address";
    if (!form.city.trim()) fe.city = "Enter your city";
    if (!form.state) fe.state = "Select your state";
    if (!/^[1-9][0-9]{5}$/.test(form.pinCode)) fe.pinCode = "Enter a valid 6-digit PIN code";
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, colorName: i.colorName, size: i.size, quantity: i.quantity })),
          customer: { name: form.name, email: form.email, phone: form.phone },
          shippingAddress: { street: form.street, locality: form.locality, city: form.city, state: form.state, pinCode: form.pinCode },
          deliveryMethod: delivery,
          applyMemberDiscount: isMember && applyMember,
          sessionId: getSessionId(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not place your order.");
        setSubmitting(false);
        return;
      }
      clearCart();
      await refresh();
      router.push(`/orders/${data.order.id}?placed=1`);
    } catch {
      setError("Network error – please try again.");
      setSubmitting(false);
    }
  }

  if (!hydrated) return <div className="mx-auto max-w-5xl px-4 py-20 text-center text-sm text-neutral-500">Loading your bag…</div>;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Your shopping bag is empty</h1>
        <p className="mt-2 text-sm text-neutral-600">Add a few favourites to check out.</p>
        <Link href="/shop" className="mt-6 inline-block bg-black px-8 py-3 text-xs font-semibold uppercase tracking-wider text-white">Continue shopping</Link>
      </div>
    );
  }

  const input = (k: keyof FormState, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-xs">
      <span className="font-semibold">{label}</span>
      <input value={form[k]} onChange={set(k)} className={`mt-1 w-full border px-3 py-2.5 text-sm outline-none focus:border-black ${fieldErrors[k] ? "border-[#E50010]" : "border-neutral-300"}`} {...props} />
      {fieldErrors[k] && <span className="mt-1 block text-[#E50010]">{fieldErrors[k]}</span>}
    </label>
  );

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      {!user && !authLoading && (
        <p className="mt-2 text-sm text-neutral-600">
          <Link href="/login?next=/checkout" className="font-semibold underline">Sign in</Link> to auto-fill your details, get {MEMBER_PROMO_PERCENT}% member promo and earn points.
        </p>
      )}

      <form onSubmit={placeOrder} className="mt-6 grid gap-10 lg:grid-cols-[1fr_400px]" noValidate>
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider">My information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{input("name", "Full name", { autoComplete: "name" })}</div>
              {input("email", "Email", { type: "email", autoComplete: "email" })}
              {input("phone", "Mobile number", { type: "tel", autoComplete: "tel", placeholder: "+91 98765 43210" })}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider">Shipping address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{input("street", "Flat / House no., Building, Street", { autoComplete: "address-line1" })}</div>
              <div className="sm:col-span-2">{input("locality", "Locality / Area (optional)", { autoComplete: "address-line2" })}</div>
              {input("city", "City", { autoComplete: "address-level2" })}
              <label className="block text-xs">
                <span className="font-semibold">State</span>
                <select value={form.state} onChange={set("state")} className={`mt-1 w-full border bg-white px-3 py-2.5 text-sm ${fieldErrors.state ? "border-[#E50010]" : "border-neutral-300"}`}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {fieldErrors.state && <span className="mt-1 block text-[#E50010]">{fieldErrors.state}</span>}
              </label>
              {input("pinCode", "PIN code", { inputMode: "numeric", maxLength: 6, autoComplete: "postal-code" })}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider">Delivery</h2>
            <div className="space-y-2">
              {([
                ["standard", "Standard Delivery", "2–5 working days across India", freeStandard ? "Free" : formatINR(STANDARD_DELIVERY_FEE)],
                ["express", "Express Delivery", "1–2 working days (metro cities)", formatINR(EXPRESS_DELIVERY_FEE)],
              ] as const).map(([value, label, eta, price]) => (
                <label key={value} className={`flex cursor-pointer items-center justify-between border px-4 py-3 text-sm ${delivery === value ? "border-black" : "border-neutral-300"}`}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="delivery" checked={delivery === value} onChange={() => setDelivery(value)} className="accent-black" />
                    <span><span className="font-semibold">{label}</span><span className="block text-xs text-neutral-600">{eta}</span></span>
                  </span>
                  <span className="font-semibold">{price}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider">Payment</h2>
            <div className="border border-neutral-300 bg-[#faf9f8] p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold"><Lock size={14} /> Simulated Instant Payment</p>
              <p className="mt-1 text-xs text-neutral-600">This demo store never asks for card or UPI details. Your order is confirmed instantly.</p>
            </div>
          </section>
        </div>

        {/* Summary */}
        <aside className="h-fit border border-neutral-200 p-5 lg:sticky lg:top-36">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Order summary</h2>
          <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto">
            {items.map((i) => (
              <li key={i.variantKey} className="flex gap-3 text-xs">
                <div className="w-14 shrink-0"><ProductImage src={i.imageUrl} alt={i.title} colorHex={i.colorHex} /></div>
                <div className="flex-1">
                  <p className="font-semibold">{i.title}</p>
                  <p className="text-neutral-600">{i.colorName} · {i.size} · Qty {i.quantity}</p>
                </div>
                <p className="font-semibold">{formatINR(i.price * i.quantity)}</p>
              </li>
            ))}
          </ul>

          {isMember && (
            <label className="mt-4 flex cursor-pointer items-center gap-2 border-t border-neutral-200 pt-4 text-sm">
              <input type="checkbox" checked={applyMember} onChange={(e) => setApplyMember(e.target.checked)} className="accent-black" />
              Apply H&amp;M Member promo ({MEMBER_PROMO_PERCENT}% off)
            </label>
          )}

          <dl className="mt-4 space-y-1.5 border-t border-neutral-200 pt-4 text-sm">
            <div className="flex justify-between"><dt>Order value</dt><dd>{formatINR(subtotal)}</dd></div>
            {memberDiscount > 0 && <div className="flex justify-between text-[#E50010]"><dt>Member discount</dt><dd>−{formatINR(memberDiscount)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{deliveryFee === 0 ? "Free" : formatINR(deliveryFee)}</dd></div>
            <div className="flex justify-between border-t border-neutral-200 pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatINR(total)}</dd></div>
            <p className="text-[11px] text-neutral-500">Inclusive of GST</p>
            {isMember && <p className="pt-1 text-xs text-emerald-700">You’ll earn {points} H&amp;M Member points</p>}
          </dl>

          {error && <p className="mt-4 bg-[#fff1f1] p-3 text-xs text-[#b0000c]">{error}</p>}

          <button type="submit" disabled={submitting} className="mt-5 w-full bg-black py-4 text-xs font-semibold uppercase tracking-wider text-white hover:bg-neutral-800 disabled:opacity-50">
            {submitting ? "Processing…" : `Complete Order (Simulated Instant Payment — ${formatINR(total)})`}
          </button>
        </aside>
      </form>
    </div>
  );
}
