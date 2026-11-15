"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Heart, Leaf, Ruler, Star, Truck } from "lucide-react";
import type { Product } from "@/types/store";
import ProductImage from "@/components/ProductImage";
import ProductCard from "@/components/ProductCard";
import SizeGuideModal from "@/components/SizeGuideModal";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useInventoryStream, useLiveProduct } from "@/hooks/useInventoryStream";
import { trackEvent } from "@/lib/telemetryClient";
import { DEPARTMENT_LABELS, FREE_DELIVERY_THRESHOLD, formatINR } from "@/lib/catalogConfig";

export default function ProductDetail({
  initialProduct,
  similar,
  initialColor,
}: {
  initialProduct: Product;
  similar: Product[];
  initialColor: string | null;
}) {
  const [baseProduct, setBaseProduct] = useState(initialProduct);
  const product = useLiveProduct(baseProduct);
  const { user, isFavourite, toggleFavourite } = useAuth();
  const { addItem, items } = useCart();

  const startIndex = Math.max(0, product.variants.findIndex((v) => v.colorName === initialColor));
  const [variantIndex, setVariantIndex] = useState(startIndex);
  const [size, setSize] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>("description");
  const variant = product.variants[variantIndex] ?? product.variants[0];
  const selectedStock = size ? variant.sizes.find((s) => s.size === size)?.stock ?? 0 : null;
  const inBag = size ? items.find((i) => i.productId === product.id && i.colorName === variant.colorName && i.size === size)?.quantity ?? 0 : 0;
  const saved = isFavourite(product.id);
  const discount = product.isSale && product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

  // product_view on mount, product_dwell_time (seconds) on unmount
  const mountedAt = useRef(Date.now());
  useEffect(() => {
    mountedAt.current = Date.now();
    const meta = { department: product.department, subcategory: product.subcategory, price: product.price, colorName: variant.colorName };
    trackEvent("product_view", meta, product.id);
    const sendDwell = () => {
      const seconds = Math.round((Date.now() - mountedAt.current) / 1000);
      if (seconds > 0) trackEvent("product_dwell_time", { seconds, department: product.department, subcategory: product.subcategory }, product.id);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        sendDwell();
        mountedAt.current = Date.now();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      sendDwell();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // If a selected size sells out live, deselect it
  useEffect(() => {
    if (size && selectedStock === 0) setMessage({ ok: false, text: `Size ${size} in ${variant.colorName} just sold out.` });
  }, [selectedStock, size, variant.colorName]);

  // Re-fetch the product after a catalog re-seed
  const onInventory = useCallback(
    async (e: { type: string }) => {
      if (e.type !== "SEED_RESET") return;
      try {
        const res = await fetch(`/api/products/${initialProduct.slug}`, { cache: "no-store" });
        if (res.ok) setBaseProduct((await res.json()).product);
      } catch {
        /* ignore */
      }
    },
    [initialProduct.slug]
  );
  useInventoryStream(onInventory);

  const selectColor = (i: number) => {
    setVariantIndex(i);
    setMessage(null);
    const v = product.variants[i];
    if (size && (v.sizes.find((s) => s.size === size)?.stock ?? 0) === 0) setSize(null);
    window.history.replaceState(null, "", `/products/${product.slug}?color=${encodeURIComponent(v.colorName)}`);
    trackEvent("color_swatch_selected", { colorName: v.colorName, source: "pdp", department: product.department, subcategory: product.subcategory }, product.id);
  };

  const selectSize = (s: string) => {
    setSize(s);
    setMessage(null);
    trackEvent("size_selected", { size: s, colorName: variant.colorName, stock: variant.sizes.find((x) => x.size === s)?.stock, department: product.department }, product.id);
  };

  const openGuide = () => {
    setGuideOpen(true);
    trackEvent("size_guide_opened", { department: product.department, subcategory: product.subcategory, hasSavedMeasurements: Boolean(user?.savedSizes?.chestCm) }, product.id);
  };

  const handleAdd = () => {
    if (!size) {
      setMessage({ ok: false, text: "Please select a size." });
      return;
    }
    const result = addItem(product, variant, size, 1);
    setMessage(result.ok ? { ok: true, text: "Added to your shopping bag" } : { ok: false, text: result.message ?? "Could not add item" });
  };

  const gallery = Array.from(new Set([variant.imageUrl, variant.hoverImageUrl, ...variant.galleryImages])).slice(0, 6);
  const isOneSize = variant.sizes.length === 1 && variant.sizes[0].size === "One Size";

  // Auto-select One Size
  useEffect(() => {
    if (isOneSize && !size && variant.sizes[0].stock > 0) setSize("One Size");
  }, [isOneSize, size, variant.sizes]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6">
      {/* Breadcrumbs */}
      <nav className="mb-4 text-xs text-neutral-600">
        <Link href="/" className="hover:underline">LINEA</Link> /{" "}
        <Link href={`/shop?department=${product.department}`} className="hover:underline">{DEPARTMENT_LABELS[product.department]}</Link> /{" "}
        <Link href={`/shop?department=${product.department}&subcategory=${encodeURIComponent(product.subcategory)}`} className="hover:underline">{product.subcategory}</Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        {/* Left: 2-up lookbook gallery */}
        <div className="grid grid-cols-2 gap-1">
          {gallery.map((src, i) => (
            <ProductImage
              key={`${variant.colorName}-${src}`}
              src={src}
              fallbacks={gallery.filter((g) => g !== src)}
              alt={`${product.title} – ${variant.colorName} – image ${i + 1}`}
              placeholderLabel={`${product.title} · ${variant.colorName}`}
              colorHex={variant.colorHex}
              eager={i < 2}
            />
          ))}
        </div>

        {/* Right: sticky buy box */}
        <div className="lg:sticky lg:top-36 lg:self-start">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold leading-snug">{product.title}</h1>
            <button
              onClick={() => toggleFavourite(product.id, { department: product.department, subcategory: product.subcategory, price: product.price, source: "pdp" })}
              aria-label="Save to Favourites"
            >
              <Heart size={24} strokeWidth={1.5} className={saved ? "fill-[#E50010] text-[#E50010]" : ""} />
            </button>
          </div>

          <div className="mt-2 flex items-baseline gap-3">
            <span className={`text-lg font-semibold ${product.isSale ? "text-[#E50010]" : ""}`}>{formatINR(product.price)}</span>
            {product.isSale && product.originalPrice && (
              <>
                <span className="text-neutral-500 line-through">{formatINR(product.originalPrice)}</span>
                <span className="bg-[#E50010] px-1.5 py-0.5 text-[11px] font-semibold text-white">SALE -{discount}%</span>
              </>
            )}
          </div>
          {product.memberPrice && (
            <p className="mt-1 text-xs">
              <span className="font-semibold">LINEA Member price {formatINR(product.memberPrice)}</span>{" "}
              <span className="text-neutral-600">with the 10% member promo at checkout</span>
            </p>
          )}
          <p className="mt-1 text-[11px] text-neutral-500">MRP inclusive of all taxes · Art. no. {product.articleNumber}</p>

          <div className="mt-2 flex items-center gap-1 text-xs text-neutral-600">
            <Star size={12} className="fill-black" /> {product.rating} ({product.reviewCount} reviews)
          </div>

          {product.isConscious && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
              <Leaf size={12} /> Conscious choice
            </div>
          )}

          {/* Colour selector with thumbnails */}
          <div className="mt-6">
            <p className="text-[13px]"><span className="font-semibold">Colour:</span> {variant.colorName}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.variants.map((v, i) => {
                const vStock = v.sizes.reduce((s, x) => s + x.stock, 0);
                return (
                  <button
                    key={v.colorName}
                    onClick={() => selectColor(i)}
                    title={`${v.colorName}${vStock === 0 ? " – sold out" : ""}`}
                    className={`relative w-14 border-2 ${i === variantIndex ? "border-black" : "border-transparent hover:border-neutral-300"}`}
                  >
                    <ProductImage src={v.imageUrl} fallbacks={v.galleryImages} alt={v.colorName} colorHex={v.colorHex} placeholderLabel={v.colorName} />
                    <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border border-white" style={{ backgroundColor: v.colorHex }} />
                    {vStock === 0 && <span className="absolute inset-0 bg-white/60" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size matrix */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-[13px]">
              <p className="font-semibold">{isOneSize ? "Size: One Size" : "Select size"}</p>
              <button onClick={openGuide} className="flex items-center gap-1 underline underline-offset-2"><Ruler size={14} /> Size guide</button>
            </div>
            {!isOneSize && (
              <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                {variant.sizes.map((s) => {
                  const out = s.stock === 0;
                  const active = size === s.size;
                  return (
                    <button
                      key={s.size}
                      onClick={() => !out && selectSize(s.size)}
                      disabled={out}
                      className={`relative border py-2.5 text-[13px] ${active ? "border-black bg-black text-white" : out ? "cursor-not-allowed border-neutral-200 text-neutral-400 line-through" : "border-neutral-300 hover:border-black"}`}
                    >
                      {s.size}
                      {!out && s.stock <= 2 && <span className={`block text-[10px] ${active ? "text-white" : "text-[#E50010]"}`}>Only {s.stock} left</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-2 min-h-[18px] text-xs">
              {size && selectedStock !== null && (
                selectedStock === 0 ? <span className="text-neutral-500">Out of Stock</span>
                : selectedStock <= 2 ? <span className="font-semibold text-[#E50010]">Only {selectedStock} left in {size}</span>
                : <span className="text-emerald-700">In Stock</span>
              )}
              {user?.savedSizes?.top && !size && !isOneSize && <span className="text-neutral-600">Your saved size: {product.variants[0].sizes.some((s) => s.size === user.savedSizes.bottom) ? user.savedSizes.bottom : user.savedSizes.top}</span>}
            </p>
          </div>

          <button
            onClick={handleAdd}
            disabled={selectedStock === 0 || (size !== null && inBag >= Math.min(selectedStock ?? 0, 10))}
            className="mt-3 w-full bg-black py-4 text-xs font-semibold uppercase tracking-wider text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {selectedStock === 0 ? "Sold out" : "Add to bag"}
          </button>
          <button
            onClick={() => toggleFavourite(product.id, { department: product.department, subcategory: product.subcategory, price: product.price, source: "pdp_button" })}
            className="mt-2 flex w-full items-center justify-center gap-2 border border-black py-3.5 text-xs font-semibold uppercase tracking-wider hover:bg-neutral-50"
          >
            <Heart size={16} className={saved ? "fill-[#E50010] text-[#E50010]" : ""} />
            {saved ? "Saved to Favourites" : "Save to Favourites"}
          </button>
          {message && <p className={`mt-2 text-xs ${message.ok ? "text-emerald-700" : "text-[#E50010]"}`}>{message.text}</p>}

          <div className="mt-5 flex items-center gap-2 text-xs text-neutral-700">
            <Truck size={16} strokeWidth={1.5} /> Free delivery for members above {formatINR(FREE_DELIVERY_THRESHOLD)} · Delivered in 2–5 days
          </div>

          {/* Accordions */}
          <div className="mt-6 border-t border-neutral-200 text-[13px]">
            <Accordion id="description" title="Description & fit" open={openAccordion} setOpen={setOpenAccordion}>
              <p>{product.description}</p>
              <dl className="mt-3 grid grid-cols-[120px_1fr] gap-y-1 text-xs">
                <dt className="font-semibold">Fit</dt><dd>{product.fit}</dd>
                <dt className="font-semibold">Article number</dt><dd>{product.articleNumber}</dd>
                <dt className="font-semibold">Department</dt><dd>{DEPARTMENT_LABELS[product.department]} · {product.subcategory}</dd>
              </dl>
            </Accordion>
            <Accordion id="material" title="Material & sustainability" open={openAccordion} setOpen={setOpenAccordion}>
              <p><span className="font-semibold">Composition:</span> {product.composition}</p>
              <p className="mt-2"><span className="font-semibold">Care:</span> {product.care}</p>
              {product.isConscious ? (
                <p className="mt-2 text-emerald-800">This Conscious choice product is made with at least 50% more sustainable materials such as organic cotton, recycled polyester or linen.</p>
              ) : (
                <p className="mt-2 text-neutral-600">Give your clothes a longer life – bring unwanted garments to any LINEA store for Garment Collecting.</p>
              )}
            </Accordion>
            <Accordion id="delivery" title="Delivery & returns in India" open={openAccordion} setOpen={setOpenAccordion}>
              <ul className="list-disc space-y-1 pl-4">
                <li>Standard delivery: 2–5 working days, ₹149 (free for LINEA Members above ₹1,999).</li>
                <li>Express delivery: 1–2 working days in metro cities, ₹299.</li>
                <li>Free returns within 15 days in store or via doorstep pickup.</li>
                <li>Cash on delivery available up to ₹10,000 (simulated payment in this demo).</li>
              </ul>
            </Accordion>
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 text-xl font-semibold">Complete the look · Similar styles</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {similar.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      <SizeGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        department={product.department}
        sizes={variant.sizes.map((s) => s.size)}
        savedSizes={user?.savedSizes}
        onPickSize={(s) => {
          if ((variant.sizes.find((x) => x.size === s)?.stock ?? 0) > 0) selectSize(s);
          else setMessage({ ok: false, text: `Recommended size ${s} is out of stock in ${variant.colorName}.` });
        }}
      />
    </div>
  );
}

function Accordion({ id, title, open, setOpen, children }: { id: string; title: string; open: string | null; setOpen: (v: string | null) => void; children: React.ReactNode }) {
  const isOpen = open === id;
  return (
    <div className="border-b border-neutral-200">
      <button onClick={() => setOpen(isOpen ? null : id)} className="flex w-full items-center justify-between py-4 text-left font-semibold">
        {title}
        <ChevronDown size={16} className={`transition ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <div className="pb-4 text-neutral-800">{children}</div>}
    </div>
  );
}
