import "server-only";
import Redis from "ioredis";

// ─────────────────────────────────────────────────────────────────────────────
// Singleton ioredis connection (survives Next.js hot reloads in dev)
// ─────────────────────────────────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

declare global {
  // eslint-disable-next-line no-var
  var redisClient: Redis | undefined;
  // eslint-disable-next-line no-var
  var redisSubscriber: Redis | undefined;
}

function createClient(name: string): Redis {
  const client = new Redis(REDIS_URL, {
    connectionName: name,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 200, 3000),
  });
  client.on("error", (err) => {
    // Keep the log concise – a stopped Redis server otherwise floods the console
    console.error(`[redis:${name}]`, err.message);
  });
  return client;
}

export function getRedis(): Redis {
  if (!globalThis.redisClient) {
    globalThis.redisClient = createClient("hm-main");
  }
  return globalThis.redisClient;
}

/** Separate connection used only for Pub/Sub (a subscribed connection cannot run other commands). */
export function getRedisSubscriber(): Redis {
  if (!globalThis.redisSubscriber) {
    globalThis.redisSubscriber = createClient("hm-subscriber");
  }
  return globalThis.redisSubscriber;
}

export const redis = getRedis();

// ─────────────────────────────────────────────────────────────────────────────
// Key helpers – single source of truth for the Redis keyspace
// ─────────────────────────────────────────────────────────────────────────────

export const keys = {
  product: (slug: string) => `hm:product:${slug}`,
  productById: (id: string) => `hm:product:id:${id}`,
  productsAll: "hm:products:all",
  dept: (department: string) => `hm:dept:${department}`,
  stock: (productId: string) => `hm:stock:${productId}`,
  user: (userId: string) => `hm:user:${userId}`,
  userByEmail: (email: string) => `hm:user:email:${email.trim().toLowerCase()}`,
  userWishlist: (userId: string) => `hm:user:${userId}:wishlist`,
  userMetrics: (userId: string) => `hm:user:${userId}:metrics`,
  userOrders: (userId: string) => `hm:user:${userId}:orders`,
  order: (orderId: string) => `hm:order:${orderId}`,
  ordersAll: "hm:orders:all",
  telemetryStream: "hm:telemetry:stream",
  telemetryEvents: "hm:telemetry:events",
  sessionEvents: (sessionId: string) => `hm:session:${sessionId}:events`,
  recycling: (userId: string) => `hm:recycling:${userId}`,
  newsletter: "hm:newsletter:subscribers",
  inventoryChannel: "hm:inventory:channel",
};

export const stockField = (colorName: string, size: string) => `${colorName}|${size}`;

// ─────────────────────────────────────────────────────────────────────────────
// Atomic multi-item stock deduction (Lua – runs as one isolated Redis operation)
//
// KEYS[i]          = hm:stock:{productId} for line i
// ARGV[2i-1]       = field "${colorName}|${size}" for line i
// ARGV[2i]         = quantity requested for line i
//
// Phase 1: verify EVERY line has enough stock. If any line fails → return
//          {0, failingIndex, remaining} and touch nothing.
// Phase 2: HINCRBY every field and the "total" field by -qty.
// Returns  {1} on success.
// ─────────────────────────────────────────────────────────────────────────────

const DEDUCT_STOCK_LUA = `
local n = #KEYS
for i = 1, n do
  local field = ARGV[(i - 1) * 2 + 1]
  local qty = tonumber(ARGV[(i - 1) * 2 + 2])
  local current = tonumber(redis.call('HGET', KEYS[i], field) or '-1')
  if current == nil or current < 0 then
    return {0, i, -1}
  end
  if current < qty then
    return {0, i, current}
  end
end
for i = 1, n do
  local field = ARGV[(i - 1) * 2 + 1]
  local qty = tonumber(ARGV[(i - 1) * 2 + 2])
  redis.call('HINCRBY', KEYS[i], field, -qty)
  redis.call('HINCRBY', KEYS[i], 'total', -qty)
end
return {1}
`;

export interface StockDeductionLine {
  productId: string;
  colorName: string;
  size: string;
  quantity: number;
}

export type StockDeductionResult =
  | { ok: true }
  | {
      ok: false;
      failedLine: StockDeductionLine;
      remaining: number; // -1 if the variant does not exist
    };

/**
 * Verifies and decrements stock for all cart lines in ONE atomic Redis script.
 * Duplicate lines for the same productId+color+size are merged first so the
 * check is performed against the combined quantity.
 */
export async function deductVariantStockAtomic(
  lines: StockDeductionLine[]
): Promise<StockDeductionResult> {
  const merged = new Map<string, StockDeductionLine>();
  for (const line of lines) {
    const qty = Math.floor(Number(line.quantity));
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const k = `${line.productId}::${stockField(line.colorName, line.size)}`;
    const existing = merged.get(k);
    if (existing) existing.quantity += qty;
    else merged.set(k, { ...line, quantity: qty });
  }
  const mergedLines = Array.from(merged.values());
  if (mergedLines.length === 0) {
    return { ok: true };
  }

  const scriptKeys = mergedLines.map((l) => keys.stock(l.productId));
  const scriptArgs: string[] = [];
  for (const l of mergedLines) {
    scriptArgs.push(stockField(l.colorName, l.size), String(l.quantity));
  }

  const result = (await getRedis().eval(
    DEDUCT_STOCK_LUA,
    scriptKeys.length,
    ...scriptKeys,
    ...scriptArgs
  )) as number[];

  if (Number(result[0]) === 1) return { ok: true };

  const failedIndex = Number(result[1]) - 1;
  return {
    ok: false,
    failedLine: mergedLines[failedIndex],
    remaining: Number(result[2]),
  };
}

/** Puts stock back (used if order persistence fails after a successful deduction). */
export async function restoreVariantStock(lines: StockDeductionLine[]): Promise<void> {
  const pipeline = getRedis().multi();
  for (const l of lines) {
    pipeline.hincrby(keys.stock(l.productId), stockField(l.colorName, l.size), l.quantity);
    pipeline.hincrby(keys.stock(l.productId), "total", l.quantity);
  }
  await pipeline.exec();
}
