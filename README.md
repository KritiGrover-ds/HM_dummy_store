# H&M India Clone — Next.js 15 + Redis (`ioredis`)

A full-stack demo of the H&M India store (`hm.com/en_in`), with Redis as the only database.

- **66 products** across Ladies, Men, Kids, Baby, H&M HOME and Sport (₹499–₹4,999). Every product has several colours and a full size matrix.
- **Atomic stock deduction.** One Lua script checks and decrements every bag line together, so an order either fully succeeds or touches nothing (`409` with the item, colour, size and remaining stock).
- **Live stock in every open tab.** Redis Pub/Sub → `EventEmitter` → Server-Sent Events (`/api/inventory/stream`). Bags clamp themselves when someone else buys the last piece.
- **H&M Member accounts.** Uses only the built-in `crypto` module (scrypt + HMAC-signed `hm_session` cookie), so there is no native bcrypt to compile on Windows. Includes points (1 per ₹50), Member Plus at 800 pts, favourites, saved sizes and an Indian address.
- **Silent ML telemetry.** Events go to Redis Stream `hm:telemetry:stream`, List `hm:telemetry:events`, per-session lists and the per-user feature hash `hm:user:{id}:metrics`. None of it is shown in the customer UI.

---

## 1. Project initialisation (how this project was created)

```bash
npx create-next-app@latest hm-store --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*"
cd hm-store
npm install ioredis lucide-react server-only
npm install -D @types/node
```

(This folder already contains the finished project. Just run `npm install`.)

## 2. Start Redis on `redis://127.0.0.1:6379`

Pick one option:

| Option | Command |
|---|---|
| Docker (any OS) | `docker run -d --name hm-redis -p 6379:6379 redis:7` |
| Windows native | Install **Memurai Developer** (Redis-compatible) from memurai.com. It runs as a service on port 6379. |
| Windows + WSL | `wsl` → `sudo apt install redis-server` → `sudo service redis-server start` |
| macOS | `brew install redis && brew services start redis` |

Check it with `redis-cli ping` → `PONG`.

## 3. Run the store

```bash
npm install
# Optional – defaults already point to redis://127.0.0.1:6379.
# To customise, rename env.example.txt to .env.local and edit it.
npm run dev
```

Open http://localhost:3000. The catalog **auto-seeds on first request** (when `SCARD hm:products:all` is 0). The **"Reset / Re-seed 60+ Demo Inventory"** link in the top bar restocks everything at any time (`POST /api/seed`).

**Demo member:** `member@hm.com` / `hmindia2026`. The login page has a 1-click button for it.

Production build: `npm run build && npm start`.

## 4. Try the real-time features

1. Open the same product (e.g. *Linen-blend Wrap Dress*, size **M**, which has only 1 left) in two browser windows.
2. Add it to the bag in both windows and check out in one of them.
3. The other window updates instantly: the size is crossed out and that bag shows a "just sold out" notice.
4. If the second window still tries to order, the API returns `409 Conflict` and no stock is touched.

## 5. Redis keyspace

| Key | Type | Content |
|---|---|---|
| `hm:product:{slug}` | String (JSON) | Product document |
| `hm:product:id:{id}` | String | id → slug |
| `hm:products:all`, `hm:dept:{dept}` | Set | Product ids |
| `hm:stock:{productId}` | Hash | `"{colour}\|{size}"` → stock, `total` |
| `hm:user:{userId}` | String (JSON) | Member profile |
| `hm:user:email:{email}` | String | email → userId |
| `hm:user:{userId}:wishlist` | Set | Favourite product ids |
| `hm:user:{userId}:metrics` | Hash | ML feature counters (views, dwell seconds, affinities, spend…) |
| `hm:order:{orderId}` | String (JSON) | Order receipt |
| `hm:user:{userId}:orders`, `hm:orders:all` | List | Order ids |
| `hm:telemetry:stream` | Stream | Every shopper event (`XADD`, capped ~100k) |
| `hm:telemetry:events` | List | Same events as JSON (capped 50k) |
| `hm:session:{sessionId}:events` | List | Guest events, stitched to the user on login |
| `hm:recycling:{userId}` | List | Garment Collecting pledges + 15% vouchers |
| `hm:newsletter:subscribers` | Set | Footer newsletter emails |

To export telemetry for model training, run `redis-cli XRANGE hm:telemetry:stream - +` or `redis-cli HGETALL hm:user:usr_demo_member:metrics`.

## 6. Project structure

```
app/
  page.tsx                     Editorial homepage (hero banners, tiles, carousels)
  shop/                        Multi-filter catalog (department, subcategory, size, colour, price, sale, stock, sort, load more)
  products/[slug]/             Multi-photo PDP, colour swatches, live size matrix, size guide, accordions
  checkout/                    Simulated instant checkout (auto-fill, delivery choice, member promo)
  orders/[id]/                 Itemised H&M India tax invoice
  login/ register/ profile/ favourites/ sustainability/
  api/                         seed, products, products/[slug], inventory/stream, orders, orders/[id],
                               auth/{register,login,logout,me}, profile, profile/wishlist,
                               sustainability/recycle, telemetry, newsletter
components/                    Navbar (mega-menu + search), CartDrawer, Footer, ProductCard, ProductImage, SizeGuideModal…
context/                       AuthContext, CartContext
hooks/useInventoryStream.ts    Shared EventSource + live stock store
lib/
  redis.ts                     ioredis singleton, keyspace, Lua deductVariantStockAtomic()
  inventoryEmitter.ts          EventEmitter singleton + Redis Pub/Sub bridge
  auth.ts / password.ts        scrypt + HMAC session cookie, getCurrentUser()
  db.ts                        Data access layer + silent telemetry
  seedData.ts                  66-product deterministic catalog + demo member + optional dummyjson/fakestore photo merge
  catalogConfig.ts             Menus, filter groups, sizes, pricing constants
  telemetryClient.ts           Browser trackEvent()
types/store.ts                 Shared TypeScript interfaces
```

## Notes

- Product photos use plain `<img>` tags, with real H&M CDN and Unsplash URLs. If a URL fails (offline, hotlink blocked), the next photo is tried, and finally a clean H&M studio placeholder is drawn, so no broken-image icons appear.
- When the machine is online, seeding also merges extra product photos from dummyjson.com and fakestoreapi.com into product galleries.
- This is an educational demo. It is not affiliated with H & M Hennes & Mauritz AB, and payment is simulated.
