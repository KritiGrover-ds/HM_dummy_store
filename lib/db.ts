import "server-only";
import { randomBytes } from "crypto";
import { getRedis, keys, stockField } from "./redis";
import { ensureSeeded } from "./seedData";
import { sortSizes, subcategoryMatches } from "./catalogConfig";
import type {
  CustomerEvent,
  CustomerEventType,
  GarmentRecyclingSubmission,
  Order,
  Product,
  ProductFacets,
  ProductQueryResult,
  PublicUser,
  User,
  UserBehaviorMetrics,
} from "@/types/store";

// ─────────────────────────────────────────────────────────────────────────────
// Redis Data Access Layer
// ─────────────────────────────────────────────────────────────────────────────

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
}

// ── Products ────────────────────────────────────────────────────────────────

/** Overlays live stock from HGETALL hm:stock:{productId} onto a product document. */
function hydrateStock(product: Product, stock: Record<string, string> | null): Product {
  if (!stock || Object.keys(stock).length === 0) return product;
  let total = 0;
  const variants = product.variants.map((v) => ({
    ...v,
    sizes: v.sizes.map((s) => {
      const raw = stock[stockField(v.colorName, s.size)];
      const live = raw === undefined ? s.stock : Math.max(0, parseInt(raw, 10) || 0);
      total += live;
      return { size: s.size, stock: live };
    }),
  }));
  return { ...product, variants, totalStock: total };
}

async function loadProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (slugs.length === 0) return [];
  const redis = getRedis();
  const docs = await redis.mget(...slugs.map((s) => keys.product(s)));
  const products = docs.filter((d): d is string => Boolean(d)).map((d) => JSON.parse(d) as Product);
  if (products.length === 0) return [];
  const pipeline = redis.pipeline();
  products.forEach((p) => pipeline.hgetall(keys.stock(p.id)));
  const stockResults = (await pipeline.exec()) ?? [];
  return products.map((p, i) => hydrateStock(p, (stockResults[i]?.[1] as Record<string, string>) ?? null));
}

export async function getAllProducts(): Promise<Product[]> {
  await ensureSeeded();
  const redis = getRedis();
  const ids = await redis.smembers(keys.productsAll);
  if (ids.length === 0) return [];
  const slugs = (await redis.mget(...ids.map((id) => keys.productById(id)))).filter((s): s is string => Boolean(s));
  return loadProductsBySlugs(slugs);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  await ensureSeeded();
  const [product] = await loadProductsBySlugs([slug]);
  return product ?? null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const slug = await getRedis().get(keys.productById(id));
  if (!slug) return null;
  return getProductBySlug(slug);
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const slugs = (await getRedis().mget(...ids.map((id) => keys.productById(id)))).filter((s): s is string => Boolean(s));
  return loadProductsBySlugs(slugs);
}

export interface ProductQuery {
  department?: string;
  subcategory?: string;
  isSale?: boolean;
  isNewArrival?: boolean;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "bestsellers";
  limit?: number;
  page?: number;
  ids?: string[];
}

function buildFacets(products: Product[]): ProductFacets {
  const departments: Record<string, number> = {};
  const subcategories: Record<string, number> = {};
  const sizes = new Set<string>();
  const colors = new Map<string, string>();
  let min = Infinity;
  let max = 0;
  for (const p of products) {
    departments[p.department] = (departments[p.department] ?? 0) + 1;
    subcategories[p.subcategory] = (subcategories[p.subcategory] ?? 0) + 1;
    for (const v of p.variants) {
      const base = baseColorName(v.colorName);
      if (!colors.has(base)) colors.set(base, v.colorHex);
      v.sizes.forEach((s) => sizes.add(s.size));
    }
    min = Math.min(min, p.price);
    max = Math.max(max, p.price);
  }
  return {
    departments,
    subcategories,
    sizes: sortSizes(Array.from(sizes)),
    colors: Array.from(colors.entries())
      .map(([name, hex]) => ({ name, hex }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    priceRange: { min: min === Infinity ? 0 : min, max },
  };
}

/** "Light Denim Blue" → "Blue", "Grey Marl" → "Grey" (used for colour filter facets). */
export function baseColorName(colorName: string): string {
  const known = [
    "Black", "White", "Grey", "Beige", "Blue", "Green", "Pink", "Brown", "Red", "Yellow",
    "Purple", "Orange", "Cream", "Navy", "Khaki", "Gold", "Silver", "Natural",
  ];
  const lower = colorName.toLowerCase();
  if (lower.includes("navy")) return "Blue";
  if (lower.includes("terracotta") || lower.includes("rust") || lower.includes("burgundy")) return "Red";
  if (lower.includes("camel") || lower.includes("mocha") || lower.includes("sand")) return "Beige";
  if (lower.includes("olive") || lower.includes("sage") || lower.includes("emerald")) return "Green";
  if (lower.includes("champagne") || lower.includes("off white")) return "Cream";
  for (const k of known) if (lower.includes(k.toLowerCase())) return k;
  return "Multi";
}

export async function queryProducts(q: ProductQuery): Promise<ProductQueryResult> {
  const all = await getAllProducts();
  let list = all;

  if (q.ids && q.ids.length) {
    const set = new Set(q.ids);
    list = list.filter((p) => set.has(p.id));
  }
  if (q.department) {
    const d = q.department.toLowerCase();
    list = list.filter((p) => p.department === d);
  }
  if (q.subcategory) list = list.filter((p) => subcategoryMatches(p.subcategory, q.subcategory!));
  if (q.isSale) list = list.filter((p) => p.isSale);
  if (q.isNewArrival) list = list.filter((p) => p.isNewArrival);
  if (typeof q.minPrice === "number" && !Number.isNaN(q.minPrice)) list = list.filter((p) => p.price >= q.minPrice!);
  if (typeof q.maxPrice === "number" && !Number.isNaN(q.maxPrice)) list = list.filter((p) => p.price <= q.maxPrice!);
  if (q.color) {
    const c = q.color.toLowerCase();
    list = list.filter((p) =>
      p.variants.some((v) => v.colorName.toLowerCase() === c || baseColorName(v.colorName).toLowerCase() === c)
    );
  }
  if (q.size) {
    const sz = q.size;
    list = list.filter((p) => p.variants.some((v) => v.sizes.some((s) => s.size === sz && s.stock > 0)));
  }
  if (q.inStockOnly) list = list.filter((p) => p.totalStock > 0);
  if (q.search && q.search.trim()) {
    const terms = q.search.toLowerCase().trim().split(/\s+/);
    list = list.filter((p) => {
      const haystack = [
        p.title, p.subcategory, p.articleNumber, p.composition, p.department, p.fit,
        ...p.variants.map((v) => v.colorName), ...p.tags,
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }

  const facets = buildFacets(list);

  switch (q.sort) {
    case "price_asc":
      list = [...list].sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      list = [...list].sort((a, b) => b.price - a.price);
      break;
    case "bestsellers":
      list = [...list].sort((a, b) => a.bestsellerRank - b.bestsellerRank);
      break;
    case "newest":
    default:
      list = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.id.localeCompare(b.id)));
  }

  const totalCount = list.length;
  const limit = q.limit && q.limit > 0 ? Math.min(q.limit, 200) : totalCount || 1;
  const page = q.page && q.page > 0 ? q.page : 1;
  const start = (page - 1) * limit;
  return { products: list.slice(start, start + limit), totalCount, page, limit, facets };
}

export async function getStockSnapshot(productId: string) {
  const product = await getProductById(productId);
  if (!product) return null;
  return { productId: product.id, slug: product.slug, variants: product.variants, totalStock: product.totalStock };
}

// ── Users ───────────────────────────────────────────────────────────────────

export async function getUserById(userId: string): Promise<User | null> {
  const raw = await getRedis().get(keys.user(userId));
  return raw ? (JSON.parse(raw) as User) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const id = await getRedis().get(keys.userByEmail(email));
  return id ? getUserById(id) : null;
}

export async function createUser(user: User): Promise<User> {
  const redis = getRedis();
  const ok = await redis.set(keys.userByEmail(user.email), user.id, "NX");
  if (ok !== "OK") throw new Error("EMAIL_TAKEN");
  await redis
    .multi()
    .set(keys.user(user.id), JSON.stringify(user))
    .hset(keys.userMetrics(user.id), { product_views: 0, purchases: 0, total_spent_inr: 0 })
    .exec();
  return user;
}

export async function saveUser(user: User): Promise<User> {
  await getRedis().set(keys.user(user.id), JSON.stringify(user));
  return user;
}

export async function getWishlist(userId: string): Promise<string[]> {
  return getRedis().smembers(keys.userWishlist(userId));
}

/** Toggles productId in hm:user:{userId}:wishlist. Returns the new state. */
export async function toggleWishlist(userId: string, productId: string): Promise<{ saved: boolean; wishlist: string[] }> {
  const redis = getRedis();
  const key = keys.userWishlist(userId);
  const isMember = await redis.sismember(key, productId);
  if (isMember) await redis.srem(key, productId);
  else await redis.sadd(key, productId);
  return { saved: !isMember, wishlist: await redis.smembers(key) };
}

export async function toPublicUser(user: User): Promise<PublicUser> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = user;
  return { ...rest, wishlist: await getWishlist(user.id) };
}

export async function getUserMetrics(userId: string): Promise<Partial<UserBehaviorMetrics>> {
  const raw = await getRedis().hgetall(keys.userMetrics(userId));
  const out: Record<string, number | string> = {};
  for (const [k, v] of Object.entries(raw)) out[k] = k === "last_event_at" ? v : Number(v);
  return out as Partial<UserBehaviorMetrics>;
}

// ── Orders ──────────────────────────────────────────────────────────────────

export async function saveOrder(order: Order): Promise<void> {
  const redis = getRedis();
  const tx = redis.multi().set(keys.order(order.id), JSON.stringify(order)).lpush(keys.ordersAll, order.id);
  if (order.userId) tx.lpush(keys.userOrders(order.userId), order.id);
  await tx.exec();
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const raw = await getRedis().get(keys.order(orderId));
  return raw ? (JSON.parse(raw) as Order) : null;
}

export async function getUserOrders(userId: string, limit = 50): Promise<Order[]> {
  const redis = getRedis();
  const ids = await redis.lrange(keys.userOrders(userId), 0, limit - 1);
  if (ids.length === 0) return [];
  const docs = await redis.mget(...ids.map((id) => keys.order(id)));
  return docs.filter((d): d is string => Boolean(d)).map((d) => JSON.parse(d) as Order);
}

// ── Garment recycling ───────────────────────────────────────────────────────

export async function addRecyclingSubmission(sub: GarmentRecyclingSubmission): Promise<void> {
  await getRedis().lpush(keys.recycling(sub.userId), JSON.stringify(sub));
}

export async function getRecyclingSubmissions(userId: string): Promise<GarmentRecyclingSubmission[]> {
  const items = await getRedis().lrange(keys.recycling(userId), 0, 99);
  return items.map((i) => JSON.parse(i) as GarmentRecyclingSubmission);
}

// ── Newsletter ──────────────────────────────────────────────────────────────

export async function subscribeNewsletter(email: string): Promise<boolean> {
  const added = await getRedis().sadd(keys.newsletter, email.trim().toLowerCase());
  return added === 1;
}

// ── Silent behavioural telemetry ────────────────────────────────────────────

const METRIC_FOR_EVENT: Partial<Record<CustomerEventType, string>> = {
  product_view: "product_views",
  color_swatch_selected: "color_swatch_selections",
  size_selected: "size_selections",
  size_guide_opened: "size_guide_opens",
  search_query: "searches",
  filter_applied: "filters_applied",
  wishlist_toggle: "wishlist_toggles",
  cart_add: "cart_adds",
  cart_remove: "cart_removes",
  cart_quantity_change: "cart_quantity_changes",
  checkout_started: "checkouts_started",
  purchase_completed: "purchases",
  recycling_pledge: "recycling_pledges",
  login: "logins",
  register: "registrations",
};

export const ALLOWED_CLIENT_EVENTS: CustomerEventType[] = [
  "product_view",
  "product_dwell_time",
  "color_swatch_selected",
  "size_selected",
  "size_guide_opened",
  "search_query",
  "filter_applied",
  "wishlist_toggle",
  "cart_add",
  "cart_remove",
  "cart_quantity_change",
  "checkout_started",
];

const STREAM_MAXLEN = 100000;
const LIST_MAXLEN = 50000;
const SESSION_LIST_MAXLEN = 2000;

/**
 * Silently records one shopper interaction:
 *   XADD   hm:telemetry:stream  MAXLEN ~ 100000 * field value …
 *   LPUSH  hm:telemetry:events  (capped)
 *   LPUSH  hm:session:{sessionId}:events (capped, used to stitch guests → users on login)
 *   HINCRBY / HINCRBYFLOAT hm:user:{userId}:metrics
 * Never throws – telemetry must never break the shopping experience.
 */
export async function logEvent(input: Omit<CustomerEvent, "timestamp"> & { timestamp?: string }): Promise<void> {
  try {
    const redis = getRedis();
    const event: CustomerEvent = { ...input, timestamp: input.timestamp ?? new Date().toISOString() };
    const json = JSON.stringify(event);
    const tx = redis.multi();

    tx.xadd(
      keys.telemetryStream,
      "MAXLEN",
      "~",
      String(STREAM_MAXLEN),
      "*",
      "eventType", event.eventType,
      "userId", event.userId ?? "",
      "sessionId", event.sessionId ?? "",
      "productId", event.productId ?? "",
      "path", event.path ?? "",
      "payload", JSON.stringify(event.payload ?? {}),
      "ts", event.timestamp
    );
    tx.lpush(keys.telemetryEvents, json);
    tx.ltrim(keys.telemetryEvents, 0, LIST_MAXLEN - 1);

    if (event.sessionId) {
      tx.lpush(keys.sessionEvents(event.sessionId), json);
      tx.ltrim(keys.sessionEvents(event.sessionId), 0, SESSION_LIST_MAXLEN - 1);
      tx.expire(keys.sessionEvents(event.sessionId), 60 * 60 * 24 * 90);
    }

    if (event.userId) {
      const mk = keys.userMetrics(event.userId);
      const metric = METRIC_FOR_EVENT[event.eventType];
      if (metric) tx.hincrby(mk, metric, 1);
      tx.hincrby(mk, `event:${event.eventType}`, 1);
      tx.hset(mk, "last_event_at", event.timestamp);

      const p = event.payload ?? {};
      if (event.eventType === "product_dwell_time") {
        const secs = Number(p.seconds ?? 0);
        if (Number.isFinite(secs) && secs > 0) tx.hincrbyfloat(mk, "total_dwell_seconds", Math.min(secs, 3600));
      }
      if (event.eventType === "purchase_completed") {
        const total = Number(p.total ?? 0);
        const items = Number(p.itemCount ?? 0);
        if (Number.isFinite(total)) tx.hincrbyfloat(mk, "total_spent_inr", total);
        if (Number.isFinite(items)) tx.hincrby(mk, "items_purchased", items);
      }
      if (typeof p.department === "string" && p.department) tx.hincrby(mk, `dept_affinity:${p.department}`, 1);
      if (typeof p.subcategory === "string" && p.subcategory) tx.hincrby(mk, `subcat_affinity:${p.subcategory}`, 1);
      if (typeof p.colorName === "string" && p.colorName) tx.hincrby(mk, `color_affinity:${baseColorName(p.colorName)}`, 1);
      if (typeof p.size === "string" && p.size) tx.hincrby(mk, `size_affinity:${p.size}`, 1);
      if (typeof p.price === "number") tx.hincrbyfloat(mk, "price_signal_sum", p.price);
    }

    await tx.exec();
  } catch (err) {
    console.error("[telemetry] logEvent failed:", (err as Error).message);
  }
}

/**
 * On login/registration, attribute a guest's anonymous session events to the
 * user: re-plays them into the user's metrics hash and records a stitch marker.
 */
export async function stitchSessionToUser(sessionId: string | null | undefined, userId: string): Promise<number> {
  if (!sessionId) return 0;
  try {
    const redis = getRedis();
    const raw = await redis.lrange(keys.sessionEvents(sessionId), 0, SESSION_LIST_MAXLEN - 1);
    const guestEvents = raw.map((r) => JSON.parse(r) as CustomerEvent).filter((e) => !e.userId);
    if (guestEvents.length === 0) return 0;
    const mk = keys.userMetrics(userId);
    const tx = redis.multi();
    for (const e of guestEvents) {
      const metric = METRIC_FOR_EVENT[e.eventType];
      if (metric) tx.hincrby(mk, metric, 1);
      tx.hincrby(mk, `event:${e.eventType}`, 1);
      if (e.eventType === "product_dwell_time") {
        const secs = Number(e.payload?.seconds ?? 0);
        if (Number.isFinite(secs) && secs > 0) tx.hincrbyfloat(mk, "total_dwell_seconds", Math.min(secs, 3600));
      }
    }
    tx.hincrby(mk, "stitched_guest_events", guestEvents.length);
    tx.xadd(
      keys.telemetryStream, "MAXLEN", "~", String(STREAM_MAXLEN), "*",
      "eventType", "session_stitched", "userId", userId, "sessionId", sessionId,
      "productId", "", "path", "", "payload", JSON.stringify({ stitchedEvents: guestEvents.length }),
      "ts", new Date().toISOString()
    );
    // Rewrite the session list with the userId attached so stitching is idempotent
    tx.del(keys.sessionEvents(sessionId));
    const rewritten = raw.map((r) => {
      const e = JSON.parse(r) as CustomerEvent;
      return JSON.stringify({ ...e, userId: e.userId ?? userId });
    });
    if (rewritten.length) tx.rpush(keys.sessionEvents(sessionId), ...rewritten);
    await tx.exec();
    return guestEvents.length;
  } catch (err) {
    console.error("[telemetry] stitch failed:", (err as Error).message);
    return 0;
  }
}
