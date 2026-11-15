import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Sorry, we can’t find that page</h1>
      <p className="mt-2 text-sm text-neutral-600">The product may have sold out or the link may be wrong.</p>
      <Link href="/shop" className="mt-6 inline-block bg-black px-8 py-3 text-xs font-semibold uppercase tracking-wider text-white">Continue shopping</Link>
    </div>
  );
}
