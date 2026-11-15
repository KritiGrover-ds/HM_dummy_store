import { NextRequest, NextResponse } from "next/server";
import { getProductBySlug, queryProducts } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/products/{slug} → { product, similar } with live stock from hm:stock:{productId}. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const { products: sameSub } = await queryProducts({ department: product.department, sort: "bestsellers" });
    const similar = sameSub
      .filter((p) => p.id !== product.id)
      .sort((a, b) => Number(b.subcategory === product.subcategory) - Number(a.subcategory === product.subcategory))
      .slice(0, 8);
    return NextResponse.json({ product, similar }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[product]", err);
    return NextResponse.json({ error: "Redis unavailable" }, { status: 503 });
  }
}
