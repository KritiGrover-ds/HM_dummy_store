import ShopClient, { type ShopFilters } from "./ShopClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Shop all | LINEA India" };

type SP = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const initial: ShopFilters = {
    department: one(sp.department),
    subcategory: one(sp.subcategory),
    size: one(sp.size),
    color: one(sp.color),
    minPrice: one(sp.minPrice),
    maxPrice: one(sp.maxPrice),
    isSale: one(sp.isSale) === "true",
    isNewArrival: one(sp.isNewArrival) === "true",
    inStockOnly: one(sp.inStockOnly) === "true",
    search: one(sp.search),
    sort: one(sp.sort) || "newest",
  };
  return <ShopClient key={JSON.stringify(initial)} initial={initial} />;
}
