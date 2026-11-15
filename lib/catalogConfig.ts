// Shared (client + server) catalog configuration: department menus, filter
// groups and size matrices. No server-only imports here.

import type { Department } from "@/types/store";

export const DEPARTMENT_LABELS: Record<Department, string> = {
  ladies: "Ladies",
  men: "Men",
  kids: "Kids",
  baby: "Baby",
  home: "H&M HOME",
  sport: "Sport",
};

/** Subcategories shown in the header mega-menu for each department. */
export const DEPARTMENT_SUBCATEGORIES: Record<Department, string[]> = {
  ladies: [
    "Dresses",
    "Tops & T-shirts",
    "Shirts & Blouses",
    "Sweatshirts & Hoodies",
    "Cardigans & Knitwear",
    "Blazers & Coats",
    "Jeans & Trousers",
    "Skirts & Co-ords",
  ],
  men: [
    "Oversized T-shirts",
    "Linen & Casual Shirts",
    "Hoodies & Sweatshirts",
    "Baggy Jeans & Cargo Trousers",
    "Jackets & Blazers",
    "Polo Shirts",
  ],
  kids: ["Party Edit 2-8Y", "Party Edit 9-14Y", "Cotton Sets", "Denim", "Tops & T-shirts"],
  baby: ["Rompers", "Cotton Sets", "Knitwear", "Denim"],
  home: ["Cushion Covers", "Bedding", "Vases", "Candles", "Rugs"],
  sport: ["DryMove™ Tops", "Running Shorts", "Leggings", "Track Jackets"],
};

/**
 * Cross-department filter groups used by the /shop subcategory pill tabs.
 * Filtering by a group name matches any product whose subcategory is in the group
 * (or matches the name exactly).
 */
export const SUBCATEGORY_GROUPS: Record<string, string[]> = {
  Dresses: ["Dresses", "Party Edit 2-8Y", "Party Edit 9-14Y"],
  "Tops & T-shirts": ["Tops & T-shirts", "Oversized T-shirts", "Polo Shirts", "DryMove™ Tops"],
  "Shirts & Blouses": ["Shirts & Blouses", "Linen & Casual Shirts"],
  "Hoodies & Sweatshirts": ["Sweatshirts & Hoodies", "Hoodies & Sweatshirts"],
  "Jeans & Trousers": ["Jeans & Trousers", "Baggy Jeans & Cargo Trousers", "Denim"],
  "Jackets & Blazers": ["Blazers & Coats", "Jackets & Blazers", "Track Jackets"],
  "Knitwear & Cardigans": ["Cardigans & Knitwear", "Knitwear"],
  "Skirts & Co-ords": ["Skirts & Co-ords", "Cotton Sets"],
  "Home & Living": ["Cushion Covers", "Bedding", "Vases", "Candles", "Rugs"],
  Activewear: ["DryMove™ Tops", "Running Shorts", "Leggings", "Track Jackets"],
};

export const SHOP_SUBCATEGORY_TABS = ["All", ...Object.keys(SUBCATEGORY_GROUPS)];

export function subcategoryMatches(productSubcategory: string, filter: string): boolean {
  if (!filter || filter === "All") return true;
  const f = filter.toLowerCase();
  if (productSubcategory.toLowerCase() === f) return true;
  const groupKey = Object.keys(SUBCATEGORY_GROUPS).find((k) => k.toLowerCase() === f);
  if (!groupKey) return false;
  return SUBCATEGORY_GROUPS[groupKey].some((s) => s.toLowerCase() === productSubcategory.toLowerCase());
}

export const SIZE_ORDER = [
  "XS", "S", "M", "L", "XL", "XXL",
  "26", "28", "30", "32", "34", "36",
  "0-3M", "3-6M", "6-9M", "9-12M", "12-18M",
  "2-4Y", "4-6Y", "6-8Y", "8-10Y", "10-12Y", "12-14Y",
  "One Size",
];

export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

export const FREE_DELIVERY_THRESHOLD = 1999;
export const STANDARD_DELIVERY_FEE = 149;
export const EXPRESS_DELIVERY_FEE = 299;
export const MEMBER_PROMO_PERCENT = 10;
export const MEMBER_PLUS_THRESHOLD = 800;
export const INR_PER_POINT = 50;

export function formatINR(value: number): string {
  return "₹" + Math.round(value).toLocaleString("en-IN");
}

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
  "Lakshadweep", "Puducherry",
];
