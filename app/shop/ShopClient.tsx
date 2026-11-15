"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import type { Product, ProductFacets, ProductQueryResult } from "@/types/store";
import ProductGrid from "@/components/ProductGrid";
import { DEPARTMENT_LABELS, SHOP_SUBCATEGORY_TABS, formatINR } from "@/lib/catalogConfig";
import { trackEvent } from "@/lib/telemetryClient";
import { useInventoryStream } from "@/hooks/useInventoryStream";

export interface ShopFilters {
  department: string;
  subcategory: string;
  size: string;
  color: string;
  minPrice: string;
  maxPrice: string;
  isSale: boolean;
  isNewArrival: boolean;
  inStockOnly: boolean;
  search: string;
  sort: string;
}

const PAGE_SIZE = 24;
const SIZE_CHIPS = ["XS", "S", "M", "L", "XL", "28", "30", "32", "34", "2-4Y", "4-6Y", "6-8Y", "8-10Y", "10-12Y", "12-14Y", "0-3M", "3-6M", "6-9M", "9-12M", "One Size"];
const PRICE_PRESETS: { label: string; min: string; max: string }[] = [
  { label: "Under ₹999", min: "", max: "999" },
  { label: "₹1,000 – ₹1,999", min: "1000", max: "1999" },
  { label: "₹2,000 – ₹2,999", min: "2000", max: "2999" },
  { label: "₹3,000 & above", min: "3000", max: "" },
];
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "bestsellers", label: "Bestsellers" },
];

function toQuery(f: ShopFilters, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  if (f.department) p.set("department", f.department);
  if (f.subcategory && f.subcategory !== "All") p.set("subcategory", f.subcategory);
  if (f.size) p.set("size", f.size);
  if (f.color) p.set("color", f.color);
  if (f.minPrice) p.set("minPrice", f.minPrice);
  if (f.maxPrice) p.set("maxPrice", f.maxPrice);
  if (f.isSale) p.set("isSale", "true");
  if (f.isNewArrival) p.set("isNewArrival", "true");
  if (f.inStockOnly) p.set("inStockOnly", "true");
  if (f.search) p.set("search", f.search);
  if (f.sort && f.sort !== "newest") p.set("sort", f.sort);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.toString();
}

export default function ShopClient({ initial }: { initial: ShopFilters }) {
  const router = useRouter();
  const [filters, setFilters] = useState<ShopFilters>(initial);
  const [products, setProducts] = useState<Product[]>([]);
  const [facets, setFacets] = useState<ProductFacets | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const firstRender = useRef(true);

  // Fetch whenever filters / page change
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const qs = toQuery(filters, { limit: String(PAGE_SIZE), page: String(page) });
    fetch(`/api/products?${qs}`, { signal: controller.signal, cache: "no-store" })
      .then(async (r) => {
        const data = (await r.json()) as ProductQueryResult & { error?: string };
        if (!r.ok) throw new Error(data.error ?? "Failed to load products");
        setProducts((prev) => (page === 1 ? data.products : [...prev, ...data.products]));
        setFacets(data.facets);
        setTotalCount(data.totalCount);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [filters, page, reloadKey]);

  // Re-load after an inventory re-seed from any tab
  const onInventory = useCallback((e: { type: string }) => {
    if (e.type === "SEED_RESET") {
      setPage(1);
      setReloadKey((k) => k + 1);
    }
  }, []);
  useInventoryStream(onInventory);

  // Keep the URL shareable + log filter changes silently
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      if (initial.search) trackEvent("search_query", { query: initial.search, source: "shop_url" });
      return;
    }
    const qs = toQuery(filters);
    window.history.replaceState(null, "", qs ? `/shop?${qs}` : "/shop");
    trackEvent("filter_applied", { ...filters, department: filters.department || undefined });
  }, [filters, initial.search]);

  const update = (patch: Partial<ShopFilters>) => {
    setPage(1);
    setFilters((f) => ({ ...f, ...patch }));
  };

  const clearAll = () => {
    setPage(1);
    setFilters({ department: "", subcategory: "", size: "", color: "", minPrice: "", maxPrice: "", isSale: false, isNewArrival: false, inStockOnly: false, search: "", sort: "newest" });
    router.replace("/shop");
  };

  const heading = useMemo(() => {
    if (filters.search) return `Results for “${filters.search}”`;
    if (filters.isSale) return "Sale";
    if (filters.isNewArrival) return "New Arrivals";
    const dept = filters.department ? DEPARTMENT_LABELS[filters.department as keyof typeof DEPARTMENT_LABELS] : "Shop all";
    return filters.subcategory && filters.subcategory !== "All" ? `${dept} · ${filters.subcategory}` : dept;
  }, [filters]);

  const activeChips: { label: string; clear: Partial<ShopFilters> }[] = [];
  if (filters.department) activeChips.push({ label: DEPARTMENT_LABELS[filters.department as keyof typeof DEPARTMENT_LABELS] ?? filters.department, clear: { department: "" } });
  if (filters.subcategory && filters.subcategory !== "All") activeChips.push({ label: filters.subcategory, clear: { subcategory: "" } });
  if (filters.size) activeChips.push({ label: `Size ${filters.size}`, clear: { size: "" } });
  if (filters.color) activeChips.push({ label: filters.color, clear: { color: "" } });
  if (filters.minPrice || filters.maxPrice) activeChips.push({ label: `${filters.minPrice ? formatINR(+filters.minPrice) : "₹0"} – ${filters.maxPrice ? formatINR(+filters.maxPrice) : "any"}`, clear: { minPrice: "", maxPrice: "" } });
  if (filters.isSale) activeChips.push({ label: "On sale", clear: { isSale: false } });
  if (filters.isNewArrival) activeChips.push({ label: "New arrivals", clear: { isNewArrival: false } });
  if (filters.inStockOnly) activeChips.push({ label: "In stock", clear: { inStockOnly: false } });
  if (filters.search) activeChips.push({ label: `“${filters.search}”`, clear: { search: "" } });

  const sidebar = (
    <div className="space-y-7 text-[13px]">
      <FilterBlock title="Department">
        <div className="flex flex-col gap-1.5">
          <Radio checked={!filters.department} onClick={() => update({ department: "" })} label="All departments" />
          {Object.entries(DEPARTMENT_LABELS).map(([id, label]) => (
            <Radio key={id} checked={filters.department === id} onClick={() => update({ department: id })} label={label} count={facets?.departments[id]} />
          ))}
        </div>
      </FilterBlock>

      <FilterBlock title="Size">
        <div className="flex flex-wrap gap-1.5">
          {SIZE_CHIPS.filter((s) => !facets || facets.sizes.includes(s) || filters.size === s).map((s) => (
            <button
              key={s}
              onClick={() => update({ size: filters.size === s ? "" : s })}
              className={`min-w-10 border px-2 py-1.5 text-xs ${filters.size === s ? "border-black bg-black text-white" : "border-neutral-300 hover:border-black"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </FilterBlock>

      <FilterBlock title="Colour">
        <div className="grid grid-cols-2 gap-2">
          {(facets?.colors ?? []).map((c) => (
            <button key={c.name} onClick={() => update({ color: filters.color === c.name ? "" : c.name })} className="flex items-center gap-2 text-left">
              <span className={`h-4 w-4 rounded-full border ${filters.color === c.name ? "ring-1 ring-black ring-offset-2" : "border-neutral-300"}`} style={{ backgroundColor: c.hex }} />
              <span className={filters.color === c.name ? "font-semibold" : ""}>{c.name}</span>
            </button>
          ))}
          {filters.color && !(facets?.colors ?? []).some((c) => c.name === filters.color) && (
            <button onClick={() => update({ color: "" })} className="col-span-2 text-left underline">Clear colour ({filters.color})</button>
          )}
        </div>
      </FilterBlock>

      <FilterBlock title="Price (₹)">
        <div className="flex flex-col gap-1.5">
          {PRICE_PRESETS.map((p) => (
            <Radio key={p.label} checked={filters.minPrice === p.min && filters.maxPrice === p.max} onClick={() => update({ minPrice: p.min, maxPrice: p.max })} label={p.label} />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input inputMode="numeric" placeholder="Min" value={filters.minPrice} onChange={(e) => update({ minPrice: e.target.value.replace(/\D/g, "") })} className="w-full border border-neutral-300 px-2 py-1.5" />
          <span>–</span>
          <input inputMode="numeric" placeholder="Max" value={filters.maxPrice} onChange={(e) => update({ maxPrice: e.target.value.replace(/\D/g, "") })} className="w-full border border-neutral-300 px-2 py-1.5" />
        </div>
      </FilterBlock>

      <FilterBlock title="More">
        <div className="flex flex-col gap-2">
          <Check checked={filters.isSale} onChange={(v) => update({ isSale: v })} label="On sale only" />
          <Check checked={filters.isNewArrival} onChange={(v) => update({ isNewArrival: v })} label="New arrivals" />
          <Check checked={filters.inStockOnly} onChange={(v) => update({ inStockOnly: v })} label="In stock only" />
        </div>
      </FilterBlock>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8">
      <h1 className="text-2xl font-semibold md:text-3xl">{heading}</h1>

      {/* Subcategory pill tabs */}
      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
        {SHOP_SUBCATEGORY_TABS.map((tab) => {
          const active = (filters.subcategory || "All") === tab;
          return (
            <button
              key={tab}
              onClick={() => update({ subcategory: tab === "All" ? "" : tab })}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-[13px] ${active ? "border-black bg-black text-white" : "border-neutral-300 hover:border-black"}`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-neutral-200 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setMobileFilters(true)} className="flex items-center gap-1.5 border border-neutral-300 px-3 py-1.5 text-[13px] lg:hidden">
            <SlidersHorizontal size={14} /> Filter
          </button>
          {activeChips.map((c) => (
            <button key={c.label} onClick={() => update(c.clear)} className="flex items-center gap-1 bg-neutral-100 px-2.5 py-1 text-xs hover:bg-neutral-200">
              {c.label} <X size={12} />
            </button>
          ))}
          {activeChips.length > 0 && <button onClick={clearAll} className="text-xs underline">Clear all</button>}
        </div>
        <div className="flex items-center gap-4 text-[13px]">
          <span className="text-neutral-600" aria-live="polite">{loading && page === 1 ? "Loading…" : `${totalCount} items`}</span>
          <label className="flex items-center gap-2">
            <span className="hidden sm:inline">Sort by</span>
            <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className="border border-neutral-300 bg-white px-2 py-1.5">
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[230px_1fr]">
        <aside className="hidden lg:block">{sidebar}</aside>

        <div>
          {error ? (
            <p className="py-16 text-center text-sm text-[#E50010]">{error}</p>
          ) : !loading && products.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg font-semibold">No products match your filters</p>
              <button onClick={clearAll} className="mt-4 bg-black px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">Clear filters</button>
            </div>
          ) : (
            <>
              <div className={loading && page === 1 ? "opacity-50 transition" : ""}>
                <ProductGrid products={products} eagerCount={8} />
              </div>
              <div className="mt-12 flex flex-col items-center gap-3">
                <p className="text-xs text-neutral-600">Showing {products.length} of {totalCount}</p>
                <div className="h-0.5 w-56 bg-neutral-200">
                  <div className="h-0.5 bg-black" style={{ width: `${totalCount ? (products.length / totalCount) * 100 : 0}%` }} />
                </div>
                {products.length < totalCount && (
                  <button onClick={() => setPage((p) => p + 1)} disabled={loading} className="mt-2 border border-black px-10 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-black hover:text-white disabled:opacity-50">
                    {loading ? "Loading…" : "Load more products"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFilters && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="flex-1 bg-black/40" onClick={() => setMobileFilters(false)} />
          <div className="w-80 overflow-y-auto bg-white p-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="font-semibold">Filter & sort</p>
              <button onClick={() => setMobileFilters(false)}><X size={20} /></button>
            </div>
            {sidebar}
            <button onClick={() => setMobileFilters(false)} className="mt-6 w-full bg-black py-3 text-xs font-semibold uppercase text-white">Show {totalCount} items</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

function Radio({ checked, onClick, label, count }: { checked: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 text-left">
      <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${checked ? "border-black" : "border-neutral-400"}`}>
        {checked && <span className="h-2 w-2 rounded-full bg-black" />}
      </span>
      <span className={checked ? "font-semibold" : ""}>{label}</span>
      {typeof count === "number" && <span className="text-neutral-400">({count})</span>}
    </button>
  );
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-3.5 w-3.5 accent-black" />
      {label}
    </label>
  );
}
