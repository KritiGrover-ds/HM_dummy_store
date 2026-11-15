import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, queryProducts } from "@/lib/db";
import ProductDetail from "./ProductDetail";
import RedisOffline from "@/components/RedisOffline";
import type { Product } from "@/types/store";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    return { title: product ? `${product.title} | LINEA India` : "Product not found | LINEA India" };
  } catch {
    return { title: "LINEA India" };
  }
}

export default async function ProductPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { slug } = await params;
  const sp = await searchParams;
  const color = Array.isArray(sp.color) ? sp.color[0] : sp.color;

  let product: Product | null = null;
  let similar: Product[] = [];
  try {
    product = await getProductBySlug(slug);
    if (product) {
      const { products } = await queryProducts({ department: product.department, sort: "bestsellers" });
      similar = products
        .filter((p) => p.id !== product!.id)
        .sort((a, b) => Number(b.subcategory === product!.subcategory) - Number(a.subcategory === product!.subcategory))
        .slice(0, 8);
    }
  } catch {
    return <RedisOffline />;
  }
  if (!product) notFound();

  return <ProductDetail key={product.id} initialProduct={product} similar={similar} initialColor={color ?? null} />;
}
