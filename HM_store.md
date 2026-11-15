# Claude Prompts: Full-Stack H&M India Clone (`hm.com/en_in`) Powered by Redis (`ioredis`) with 60+ Real-Photo Garments, Atomic Redis Stock Deduction, H&M Member Profiles & Silent Redis Stream ML Telemetry

Because we are using **Redis** (`redis://127.0.0.1:6379` via `ioredis`) as our sole open-source non-relational (NoSQL) database instead of MongoDB, pass these **4 sequential prompts** to **Claude** one by one. This guarantees Claude writes **100% complete, un-truncated files** at every step without hitting output limits.

---

## Prompt 1 of 4: Redis Architecture (`ioredis`), Data Models, Atomic Lua/Hash Inventory & Large 60+ Item Real-Photo H&M India Seed Catalog

Copy and paste **Prompt 1** into Claude to start the project:

```text
Act as a Principal Full-Stack Engineer and Fashion E-Commerce Architect. We are building a production-grade, 100% functional full-stack clone of the H&M India online store (https://www2.hm.com/en_in/index.html) from frontend to backend using Next.js (App Router, TypeScript), Tailwind CSS, and **Redis** (`ioredis` connected to `redis://127.0.0.1:6379`) as our primary open-source non-relational (NoSQL) database (NO MongoDB).

### Strict Engineering, Redis Data Modeling & Real Fashion Photo Guardrails
1. **Zero Skeleton Code or Placeholders:** Never output `// ... rest of code` or skip logic. We will build this in 4 sequential phases. Only output Phase 1 now and wait for me to say **"Continue to Phase 2"**.
2. **Redis Keyspace & Native Data Structures (`lib/redis.ts` & `lib/db.ts`):**
   - Connect to `process.env.REDIS_URL || 'redis://127.0.0.1:6379'` using `ioredis` (singleton cached on `globalThis.redisClient`).
   - Store and index all entities cleanly in Redis:
     * **Products (`hm:product:{slug}`, `hm:product:id:{id}`, `hm:products:all` Set, `hm:dept:{department}` Set):** JSON document for product metadata + **dedicated Redis Hash `hm:stock:{productId}`** mapping field `"${colorName}|${size}"` -> integer stock count (and `"total"` -> total stock) so stock checks and deductions use ultra-fast atomic Redis `HINCRBY` / Lua scripts!
     * **Users (`hm:user:{userId}`, `hm:user:email:{email}` -> `userId`):** Stores user profile, shipping address, saved sizes, H&M Member points, Favourites Set (`hm:user:{userId}:wishlist`), and **silent ML feature vector Hash (`hm:user:{userId}:metrics`)**.
     * **Orders (`hm:order:{orderId}`, `hm:user:{userId}:orders` List, `hm:orders:all` List):** Full JSON order receipts.
     * **Silent ML Behavioral Telemetry (`hm:telemetry:stream` Redis Stream via `XADD` / `hm:telemetry:events` List + `hm:session:{sessionId}:events` List):** Every shopper interaction is silently appended to Redis Streams/Lists and atomically increments user feature counters via `HINCRBY` / `HINCRBYFLOAT` on `hm:user:{userId}:metrics`!
     * **Garment Recycling Submissions (`hm:recycling:{userId}` List):** Stores H&M Garment Collecting pledges and vouchers.
3. **Large Clothing Catalog (60+ Products Across All Departments) with Real Website Photography:**
   - Seed **at least 60 distinct products** across **Ladies** (Dresses, Tops & T-shirts, Shirts & Blouses, Sweatshirts & Hoodies, Cardigans & Knitwear, Blazers & Coats, Jeans & Trousers, Skirts & Co-ords), **Men** (Oversized T-shirts, Linen & Casual Shirts, Hoodies & Sweatshirts, Baggy Jeans & Cargo Trousers, Jackets & Blazers, Polo Shirts), **Kids & Baby** (2-8Y & 9-14Y Party Edit, Cotton Sets, Rompers, Denim), **H&M HOME** (Linen Cushion Covers, Duvet Sets, Ceramic Vases, Scented Candles, Cotton Rugs), and **Sport (H&M Move)** (DryMove™ Tops, Running Shorts, Leggings, Track Jackets).
   - **Real Fashion Photography URLs:** Every product and color variant MUST use real, working fashion photography URLs from real websites:
     * Include verified H&M CDN product photos (`https://image.hm.com/assets/hm/44/41/4441a5d9fdcd08f8f20bdc053b3c56315ad3cc73.jpg`, `https://image.hm.com/assets/hm/06/df/06df38688f55c98a9e495f9bd134ece30f9a7dfa.jpg`, `https://image.hm.com/assets/hm/71/f6/71f6be8b8e84ce35f97fea1110c3e60d49682333.jpg`, `https://image.hm.com/assets/hm/b7/98/b798ee7ab8aab81ea7848ee44d88b6cc903f0051.jpg`, `https://image.hm.com/assets/hm/f3/c0/f3c0faec31fe4c47e4b7a2f3c7fe6a93849d5864.jpg`, `https://image.hm.com/assets/hm/8c/e3/8ce3a71d4099fabf2a0ee1c203e04de96cd0316e.jpg`, `https://image.hm.com/assets/hm/12/c8/12c8ecd2cc4a4cbc09e5f872b9ba29d5b0efd2a3.jpg`, `https://image.hm.com/assets/hm/fa/54/fa546f3726ef09738098b74056f3e6cab12678ee.jpg`, `https://image.hm.com/assets/hm/be/3a/be3ade6b98cf62f86cf380faf60f2548050be9f3.jpg`, `https://image.hm.com/assets/hm/59/a9/59a91313f507b1d8cb08f2ee1a67303aeac9c189.jpg`, `https://image.hm.com/assets/hm/bf/9a/bf9a30d5be82a9823f7c0215c7b602b0d23205ef.jpg`), curated high-fashion editorial Unsplash studio photography (`https://images.unsplash.com/photo-...` with `?auto=format&fit=crop&w=900&q=85`), AND in `lib/seedData.ts` also support fetching & merging real fashion product photos from `https://dummyjson.com/products/category/womens-dresses`, `womens-tops`, `mens-shirts`, and `https://fakestoreapi.com/products` if online!
     * Always render product images using standard `<img>` tags (no `next/image` domain whitelist errors) with a second hover lookbook angle (`hoverImageUrl`) and an `onError` studio garment fallback so zero broken image icons ever appear.
4. **Next.js 15+ Async API Compliance:** Always `await params`, `await searchParams`, and `await cookies()` in all dynamic pages and route handlers.
5. **Silent Background ML Behavioral Telemetry (Redis Only — Zero UI Clutter):** Capture every customer interaction into Redis (`hm:telemetry:stream` via `XADD`, `hm:telemetry:events`, and `hm:user:{userId}:metrics`). **Never** show raw telemetry or CSV/JSON export buttons in the customer UI—keep tracking 100% silent in Redis for future ML model / AI agent training.
6. **Zero-Dependency Windows-Safe Auth:** Use Node.js built-in `crypto` (`scryptSync`, `randomBytes`, `timingSafeEqual`, and HMAC-SHA256 HTTP-only cookie `hm_session`) in `lib/auth.ts`—do NOT use native C++ `bcrypt`.

### Phase 1 Deliverables (Generate 100% Complete Files Now)

1. **Project Initialization Commands:**
   - Exact terminal commands to initialize the Next.js TypeScript + Tailwind project and install `ioredis` and `lucide-react` (and `@types/node`).

2. **Core Redis & Auth Infrastructure (`lib/redis.ts`, `lib/inventoryEmitter.ts`, `lib/auth.ts`, `types/store.ts`):**
   - `lib/redis.ts`: Cached `ioredis` connection to `redis://127.0.0.1:6379` + atomic Lua script helper `deductVariantStockAtomic()` that verifies stock for all cart items (`hm:stock:{productId}` field `"${colorName}|${size}"`) and decrements them atomically in a single Redis transaction (so partial multi-item orders never corrupt stock!).
   - `lib/inventoryEmitter.ts`: Global `EventEmitter` singleton (`globalThis.hmInventoryEmitter`) + Redis Pub/Sub bridge for real-time Server-Sent Events (`/api/inventory/stream`).
   - `types/store.ts`: Complete TypeScript interfaces for `Product`, `ProductVariant`, `User`, `UserBehaviorMetrics`, `Order`, `CustomerEvent`, and `GarmentRecyclingSubmission`.
   - `lib/auth.ts`: Password hashing (`scryptSync`), HMAC session token signing, and `getCurrentUser()` helper reading `hm_session` via `await cookies()` and fetching `hm:user:{userId}` from Redis.

3. **Redis Data Access Layer (`lib/db.ts`):**
   - Clean helper functions for querying/filtering products from Redis (hydrating live variant stock from `hm:stock:{productId}`), creating/updating users, saving orders, toggling wishlist sets (`SADD`/`SREM` on `hm:user:{userId}:wishlist`), and logging silent telemetry events (`XADD hm:telemetry:stream * ...` + `LPUSH hm:telemetry:events ...` + atomic `HINCRBY` on `hm:user:{userId}:metrics`).

4. **Large 60+ Item H&M India Seed Catalog (`lib/seedData.ts`):**
   - Deterministic catalog generator + curated dataset inside `lib/seedData.ts` that seeds **at least 60 distinct, realistic H&M India products** across **Ladies**, **Men**, **Kids**, **Baby**, **H&M HOME**, and **Sport** in Indian Rupees (`₹499` to `₹4,999`) with real H&M CDN and curated Unsplash fashion photography URLs, multiple color variants per product, complete size matrices (`XS, S, M, L, XL` or `28, 30, 32, 34` or `2-4Y, 4-6Y, 6-8Y` or `One Size`), and realistic stock counts in `hm:stock:{productId}` (including some sizes with `stock: 2` and `stock: 1` for real-time sell-out testing).
   - Also seeds the demo H&M Member account (`member@hm.com` / `hmindia2026`).

Generate all Phase 1 files completely now.
```

---

## Prompt 2 of 4: Backend API Routes Powered by Redis, Atomic Lua Stock Deduction, SSE Stream & Silent Redis Telemetry

Once Claude finishes Prompt 1, copy and paste **Prompt 2**:

```text
Continue to Phase 2: Generate all Redis-backed Backend API Routes in full detail with zero placeholders.

### Phase 2 Deliverables (Generate 100% Complete Files Now)

1. **`app/api/seed/route.ts` (`POST`):**
   - Resets and seeds the full 60+ item H&M India catalog and demo member account into Redis, and broadcasts a `{ type: 'SEED_RESET' }` event via `hmInventoryEmitter`.

2. **`app/api/products/route.ts` (`GET`) & `app/api/products/[slug]/route.ts` (`GET`):**
   - Auto-runs `seedDatabase()` if `SCARD hm:products:all === 0` on first boot!
   - Hydrates live variant size stocks from `HGETALL hm:stock:{productId}` on every read.
   - Supports filtering across the 60+ items by `department` (`ladies`, `men`, `kids`, `baby`, `home`, `sport`), `subcategory` (e.g., `Dresses`, `Tops & T-shirts`, `Shirts & Blouses`, `Hoodies & Sweatshirts`, `Jeans & Trousers`, `Jackets & Blazers`, etc.), `isSale=true`, `isNewArrival=true`, `size` (matches products where that size has `stock > 0`), `color`, `minPrice`, `maxPrice`, `inStockOnly=true`, keyword `search` (matches title, subcategory, articleNumber, composition), `sort` (`newest`, `price_asc`, `price_desc`, `bestsellers`), and optional `limit` / `page` pagination with total count metadata (`{ products, totalCount, facets }`).

3. **`app/api/inventory/stream/route.ts` (`GET`):**
   - Export `export const dynamic = 'force-dynamic'` and `export const runtime = 'nodejs'`.
   - Streams Server-Sent Events (`STOCK_UPDATE` with `{ productId, slug, variants, totalStock }` and `SEED_RESET`) to all connected browsers with a 15-second heartbeat comment.

4. **`app/api/orders/route.ts` (`POST`) & `app/api/orders/[id]/route.ts` (`GET`):**
   - **Atomic Redis Lua Variant Stock Deduction:**
     * Calls `deductVariantStockAtomic()` in Redis so all cart items (`{ productId, colorName, size, quantity }`) are checked and decremented atomically inside Redis. If any item lacks sufficient stock for its chosen `colorName + size`, zero items are decremented and the API returns `409 Conflict` with the exact item name, color, size, and remaining stock.
   - Calculates H&M Member discount (free delivery for orders `>= ₹1,999` or `Member Plus` tier, plus `10%` member promo option), awards H&M Loyalty Points (`1 point per ₹50 spent`, auto-upgrading user to `'Member Plus'` at `800` points), saves the `Order` in Redis (`hm:order:{orderId}` and `LPUSH hm:user:{userId}:orders`), logs `purchase_completed` into `hm:telemetry:stream`, updates `hm:user:{userId}:metrics` silently, and broadcasts `STOCK_UPDATE` via `hmInventoryEmitter`.

5. **Authentication & H&M Member Profile API Routes:**
   - `app/api/auth/register/route.ts` (`POST`), `app/api/auth/login/route.ts` (`POST` — auto-provisions `member@hm.com` / `hmindia2026` if not found and stitches guest `hm:session:{sessionId}:events` logs to `userId`), `app/api/auth/logout/route.ts` (`POST`), `app/api/auth/me/route.ts` (`GET`).
   - `app/api/profile/route.ts` (`GET` returns user + orders + recycling vouchers from Redis; `PUT` updates name, phone, saved sizes, preferred department, and Indian PIN-code shipping address).
   - `app/api/profile/wishlist/route.ts` (`POST` toggles `productId` in Redis Set `hm:user:{userId}:wishlist`).
   - `app/api/sustainability/recycle/route.ts` (`POST` logs a Garment Collecting drop-off pledge in Redis, grants +50 H&M Member points and a 15% digital voucher).

6. **Silent Behavioral Telemetry Ingestion (`app/api/telemetry/route.ts` - `POST`):**
   - Silently appends incoming client events (`product_view`, `product_dwell_time`, `color_swatch_selected`, `size_selected`, `size_guide_opened`, `search_query`, `filter_applied`, `wishlist_toggle`, `cart_add`, `cart_remove`, `cart_quantity_change`, `checkout_started`) into Redis Stream `hm:telemetry:stream` (`XADD`) and List `hm:telemetry:events` (`LPUSH`), and atomically updates `hm:user:{userId}:metrics` via `HINCRBY` / `HINCRBYFLOAT`.

Generate all Phase 2 files completely now.
```

---

## Prompt 3 of 4: Frontend Contexts, Real-Photo Lookbook Product Card, Mega-Menu Header, Cart Drawer & H&M India Homepage

Once Claude finishes Prompt 2, copy and paste **Prompt 3**:

```text
Continue to Phase 3: Generate the Frontend Contexts, Silent Telemetry Hook, Real-Photo Product Image Renderer, Mega-Menu Navigation Header, Slide-Over Shopping Bag, and H&M India Homepage (`/`).

### Phase 3 Deliverables (Generate 100% Complete Files Now)

1. **Silent Telemetry Client (`lib/telemetryClient.ts`) & Real-Time Inventory Hook (`hooks/useInventoryStream.ts`):**
   - `lib/telemetryClient.ts`: Maintains persistent `hm_session_id` in `localStorage` and sends non-blocking `trackEvent(eventType, payload)` calls to `POST /api/telemetry`.
   - `hooks/useInventoryStream.ts`: Subscribes to `/api/inventory/stream` via `EventSource` and keeps product variant stocks (`colorName + size`) updated in real time across the UI without page refreshes.

2. **`context/AuthContext.tsx` & `context/CartContext.tsx`:**
   - `AuthContext`: Manages H&M Member session, Favourites (`wishlist` heart toggle with silent telemetry), and Member Points.
   - `CartContext`: Hydration-safe `localStorage` cart keyed by composite `variantKey = ${productId}_${colorName}_${size}`. Automatically listens to SSE `STOCK_UPDATE` events to clamp cart quantities if another buyer purchases the last item of that color/size! Emits silent `cart_add`, `cart_remove`, and `cart_quantity_change` telemetry with a full `cartSnapshot`.

3. **Real-Photo Lookbook Renderer & Product Card (`components/ProductImage.tsx` & `components/ProductCard.tsx`):**
   - Renders real high-resolution fashion photos (`variant.imageUrl` or `product.primaryImageUrl`) using standard `<img>` tags in H&M's signature 3:4 portrait aspect ratio (`aspect-[3/4] object-cover`), switching to `hoverImageUrl` on mouse hover!
   - When a shopper clicks any color swatch dot (`colorHex`) on the card, the photo immediately updates to that color variant's `imageUrl`, and displays live stock status (*"Only 2 left"*, *"New Arrival"*, *"SALE -35%"*, or *"Sold Out"*).
   - Includes a built-in `onError` fallback so even if a user is offline or an external image URL is slow, it gracefully renders a clean H&M studio lookbook placeholder rather than a broken image icon.

4. **H&M India Header with Department Mega-Menu, Search Modal & Slide-Over Shopping Bag (`components/Navbar.tsx`, `components/CartDrawer.tsx`, `components/Footer.tsx`):**
   - Top utility bar: *"Free shipping for H&M Members on orders above ₹1,999 | Flat 25% Off Selected Styles | Estimated delivery: 2–5 days across India"* + working **"Reset / Re-seed 60+ Demo Inventory"** button.
   - Iconic centered red **`H&M`** logo (`#E50010`), clean navigation links (**Ladies**, **Men**, **Kids**, **Baby**, **H&M HOME**, **Sport**, **Sale**, **Sustainability**) with a hover/click **Subcategory Mega-Menu** (e.g., clicking *Ladies → Dresses*, *Tops & T-shirts*, *Shirts & Blouses*, *Jeans & Trousers*, *Blazers & Jackets*, *Knitwear*).
   - Right action icons: **Sign In / H&M Member (`memberPoints` pts)**, **Favourites (`wishlist` count)**, **Search Modal** (instant live search across all 60+ items by title, dress style, or 10-digit article number), and **Shopping Bag Drawer**.
   - Footer with working Newsletter subscription and department links.

5. **H&M India Editorial Homepage (`app/page.tsx`) & Root Layout (`app/layout.tsx`):**
   - Full-bleed H&M India campaign hero banners with real editorial fashion photography (*"The Dress & Linen Edit — Starting at ₹799"*, *"New Season Menswear & Baggy Denim"*, *"Kids Festive & Everyday Essentials"*).
   - Quick subcategory visual tiles (**Dresses**, **Tops & Tees**, **Linen Edit**, **Shirts**, **Hoodies**, **Denim**, **H&M HOME**).
   - Interactive **New Arrivals**, **Trending Dresses & Tops**, and **Bestsellers** product grids/carousels with live color swatch dots, Favourites heart toggle, and live low-stock badges.

Generate all Phase 3 files completely now.
```

---

## Prompt 4 of 4: Multi-Filter Catalog (`/shop`), Multi-Photo Product Detail Page, Size Guide, Checkout, Receipt & H&M Member Profile

Once Claude finishes Prompt 3, copy and paste **Prompt 4**:

```text
Continue to Phase 4: Generate the remaining Catalog, Multi-Photo Product Detail Page, Size Guide Modal, Simulated Checkout, Order Receipt, Sustainability Page, and Clean Customer Profile pages in full detail.

### Phase 4 Deliverables (Generate 100% Complete Files Now)

1. **Interactive Department & Subcategory Catalog (`app/shop/page.tsx`):**
   - Displays the 60+ item catalog with instant filtering by **Department** (`Ladies`, `Men`, `Kids`, `Baby`, `H&M HOME`, `Sport`), **Subcategory** pill tabs (`All`, `Dresses`, `Tops & T-shirts`, `Shirts & Blouses`, `Hoodies & Sweatshirts`, `Jeans & Trousers`, `Jackets & Blazers`, `Knitwear & Cardigans`, `Skirts & Co-ords`, `Home & Living`, `Activewear`), **Size** (`XS` to `XL`, `28` to `34`, `One Size`), **Color Swatch**, **Price Range (`₹`)**, **On Sale Only**, **In-Stock Only**, and **Sort By** (*Newest*, *Price: Low to High*, *Price: High to Low*, *Bestsellers*).
   - Includes a **"Load More Products"** or view-all toggle and live item counter.

2. **Multi-Photo Product Detail Page (`app/products/[slug]/page.tsx`) & Interactive Size Guide Modal (`components/SizeGuideModal.tsx`):**
   - Left column: H&M-style 2-up lookbook photo gallery showing the selected variant's real fashion photos (`imageUrl`, `hoverImageUrl`, and `galleryImages`).
   - Right sticky column: 10-digit H&M **Article Number**, `₹` price (plus Member Price / Sale discount tag), and **Conscious Choice Sustainability Badge**.
   - **Interactive Color Swatch Selector (with Thumbnail Previews):** Switching color updates the photo gallery and available size matrix, and logs `color_swatch_selected` silently.
   - **Interactive Size Matrix Selector (`XS`, `S`, `M`, `L`, `XL`, etc.):** Shows exact live stock per size (*"Only 2 left"*, *"In Stock"*, or crossed-out *"Out of Stock"*). Selecting a size logs `size_selected` silently.
   - **Working Size Guide Modal:** Opens an Indian/International chest, waist, and hip measurement conversion chart (cm/inches) and recommends a size based on the user's saved profile measurements (logs `size_guide_opened` silently).
   - **"Add to Bag"** button (disabled if selected size has `0` stock) + **"Save to Favourites"** button + expandable accordions for **Description & Fit**, **Material & Sustainability**, and **Delivery & Returns in India** + **"Complete the Look / Similar Styles"** grid below.
   - Tracks `product_view` on mount and `product_dwell_time` (seconds) on unmount.

3. **Simulated Instant Checkout (`app/checkout/page.tsx`) & Order Receipt (`app/orders/[id]/page.tsx`):**
   - Auto-fills customer name, email, phone, and Indian shipping address (Street, Locality, City, State, 6-digit PIN code) from `useAuth().user` if logged in.
   - Lets the shopper select **Standard Delivery** or **Express Delivery**, apply H&M Member discount, and click **"Complete Order (Simulated Instant Payment — ₹)"**.
   - Calls `POST /api/orders`, deducts variant size stock atomically in Redis, broadcasts the live SSE stock update to all open tabs, and redirects to `/orders/[id]` showing the itemized H&M India tax invoice with product thumbnails, Article Numbers, chosen Color/Size, and H&M Member points earned.

4. **H&M Member Login, Register & Clean Customer Profile (`app/login/page.tsx`, `app/register/page.tsx`, `app/profile/page.tsx`, `app/favourites/page.tsx`, `app/sustainability/page.tsx`):**
   - `/login` & `/register`: Includes a 1-click **"Fill Demo H&M Member (`member@hm.com`)"** button.
   - `/profile`: **Strictly customer-facing** (NO raw telemetry logs or CSV/JSON export buttons!). Features digital **H&M Member Card** (showing Member ID, points balance, progress bar toward `800 pts` *Member Plus* status) and 4 clean tabs:
     1. **My Profile, Saved Sizes & Shipping Address** (`PUT /api/profile` — saves preferred top/bottom/shoe sizes and Indian PIN code address)
     2. **My Purchases & Receipts** (order history with product photos and links to `/orders/[id]`)
     3. **My Favourites / Wishlist** (saved garments with quick color/size **"Move to Bag"**)
     4. **H&M Club Rewards & Garment Collecting Vouchers**
   - `/sustainability`: Interactive **H&M Garment Collecting & Conscious Choice** page where users can log a bag of old clothes to recycle (`POST /api/sustainability/recycle`) and immediately earn `+50 H&M Member Points` and a `15% Off` voucher.

Generate all Phase 4 files completely now.
```