# APH Interactive — Nuxt 3 + MariaDB (rebuild of `www.aph-ita.co.th`)

A ground-up rewrite of the WordPress/WooCommerce storefront **APH Interactive (aph-ita.co.th)**
as a Nuxt 3 application backed by a **new MariaDB database**, cloning the original
layout / UX / UI and the product catalogue.

> สรุปภาษาไทยอยู่ท้ายไฟล์ — [คลิก](#สรุปภาษาไทย)

---

## 1. What you get

| Area | Implementation |
| --- | --- |
| Frontend | Nuxt 3 (SSR) + custom design system (`assets/css/main.css`), Thai-first typography (IBM Plex Sans Thai) |
| Pages | Home (hero slider, category tiles, promo, services, catalogues, featured products, news), Catalogue (`/products`), Category tree (`/product-category/**`), Product detail, Search, Articles/News, Catalogues, Dealers, About, Contact, Cart, Checkout, 404 |
| API | Nitro server routes (`/api/...`) — products, categories, posts, search, catalogues, dealers, orders, contact, health |
| Database | MariaDB 11 schema (`database/schema.sql`) + generated seed (`database/seed.sql`) + importer that clones the **whole live catalogue** |
| Cart | Client cart with slide-over drawer, quantity control and a checkout that writes to MariaDB (`orders` / `order_items`) |
| Data snapshot | `server/data/catalog.json` — 207 real products / 48 categories / 7 posts harvested from the live site, used automatically when MariaDB is not reachable |

### Design/UX elements cloned from the original
* Dark navy top bar (phone, e-mail, opening hours, LINE) → white sticky header with search + cart.
* Category mega-menu built from the real WooCommerce category tree
  (`XLR → AC/AX/Z Series…`, `Ethernet → XLRnet…`, `Loudspeaker → SP/EP/AP…`, `Multipin`, `RCA`, `Mini XLR`, `Power`, `Dante™`).
* Home sections in the original order: hero slider → 8 category tiles → promo banners →
  “สั่งซื้อออนไลน์ / แหล่งความรู้ / ตัวแทนจำหน่าย” service blocks → “สินค้าแนะนำ” catalogue cards →
  “สินค้าน่าสนใจ” product grid → “ข่าวสารและกิจกรรม” + “สาระน่ารู้” → dealer CTA.
* Product cards with wishlist/quick-view hover actions, `พร้อมส่ง` badges, `สอบถามราคา` when the
  WooCommerce price is 0 (the original store sells most items on quotation).
* Product detail page: gallery, SKU/series meta, quantity, add-to-cart, “ขอใบเสนอราคา”,
  tabs (รายละเอียด / ข้อมูลทางเทคนิค / เอกสารดาวน์โหลด), related products.
* Real contact data (address, phones, LINE, Facebook, Instagram, tax ID) taken from the original *Our Contacts* page.

---

## 2. Quick start

```bash
npm install

# A) Run without a database (bundled snapshot — fastest way to see the UI)
APH_DATA_SOURCE=json npm run dev          # → http://localhost:3000

# B) Run with the new MariaDB database
cp .env.example .env
docker compose up -d db                  # MariaDB 11 on :3306, utf8mb4
npm run db:init                          # CREATE DATABASE + schema
npm run db:seed                          # load the 207-product snapshot
npm run dev                              # badge “MariaDB” appears in the catalogue toolbar
```

`APH_DATA_SOURCE=auto` (default) means: use MariaDB when it answers, silently fall back to
`server/data/catalog.json` when it does not — so the app never white-screens because of a DB outage.

Check which source is live:

```bash
curl -s localhost:3000/api/health
# {"ok":true,"dataSource":"mariadb","time":"…"}
```

---

## 3. Cloning **all** products from the live WordPress site

The committed snapshot contains 207 real SKUs (enough to browse/demo every category).
To mirror the **complete catalogue** (≈ 800 products, all images, descriptions, prices,
categories and blog posts) run the importer **from a machine that can reach aph-ita.co.th**:

```bash
npm run import:wp            # products + categories + posts → MariaDB (idempotent upsert)
npm run import:wp:full       # + mirror images into /public/images/products + JSON dump
```

It uses the public **WooCommerce Store API** (`/wp-json/wc/store/v1/products`) and the
**WP REST API** (`/wp-json/wp/v2/posts`) — no application password needed — paginating
100 records per request with retry/back-off, and writes into MariaDB with
`INSERT … ON DUPLICATE KEY UPDATE` so re-running is safe. Every run is logged in `import_runs`.

Useful env vars: `WP_BASE` (another host/staging copy), `NUXT_DB_*`.

### WordPress → MariaDB mapping

| WordPress / WooCommerce | MariaDB table | Notes |
| --- | --- | --- |
| `product_cat` terms | `categories` (`id`, `parent_id`, `slug`, `name`, `path` rebuilt, `product_count`) | paths derived from the term permalink, e.g. `ethernet/xlrnet` |
| `product` posts + WC meta | `products` (`sku`, `price`, `regular_price`, `in_stock`, `is_featured`, `description`, `datasheet_url`) | `fulltext` index on name/sku/short description |
| product ↔ category links | `product_categories` | composite PK, FK cascade |
| featured image + gallery | `product_images` (`url`, `alt`, `position`, `wp_media_id`) | local path when mirrored with `--images` |
| `post` (news / articles) | `posts` (`kind = news｜article`) | content HTML preserved |
| theme banners / promo blocks | `banners` (`slot = hero｜promo｜service`) | editable without redeploy |
| catalogue PDFs | `catalogs` (`file_url`) | 10 real Amphenol PDFs |
| store locator | `dealers` | sample rows — replace with real dealers |
| WooCommerce orders | `orders` + `order_items` | written by `POST /api/orders` |

The whole schema is `utf8mb4 / utf8mb4_unicode_ci`, InnoDB, with FKs
(`database/schema.sql`). `database/seed.sql` is a plain dump — import it with
`mysql -u aph -p aph_website < database/seed.sql` or phpMyAdmin if you prefer not to use the CLI scripts.

---

## 4. Project structure

```
assets/css/main.css        design system (tokens, layout, components, responsive rules)
components/                AppHeader, AppFooter, HeroSlider, CategoryTiles, ProductCard,
                           ProductGrid, ProductBrowser, SidebarCategories, CartDrawer, …
composables/               useCart (localStorage cart), useSiteData (THB/date helpers, bootstrap)
layouts/default.vue        header + footer + cart drawer + toast + scroll-to-top
pages/                     index, products, product-category/[...slug], product/[slug],
                           search, articles, catalogs, dealers, about, contact, cart, checkout
server/api/                Nitro endpoints
server/utils/              db.ts (mysql2 pool + health probe), store-sql.ts, store-json.ts, repo.ts
server/data/catalog.json   bundled snapshot (source for the JSON fallback)
database/schema.sql        MariaDB schema
database/seed.sql          generated seed (788 statements)
scripts/build-dataset.mjs  txt → catalog.json + seed.sql
scripts/db-init.mjs        CREATE DATABASE + apply schema   (npm run db:init)
scripts/db-seed.mjs        load seed.sql                    (npm run db:seed)
scripts/import-wordpress.mjs  full WordPress → MariaDB importer
docker-compose.yml         MariaDB 11 with utf8mb4 + healthcheck
```

### Data flow

```
aph-ita.co.th  ──(scripts/import-wordpress.mjs)──►  MariaDB  ──(server/utils/store-sql.ts)──►  /api/*  ──►  Nuxt pages
database/seed/*.txt ──(scripts/build-dataset.mjs)──► server/data/catalog.json ──(store-json.ts)──► fallback
```

Both stores implement the same `Store` interface (`server/utils/types.ts`), so pages are agnostic
about the source.

---

## 5. API reference

| Endpoint | Purpose |
| --- | --- |
| `GET /api/bootstrap` | site info + category tree + banners + catalogues (used by layout/pages) |
| `GET /api/products?category=xlr&search=ac3&page=1&perPage=24&sort=newest&featured=1` | paginated catalogue |
| `GET /api/products/:slug` | product + related products |
| `GET /api/categories` | category tree with product counts |
| `GET /api/search?q=xlr` | product + category suggestions |
| `GET /api/posts?kind=news&limit=6` · `GET /api/posts/:slug` | blog / news |
| `GET /api/catalogs` · `GET /api/dealers` | PDF catalogues, dealer list |
| `POST /api/orders` | create order (validates name/phone, writes `orders` + `order_items`) |
| `POST /api/contact` | contact form (logs to server console; wire to SMTP/CRM) |
| `GET /api/health` | `{ ok, dataSource }` |

---

## 6. Production

```bash
npm run build
node .output/server/index.mjs          # honours NUXT_DB_* and APH_DATA_SOURCE
```

Recommended: Node 20/22 behind nginx (or pm2/systemd) with these env vars:

```env
NUXT_DB_HOST=127.0.0.1
NUXT_DB_PORT=3306
NUXT_DB_NAME=aph_website
NUXT_DB_USER=aph
NUXT_DB_PASSWORD=********
APH_DATA_SOURCE=auto
```

---

## 7. Status & known limitations

* **Products:** 207 of ≈ 800 SKUs are included as real data in this repo (names, SKUs, category
  membership, images, Thai descriptions derived from the series copy). Run
  `npm run import:wp` on a connected host for 100 % coverage.
* **Images:** the snapshot hot-links the original WordPress uploads
  (`https://www.aph-ita.co.th/wp-content/uploads/...`). Use `--images` to mirror them locally
  and the DB rows are rewritten to `/images/products/...`.
* **Prices:** the source store publishes `฿0.00` for almost every product (quotation-based B2B).
  The UI therefore shows `สอบถามราคา`; real prices can be filled in `products.price`/`regular_price`.
* **Dealers:** the store-locator rows are sample data (clearly marked on the page) — replace with the
  real dealer network in the `dealers` table.
* **Article bodies:** the snapshot keeps excerpts; full HTML is imported into `posts.content` by the importer.
* **Contact form / order notifications** only write to DB/console — plug in SMTP or a CRM before going live.

---

## สรุปภาษาไทย

โปรเจกต์นี้คือการ **เขียนเว็บใหม่ (rewrite) ให้ www.aph-ita.co.th** จาก WordPress/WooCommerce
มาเป็น **Nuxt 3 (SSR) + MariaDB ฐานข้อมูลใหม่** โดย clone ทั้ง **หน้าตา/UX/UI** และ **ข้อมูลสินค้า**

**เริ่มใช้งานเร็ว**
```bash
npm install
APH_DATA_SOURCE=json npm run dev      # ดูหน้าตาเว็บได้ทันทีโดยไม่ต้องมีฐานข้อมูล
# หรือใช้ MariaDB จริง
cp .env.example .env
docker compose up -d db && npm run db:init && npm run db:seed && npm run dev
```

**ดึงสินค้าทั้งหมดจากเว็บเดิม** (รันบนเครื่องที่เข้าถึง aph-ita.co.th ได้)
```bash
npm run import:wp        # สินค้า + หมวดหมู่ + บทความ → MariaDB
npm run import:wp:full   # เพิ่มดาวน์โหลดรูปสินค้า + dump JSON
```

**สิ่งที่มีให้แล้ว**
* หน้าแรก (สไลเดอร์, การ์ดหมวดหมู่, โปรโมชัน, บริการ, แคตตาล็อก, สินค้าแนะนำ, ข่าวสาร/สาระน่ารู้)
* หน้ารวมสินค้า + หน้ารายหมวดหมู่ (เมกะเมนูตามโครงสร้างหมวดจริง) + หน้าสินค้า (แท็บรายละเอียด/สเปค/ดาวน์โหลด)
* ค้นหา, บทความ/ข่าวสาร, แคตตาล็อก PDF, ตัวแทนจำหน่าย, เกี่ยวกับเรา, ติดต่อเรา, ตะกร้า, ชำระเงิน
* API ฝั่งเซิร์ฟเวอร์ทั้งหมด และ schema MariaDB (`database/schema.sql`) พร้อม seed (`database/seed.sql`)
* ข้อมูลจริง 207 SKU / 48 หมวดหมู่ / 7 บทความ ถ้าฐานข้อมูลไม่พร้อม ระบบจะใช้ snapshot อัตโนมัติ (ไม่ล่ม)

**ข้อควรทราบ**: รูปสินค้าอ้างอิงไฟล์จากเว็บเดิม (ใช้ `--images` เพื่อโหลดมาเก็บในเครื่อง),
ราคาส่วนใหญ่ต้นฉบับเป็น 0 บาท (ขายแบบใบเสนอราคา) จึงแสดง “สอบถามราคา”,
รายชื่อตัวแทนจำหน่ายเป็นข้อมูลตัวอย่าง และฟอร์มติดต่อยังไม่เชื่อมอีเมล
