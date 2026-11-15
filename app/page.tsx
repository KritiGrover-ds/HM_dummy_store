import Link from "next/link";
import { queryProducts } from "@/lib/db";
import { unsplash } from "@/lib/seedData";
import ProductRail from "@/components/ProductRail";
import ProductGrid from "@/components/ProductGrid";
import ProductImage from "@/components/ProductImage";
import RedisOffline from "@/components/RedisOffline";
import HeroImage from "@/components/HeroImage";
import type { Product } from "@/types/store";

export const dynamic = "force-dynamic";

const HEROES = [
  {
    title: "The Dress & Linen Edit",
    subtitle: "Breezy silhouettes for every Indian summer day — starting at ₹799",
    cta: "Shop Ladies",
    href: "/shop?department=ladies&subcategory=Dresses",
    image: unsplash("1515372039744-b8f02a3ae446", 1800),
    fallback: unsplash("1496747611176-843222e1e57c", 1800),
    tone: "#d8c3a5",
  },
  {
    title: "New Season Menswear & Baggy Denim",
    subtitle: "Relaxed linen shirts, loose-fit tees and the baggy jeans everyone wants",
    cta: "Shop Men",
    href: "/shop?department=men",
    image: unsplash("1617137968427-85924c800a22", 1400),
    fallback: unsplash("1602810318383-e386cc2a3ccf", 1400),
    tone: "#4f6d8f",
  },
  {
    title: "Kids Festive & Everyday Essentials",
    subtitle: "Party-ready sparkle and soft cotton sets for 2–14 years",
    cta: "Shop Kids",
    href: "/shop?department=kids",
    image: unsplash("1519238263530-99bdd11df2ea", 1400),
    fallback: unsplash("1503944583220-79d8926ad5e2", 1400),
    tone: "#f4c6cf",
  },
];

const TILES = [
  { label: "Dresses", href: "/shop?subcategory=Dresses", image: unsplash("1595777457583-95e059d581b8", 600) },
  { label: "Tops & Tees", href: "/shop?subcategory=Tops%20%26%20T-shirts", image: unsplash("1521572163474-6864f9cf17ab", 600) },
  { label: "Linen Edit", href: "/shop?search=linen", image: unsplash("1596755094514-f87e34085b2c", 600) },
  { label: "Shirts", href: "/shop?subcategory=Shirts%20%26%20Blouses", image: unsplash("1602810318383-e386cc2a3ccf", 600) },
  { label: "Hoodies", href: "/shop?subcategory=Hoodies%20%26%20Sweatshirts", image: unsplash("1556821840-3a63f95609a7", 600) },
  { label: "Denim", href: "/shop?subcategory=Jeans%20%26%20Trousers", image: unsplash("1541099649105-f69ad21f3246", 600) },
  { label: "LINEA HOME", href: "/shop?department=home", image: unsplash("1584100936595-c0654b55a2e2", 600) },
];

export default async function HomePage() {
  let newArrivals: Product[] = [];
  let trending: Product[] = [];
  let bestsellers: Product[] = [];
  try {
    const [n, t, b] = await Promise.all([
      queryProducts({ isNewArrival: true, sort: "newest", limit: 12 }),
      queryProducts({ department: "ladies", sort: "bestsellers", limit: 40 }),
      queryProducts({ sort: "bestsellers", limit: 8 }),
    ]);
    newArrivals = n.products;
    trending = t.products.filter((p) => ["Dresses", "Tops & T-shirts", "Shirts & Blouses"].includes(p.subcategory)).slice(0, 10);
    bestsellers = b.products;
  } catch {
    return <RedisOffline />;
  }

  const [main, ...secondary] = HEROES;

  return (
    <div>
      {/* Hero 1 – full bleed */}
      <section className="relative">
        <Link href={main.href} className="group relative block h-[72vh] min-h-[460px] overflow-hidden" style={{ backgroundColor: main.tone }}>
          <HeroImage src={main.image} fallback={main.fallback} alt={main.title} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1440px] px-6 pb-12 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.25em]">New in · LINEA India</p>
            <h1 className="mt-2 max-w-2xl text-4xl font-semibold leading-tight md:text-6xl">{main.title}</h1>
            <p className="mt-3 max-w-xl text-base md:text-lg">{main.subtitle}</p>
            <span className="mt-6 inline-block bg-white px-7 py-3 text-xs font-semibold uppercase tracking-wider text-black group-hover:bg-neutral-100">{main.cta}</span>
          </div>
        </Link>
      </section>

      {/* Category tiles */}
      <section className="mx-auto max-w-[1440px] px-4 py-10">
        <div className="no-scrollbar flex gap-3 overflow-x-auto md:grid md:grid-cols-7">
          {TILES.map((t) => (
            <Link key={t.label} href={t.href} className="group w-32 shrink-0 md:w-auto">
              <ProductImage src={t.image} alt={t.label} placeholderLabel={t.label} className="transition group-hover:opacity-90" />
              <p className="mt-2 text-center text-[13px] font-semibold group-hover:underline">{t.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <ProductRail title="New Arrivals" href="/shop?isNewArrival=true" products={newArrivals} />

      {/* Two secondary campaign heroes */}
      <section className="mx-auto grid max-w-[1440px] gap-4 px-4 py-6 md:grid-cols-2">
        {secondary.map((h) => (
          <Link key={h.title} href={h.href} className="group relative block h-[560px] overflow-hidden" style={{ backgroundColor: h.tone }}>
            <HeroImage src={h.image} fallback={h.fallback} alt={h.title} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-0 p-8 text-white">
              <h2 className="text-3xl font-semibold leading-tight">{h.title}</h2>
              <p className="mt-2 max-w-md text-sm">{h.subtitle}</p>
              <span className="mt-5 inline-block border border-white px-6 py-2.5 text-xs font-semibold uppercase tracking-wider group-hover:bg-white group-hover:text-black">{h.cta}</span>
            </div>
          </Link>
        ))}
      </section>

      <ProductRail title="Trending Dresses & Tops" href="/shop?department=ladies&sort=bestsellers" products={trending} />

      {/* Member banner */}
      <section className="mx-auto max-w-[1440px] px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 bg-[#f4f1ec] px-8 py-10 text-center md:flex-row md:text-left">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#E50010]">LINEA Member</p>
            <h2 className="mt-1 text-2xl font-semibold">Earn 1 point for every ₹50 — reach 800 pts for Member Plus</h2>
            <p className="mt-1 text-sm text-neutral-600">Free delivery above ₹1,999, 10% member promo and +50 pts for every bag of clothes you recycle.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/register" className="bg-black px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white">Join now</Link>
            <Link href="/sustainability" className="border border-black px-6 py-3 text-xs font-semibold uppercase tracking-wider">Recycle &amp; earn</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-10">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-xl font-semibold md:text-2xl">Bestsellers</h2>
          <Link href="/shop?sort=bestsellers" className="text-sm underline underline-offset-4">View all</Link>
        </div>
        <ProductGrid products={bestsellers} />
      </section>
    </div>
  );
}
