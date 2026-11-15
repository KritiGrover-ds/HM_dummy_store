import { NextRequest, NextResponse } from "next/server";
import { queryProducts, type ProductQuery } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SORTS = new Set(["newest", "price_asc", "price_desc", "bestsellers"]);

function num(v: string | null): number | undefined {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * GET /api/products
 *   ?department=ladies|men|kids|baby|home|sport
 *   &subcategory=Dresses &isSale=true &isNewArrival=true &size=M &color=Black
 *   &minPrice=499 &maxPrice=2999 &inStockOnly=true &search=linen
 *   &sort=newest|price_asc|price_desc|bestsellers &limit=24 &page=1 &ids=prd_001,prd_002
 * → { products, totalCount, page, limit, facets }
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const sort = sp.get("sort") ?? "newest";
  const query: ProductQuery = {
    department: sp.get("department") || undefined,
    subcategory: sp.get("subcategory") || undefined,
    isSale: sp.get("isSale") === "true",
    isNewArrival: sp.get("isNewArrival") === "true",
    size: sp.get("size") || undefined,
    color: sp.get("color") || undefined,
    minPrice: num(sp.get("minPrice")),
    maxPrice: num(sp.get("maxPrice")),
    inStockOnly: sp.get("inStockOnly") === "true",
    search: sp.get("search") || sp.get("q") || undefined,
    sort: (SORTS.has(sort) ? sort : "newest") as ProductQuery["sort"],
    limit: num(sp.get("limit")),
    page: num(sp.get("page")),
    ids: sp.get("ids") ? sp.get("ids")!.split(",").filter(Boolean) : undefined,
  };
  try {
    const result = await queryProducts(query);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[products]", err);
    return NextResponse.json({ error: "Redis unavailable – start redis-server and retry." }, { status: 503 });
  }
}
