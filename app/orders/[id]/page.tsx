import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getOrder } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ProductImage from "@/components/ProductImage";
import RedisOffline from "@/components/RedisOffline";
import { formatINR } from "@/lib/catalogConfig";
import type { Order, User } from "@/types/store";

export const dynamic = "force-dynamic";

export default async function OrderReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const justPlaced = sp.placed === "1";

  let order: Order | null = null;
  let user: User | null = null;
  try {
    [order, user] = await Promise.all([getOrder(id), getCurrentUser()]);
  } catch {
    return <RedisOffline />;
  }
  if (!order) notFound();

  if (order.userId && user?.id !== order.userId) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-semibold">Please sign in to view this order</h1>
        <Link href={`/login?next=/orders/${order.id}`} className="mt-6 inline-block bg-black px-8 py-3 text-xs font-semibold uppercase text-white">Sign in</Link>
      </div>
    );
  }

  const placed = new Date(order.createdAt);
  const eta = new Date(order.estimatedDelivery);
  const dateFmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const taxable = order.total - order.deliveryFee - order.gstIncluded;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {justPlaced && (
        <div className="mb-8 flex items-start gap-3 bg-emerald-50 p-5">
          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" />
          <div>
            <p className="font-semibold">Thank you, {order.customer.name.split(" ")[0]}! Your order is confirmed.</p>
            <p className="text-sm text-neutral-700">A confirmation has been sent to {order.customer.email}. Estimated delivery by {dateFmt(eta)}.</p>
            {order.pointsEarned > 0 && (
              <p className="mt-1 text-sm font-semibold text-emerald-800">
                +{order.pointsEarned} LINEA Member points earned{order.tierAfterOrder === "Member Plus" ? " · You’re a Member Plus!" : ""}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="border border-neutral-300">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-300 p-6">
          <div>
            <p className="text-2xl font-light uppercase tracking-[0.35em] text-black">LINEA</p>
            <p className="mt-1 text-xs text-neutral-600">LINEA Fashion Retail Pvt. Ltd. (demo)<br />GSTIN: 29AAECH0000X1Z5 (sample)</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-lg font-semibold">Tax Invoice</p>
            <p>Order no. <span className="font-mono">{order.id}</span></p>
            <p>Date: {dateFmt(placed)}</p>
            <p>Payment: {order.paymentMethod}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-neutral-300 p-6 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Billed & shipped to</p>
            <p className="font-semibold">{order.customer.name}</p>
            <p>{order.shippingAddress.street}</p>
            {order.shippingAddress.locality && <p>{order.shippingAddress.locality}</p>}
            <p>{order.shippingAddress.city}, {order.shippingAddress.state} – {order.shippingAddress.pinCode}</p>
            <p className="mt-1 text-neutral-600">{order.customer.phone} · {order.customer.email}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Delivery</p>
            <p className="font-semibold capitalize">{order.deliveryMethod} delivery</p>
            <p>Estimated by {dateFmt(eta)}</p>
            <p className="mt-1 inline-block bg-emerald-50 px-2 py-0.5 text-xs font-semibold capitalize text-emerald-800">{order.status}</p>
          </div>
        </section>

        <table className="w-full text-sm">
          <thead className="border-b border-neutral-300 text-left text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="p-4">Item</th>
              <th className="hidden p-4 sm:table-cell">Article no.</th>
              <th className="p-4 text-center">Qty</th>
              <th className="p-4 text-right">Price</th>
              <th className="p-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={`${i.productId}-${i.colorName}-${i.size}`} className="border-b border-neutral-200 align-top">
                <td className="p-4">
                  <div className="flex gap-3">
                    <Link href={`/products/${i.slug}?color=${encodeURIComponent(i.colorName)}`} className="w-14 shrink-0">
                      <ProductImage src={i.imageUrl} alt={i.title} />
                    </Link>
                    <div>
                      <Link href={`/products/${i.slug}`} className="font-semibold hover:underline">{i.title}</Link>
                      <p className="text-xs text-neutral-600">Colour: {i.colorName} · Size: {i.size}</p>
                      <p className="text-xs text-neutral-500 sm:hidden">Art. no. {i.articleNumber}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden p-4 font-mono text-xs sm:table-cell">{i.articleNumber}</td>
                <td className="p-4 text-center">{i.quantity}</td>
                <td className="p-4 text-right">{formatINR(i.unitPrice)}</td>
                <td className="p-4 text-right font-semibold">{formatINR(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end p-6">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between"><dt>Order value</dt><dd>{formatINR(order.subtotal)}</dd></div>
            {order.memberDiscount > 0 && <div className="flex justify-between text-[#E50010]"><dt>LINEA Member discount</dt><dd>−{formatINR(order.memberDiscount)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{order.deliveryFee === 0 ? "Free" : formatINR(order.deliveryFee)}</dd></div>
            <div className="flex justify-between text-xs text-neutral-600"><dt>Taxable value</dt><dd>{formatINR(taxable)}</dd></div>
            <div className="flex justify-between text-xs text-neutral-600"><dt>GST (12%) included</dt><dd>{formatINR(order.gstIncluded)}</dd></div>
            <div className="flex justify-between border-t border-neutral-300 pt-2 text-base font-semibold"><dt>Total paid</dt><dd>{formatINR(order.total)}</dd></div>
            {order.pointsEarned > 0 && <div className="flex justify-between text-emerald-700"><dt>Member points earned</dt><dd>+{order.pointsEarned} pts</dd></div>}
          </dl>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/shop" className="bg-black px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white">Continue shopping</Link>
        {order.userId && <Link href="/profile?tab=orders" className="border border-black px-6 py-3 text-xs font-semibold uppercase tracking-wider">My purchases</Link>}
      </div>
    </div>
  );
}
