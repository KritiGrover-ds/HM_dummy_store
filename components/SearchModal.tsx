"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { Product } from "@/types/store";
import ProductImage from "./ProductImage";
import { formatINR } from "@/lib/catalogConfig";
import { trackEvent } from "@/lib/telemetryClient";

const SUGGESTIONS = ["linen", "dress", "baggy jeans", "hoodie", "drymove", "cushion", "party"];

export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastLogged = useRef("");

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Debounced instant search across title, subcategory, colour, composition & 10-digit article number
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=8&sort=bestsellers`, { signal: controller.signal });
        const data = await res.json();
        setResults(data.products ?? []);
        setTotal(data.totalCount ?? 0);
        if (lastLogged.current !== q) {
          lastLogged.current = q;
          trackEvent("search_query", { query: q, resultCount: data.totalCount ?? 0, source: "search_modal" });
        }
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="Search">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 border-b border-neutral-300 px-4 py-5">
        <Search size={20} strokeWidth={1.5} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for products, styles or a 10-digit article number"
          className="flex-1 bg-transparent text-lg outline-none placeholder:text-neutral-400"
        />
        <button onClick={onClose} aria-label="Close search" className="p-1">
          <X size={22} strokeWidth={1.5} />
        </button>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-4 py-6">
        {query.trim().length < 2 ? (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Popular searches</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setQuery(s)} className="border border-neutral-300 px-3 py-1.5 text-sm hover:border-black">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : loading && results.length === 0 ? (
          <p className="text-sm text-neutral-500">Searching…</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-neutral-600">No results for “{query}”. Try another word or an article number.</p>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-neutral-600">{total} products</p>
              <Link href={`/shop?search=${encodeURIComponent(query.trim())}`} onClick={onClose} className="text-sm font-semibold underline">
                View all results
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {results.map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`} onClick={onClose} className="group">
                  <ProductImage
                    src={p.primaryImageUrl}
                    fallbacks={[p.hoverImageUrl, ...p.variants[0].galleryImages]}
                    alt={p.title}
                    colorHex={p.variants[0].colorHex}
                  />
                  <p className="mt-2 text-[13px] group-hover:underline">{p.title}</p>
                  <p className="text-[13px] font-semibold">{formatINR(p.price)}</p>
                  <p className="text-[11px] text-neutral-500">Art. no. {p.articleNumber}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
