"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, LogOut, Package, Recycle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ProductImage from "@/components/ProductImage";
import WishlistGrid from "@/components/WishlistGrid";
import { DEPARTMENT_LABELS, INDIAN_STATES, MEMBER_PLUS_THRESHOLD, formatINR } from "@/lib/catalogConfig";
import type { GarmentRecyclingSubmission, Order, PublicUser } from "@/types/store";
import type { ProfileTab } from "./page";

const TAB_LABELS: { id: ProfileTab; label: string }[] = [
  { id: "profile", label: "My profile, sizes & address" },
  { id: "orders", label: "My purchases & receipts" },
  { id: "favourites", label: "My favourites" },
  { id: "rewards", label: "LINEA Club rewards & vouchers" },
];

export default function ProfileClient({ initialTab }: { initialTab: ProfileTab }) {
  const router = useRouter();
  const { user, loading, logout, setUser } = useAuth();
  const [tab, setTab] = useState<ProfileTab>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [recycling, setRecycling] = useState<GarmentRecyclingSubmission[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/profile");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.orders ?? []);
        setRecycling(d.recycling ?? []);
      })
      .finally(() => setDataLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.memberPoints]);

  const switchTab = (t: ProfileTab) => {
    setTab(t);
    window.history.replaceState(null, "", `/profile?tab=${t}`);
  };

  if (loading || !user) return <div className="py-24 text-center text-sm text-neutral-500">Loading your account…</div>;

  const progress = Math.min(100, (user.memberPoints / MEMBER_PLUS_THRESHOLD) * 100);
  const toGo = Math.max(0, MEMBER_PLUS_THRESHOLD - user.memberPoints);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hi, {user.name.split(" ")[0]}</h1>
        <button onClick={logout} className="flex items-center gap-1.5 text-sm underline"><LogOut size={14} /> Sign out</button>
      </div>

      {/* Digital LINEA Member card */}
      <div className="mt-6 grid gap-6 md:grid-cols-[380px_1fr]">
        <div className={`relative overflow-hidden rounded-xl p-6 text-white shadow-md ${user.tier === "Member Plus" ? "bg-gradient-to-br from-neutral-900 to-neutral-700" : "bg-gradient-to-br from-[#2f5a40] to-[#1f3d2b]"}`}>
          <div className="flex items-start justify-between">
            <span className="text-2xl font-light uppercase tracking-[0.35em]">LINEA</span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">{user.tier}</span>
          </div>
          <p className="mt-8 text-lg font-semibold">{user.name}</p>
          <p className="font-mono text-xs tracking-widest opacity-90">{user.memberId}</p>
          <div className="mt-6 flex items-end justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider opacity-80">Points balance</p>
              <p className="text-3xl font-semibold">{user.memberPoints}</p>
            </div>
            <p className="text-right text-[11px] opacity-80">Member since<br />{new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
          </div>
        </div>
        <div className="flex flex-col justify-center bg-[#faf9f8] p-6">
          {user.tier === "Member Plus" ? (
            <>
              <p className="text-lg font-semibold">You’re a Member Plus 🎉</p>
              <p className="mt-1 text-sm text-neutral-600">Enjoy free standard delivery on every order, early access to sales and exclusive events.</p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold">{toGo} points to Member Plus</p>
              <p className="mt-1 text-sm text-neutral-600">Earn 1 point for every ₹50 you spend and +50 points for every Garment Collecting drop-off.</p>
            </>
          )}
          <div className="mt-4 h-2 w-full bg-neutral-200">
            <div className="h-2 bg-[#E50010] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-neutral-500">
            <span>0</span><span>{MEMBER_PLUS_THRESHOLD} pts · Member Plus</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="no-scrollbar mt-10 flex gap-6 overflow-x-auto border-b border-neutral-200 text-sm">
        {TAB_LABELS.map((t) => (
          <button key={t.id} onClick={() => switchTab(t.id)} className={`shrink-0 border-b-2 pb-3 ${tab === t.id ? "border-black font-semibold" : "border-transparent text-neutral-600 hover:text-black"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "profile" && <ProfileForm user={user} onSaved={setUser} />}
        {tab === "orders" && <OrdersTab orders={orders} loading={dataLoading} />}
        {tab === "favourites" && <WishlistGrid />}
        {tab === "rewards" && <RewardsTab user={user} recycling={recycling} orders={orders} />}
      </div>
    </div>
  );
}

function ProfileForm({ user, onSaved }: { user: PublicUser; onSaved: (u: PublicUser) => void }) {
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone,
    preferredDepartment: user.preferredDepartment,
    top: user.savedSizes.top,
    bottom: user.savedSizes.bottom,
    shoe: user.savedSizes.shoe,
    chestCm: user.savedSizes.chestCm?.toString() ?? "",
    waistCm: user.savedSizes.waistCm?.toString() ?? "",
    hipCm: user.savedSizes.hipCm?.toString() ?? "",
    street: user.shippingAddress.street,
    locality: user.shippingAddress.locality,
    city: user.shippingAddress.city,
    state: user.shippingAddress.state,
    pinCode: user.shippingAddress.pinCode,
  });
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          preferredDepartment: form.preferredDepartment,
          savedSizes: { top: form.top, bottom: form.bottom, shoe: form.shoe, chestCm: form.chestCm, waistCm: form.waistCm, hipCm: form.hipCm },
          shippingAddress: { street: form.street, locality: form.locality, city: form.city, state: form.state, pinCode: form.pinCode },
        }),
      });
      const data = await res.json();
      if (!res.ok) setStatus({ ok: false, msg: data.error ?? "Could not save" });
      else {
        onSaved(data.user);
        setStatus({ ok: true, msg: "Your details have been saved." });
      }
    } catch {
      setStatus({ ok: false, msg: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  const field = (k: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-xs">
      <span className="font-semibold">{label}</span>
      <input value={form[k]} onChange={set(k)} className="mt-1 w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-black" {...props} />
    </label>
  );
  const select = (k: keyof typeof form, label: string, options: string[]) => (
    <label className="block text-xs">
      <span className="font-semibold">{label}</span>
      <select value={form[k]} onChange={set(k)} className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm">
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );

  return (
    <form onSubmit={save} className="grid gap-10 lg:grid-cols-3">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider">Personal details</h2>
        {field("name", "Full name")}
        <label className="block text-xs">
          <span className="font-semibold">Email</span>
          <input value={user.email} disabled className="mt-1 w-full border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500" />
        </label>
        {field("phone", "Mobile number", { type: "tel" })}
        <label className="block text-xs">
          <span className="font-semibold">Preferred department</span>
          <select value={form.preferredDepartment} onChange={set("preferredDepartment")} className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm">
            <option value="">No preference</option>
            {Object.entries(DEPARTMENT_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider">Saved sizes</h2>
        <div className="grid grid-cols-3 gap-3">
          {select("top", "Tops", ["XS", "S", "M", "L", "XL"])}
          {select("bottom", "Bottoms", ["28", "30", "32", "34"])}
          {select("shoe", "Shoes", ["UK 3", "UK 4", "UK 5", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"])}
        </div>
        <p className="text-xs text-neutral-600">Body measurements (cm) — used by the Size Guide to recommend your size.</p>
        <div className="grid grid-cols-3 gap-3">
          {field("chestCm", "Chest", { inputMode: "numeric" })}
          {field("waistCm", "Waist", { inputMode: "numeric" })}
          {field("hipCm", "Hip", { inputMode: "numeric" })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider">Shipping address</h2>
        {field("street", "Flat / House no., Building, Street")}
        {field("locality", "Locality / Area")}
        <div className="grid grid-cols-2 gap-3">
          {field("city", "City")}
          {field("pinCode", "PIN code", { inputMode: "numeric", maxLength: 6 })}
        </div>
        {select("state", "State", INDIAN_STATES)}
      </section>

      <div className="lg:col-span-3">
        {status && <p className={`mb-3 text-sm ${status.ok ? "text-emerald-700" : "text-[#E50010]"}`}>{status.msg}</p>}
        <button disabled={saving} className="bg-black px-10 py-3.5 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function OrdersTab({ orders, loading }: { orders: Order[]; loading: boolean }) {
  if (loading) return <p className="text-sm text-neutral-500">Loading your purchases…</p>;
  if (orders.length === 0) {
    return (
      <div className="py-14 text-center">
        <Package size={36} strokeWidth={1} className="mx-auto" />
        <p className="mt-3 text-sm">You haven’t placed any orders yet.</p>
        <Link href="/shop" className="mt-5 inline-block bg-black px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white">Start shopping</Link>
      </div>
    );
  }
  return (
    <ul className="space-y-6">
      {orders.map((o) => (
        <li key={o.id} className="border border-neutral-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-semibold">Order {o.id}</p>
              <p className="text-xs text-neutral-600">
                {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {o.items.reduce((s, i) => s + i.quantity, 0)} items ·{" "}
                <span className="capitalize">{o.status}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold">{formatINR(o.total)}</span>
              {o.pointsEarned > 0 && <span className="text-xs text-emerald-700">+{o.pointsEarned} pts</span>}
              <Link href={`/orders/${o.id}`} className="border border-black px-4 py-2 text-xs font-semibold uppercase">View receipt</Link>
            </div>
          </div>
          <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto">
            {o.items.map((i) => (
              <Link key={`${i.productId}-${i.colorName}-${i.size}`} href={`/products/${i.slug}?color=${encodeURIComponent(i.colorName)}`} className="w-20 shrink-0">
                <ProductImage src={i.imageUrl} alt={i.title} />
                <p className="mt-1 truncate text-[11px]">{i.title}</p>
                <p className="text-[11px] text-neutral-500">{i.colorName} · {i.size}</p>
              </Link>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function RewardsTab({ user, recycling, orders }: { user: PublicUser; recycling: GarmentRecyclingSubmission[]; orders: Order[] }) {
  const earnedFromOrders = orders.reduce((s, o) => s + o.pointsEarned, 0);
  const earnedFromRecycling = recycling.reduce((s, r) => s + r.pointsAwarded, 0);
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider">LINEA Club rewards</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Balance" value={`${user.memberPoints} pts`} />
          <Stat label="From purchases" value={`${earnedFromOrders} pts`} />
          <Stat label="From recycling" value={`${earnedFromRecycling} pts`} />
        </div>
        <ul className="mt-6 space-y-3 text-sm">
          <Perk icon={<Gift size={18} />} title="10% member promo" text="Apply at checkout on any order." />
          <Perk icon={<Package size={18} />} title="Free delivery" text={user.tier === "Member Plus" ? "On every order as Member Plus." : "On orders above ₹1,999."} />
          <Perk icon={<Recycle size={18} />} title="Garment Collecting" text="+50 points and a 15% voucher for every bag you recycle." />
        </ul>
      </section>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Garment Collecting vouchers</h2>
          <Link href="/sustainability" className="text-xs underline">Recycle a bag</Link>
        </div>
        {recycling.length === 0 ? (
          <p className="bg-[#faf9f8] p-5 text-sm text-neutral-600">No vouchers yet. Drop off a bag of old clothes at any LINEA store and log it on the <Link href="/sustainability" className="underline">Sustainability page</Link>.</p>
        ) : (
          <ul className="space-y-3">
            {recycling.map((r) => {
              const expired = new Date(r.voucherValidUntil) < new Date();
              return (
                <li key={r.id} className={`flex items-center justify-between border border-dashed p-4 ${expired ? "border-neutral-300 opacity-60" : "border-emerald-600"}`}>
                  <div>
                    <p className="text-lg font-semibold">{r.voucherPercent}% off</p>
                    <p className="font-mono text-xs">{r.voucherCode}</p>
                    <p className="text-[11px] text-neutral-600">
                      {r.bagCount} bag{r.bagCount > 1 ? "s" : ""} · {r.estimatedWeightKg} kg · {r.dropOffStore}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-semibold text-emerald-700">+{r.pointsAwarded} pts</p>
                    <p className="text-neutral-600">{expired ? "Expired" : "Valid until"} {new Date(r.voucherValidUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#faf9f8] p-4">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-neutral-500">{label}</p>
    </div>
  );
}

function Perk({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5">{icon}</span>
      <span><span className="font-semibold">{title}</span><span className="block text-neutral-600">{text}</span></span>
    </li>
  );
}
