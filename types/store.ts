// ─────────────────────────────────────────────────────────────────────────────
// H&M India Clone – shared domain types (used by both server and client code)
// ─────────────────────────────────────────────────────────────────────────────

export type Department = "ladies" | "men" | "kids" | "baby" | "home" | "sport";

export const DEPARTMENTS: { id: Department; label: string }[] = [
  { id: "ladies", label: "Ladies" },
  { id: "men", label: "Men" },
  { id: "kids", label: "Kids" },
  { id: "baby", label: "Baby" },
  { id: "home", label: "H&M HOME" },
  { id: "sport", label: "Sport" },
];

export type MemberTier = "Member" | "Member Plus";

export interface SizeStock {
  size: string;
  stock: number;
}

export interface ProductVariant {
  colorName: string;
  colorHex: string;
  imageUrl: string;
  hoverImageUrl: string;
  galleryImages: string[];
  sizes: SizeStock[];
}

export interface Product {
  id: string;
  slug: string;
  articleNumber: string; // 10-digit H&M article number
  title: string;
  department: Department;
  subcategory: string;
  description: string;
  fit: string;
  composition: string;
  care: string;
  price: number; // INR, current selling price
  originalPrice?: number; // INR, present when on sale
  memberPrice?: number; // INR, H&M Member price
  isSale: boolean;
  isNewArrival: boolean;
  isConscious: boolean; // Conscious Choice badge
  bestsellerRank: number; // lower = more popular
  rating: number;
  reviewCount: number;
  createdAt: string;
  primaryImageUrl: string;
  hoverImageUrl: string;
  variants: ProductVariant[];
  totalStock: number;
  tags: string[];
}

export interface ProductFacets {
  departments: Record<string, number>;
  subcategories: Record<string, number>;
  sizes: string[];
  colors: { name: string; hex: string }[];
  priceRange: { min: number; max: number };
}

export interface ProductQueryResult {
  products: Product[];
  totalCount: number;
  page: number;
  limit: number;
  facets: ProductFacets;
}

export interface ShippingAddress {
  street: string;
  locality: string;
  city: string;
  state: string;
  pinCode: string; // 6-digit Indian PIN
}

export interface SavedSizes {
  top: string;
  bottom: string;
  shoe: string;
  chestCm?: number;
  waistCm?: number;
  hipCm?: number;
}

export interface User {
  id: string;
  memberId: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  tier: MemberTier;
  memberPoints: number;
  preferredDepartment: Department | "";
  savedSizes: SavedSizes;
  shippingAddress: ShippingAddress;
  createdAt: string;
}

/** User object safe to send to the browser (no password hash). */
export type PublicUser = Omit<User, "passwordHash"> & { wishlist: string[] };

/** Silent ML feature vector stored in Redis Hash hm:user:{userId}:metrics */
export interface UserBehaviorMetrics {
  product_views: number;
  total_dwell_seconds: number;
  color_swatch_selections: number;
  size_selections: number;
  size_guide_opens: number;
  searches: number;
  filters_applied: number;
  wishlist_toggles: number;
  cart_adds: number;
  cart_removes: number;
  cart_quantity_changes: number;
  checkouts_started: number;
  purchases: number;
  total_spent_inr: number;
  items_purchased: number;
  recycling_pledges: number;
  last_event_at: string;
  [key: string]: number | string;
}

export interface OrderItem {
  productId: string;
  slug: string;
  title: string;
  articleNumber: string;
  colorName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string;
}

export type DeliveryMethod = "standard" | "express";

export interface Order {
  id: string;
  userId: string | null;
  sessionId: string | null;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  deliveryMethod: DeliveryMethod;
  subtotal: number;
  memberDiscount: number;
  deliveryFee: number;
  gstIncluded: number; // GST component included in prices (informational)
  total: number;
  pointsEarned: number;
  tierAfterOrder: MemberTier | null;
  status: "confirmed";
  paymentMethod: "Simulated Instant Payment";
  estimatedDelivery: string;
  createdAt: string;
}

export type CustomerEventType =
  | "product_view"
  | "product_dwell_time"
  | "color_swatch_selected"
  | "size_selected"
  | "size_guide_opened"
  | "search_query"
  | "filter_applied"
  | "wishlist_toggle"
  | "cart_add"
  | "cart_remove"
  | "cart_quantity_change"
  | "checkout_started"
  | "purchase_completed"
  | "recycling_pledge"
  | "login"
  | "register";

export interface CustomerEvent {
  id?: string;
  eventType: CustomerEventType;
  userId: string | null;
  sessionId: string | null;
  productId?: string;
  payload: Record<string, unknown>;
  path?: string;
  userAgent?: string;
  timestamp: string;
}

export interface GarmentRecyclingSubmission {
  id: string;
  userId: string;
  bagCount: number;
  garmentTypes: string[];
  estimatedWeightKg: number;
  dropOffStore: string;
  voucherCode: string;
  voucherPercent: number;
  voucherValidUntil: string;
  pointsAwarded: number;
  createdAt: string;
}

export interface CartItem {
  variantKey: string; // `${productId}_${colorName}_${size}`
  productId: string;
  slug: string;
  title: string;
  articleNumber: string;
  colorName: string;
  colorHex: string;
  size: string;
  price: number;
  imageUrl: string;
  quantity: number;
  maxStock: number;
}

export type InventoryEvent =
  | {
      type: "STOCK_UPDATE";
      productId: string;
      slug: string;
      variants: ProductVariant[];
      totalStock: number;
    }
  | { type: "SEED_RESET"; at: string };
