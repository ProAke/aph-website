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
| Migration tooling | Delta sync, parity checker, edge canary router (nginx + Cloudflare) and an app-level WordPress compatibility layer — see [§6](#6-zero-downtime-migration-wordpress-stays-live) |

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
plugins/                   canonical.ts — one canonical per page + private-page noindex
server/middleware/         legacy-compat.ts, seo-guard.ts (staging noindex), trailing slash, ?s=, ?add-to-cart
server/plugins/            legacy-origin-guard.ts — warns at boot if NUXT_LEGACY_ORIGIN is missing
server/routes/             sitemap.xml, sitemap_index.xml, robots.txt, wp-content/uploads proxy
server/utils/              db.ts (mysql2 pool + health probe), store-sql.ts, store-json.ts, repo.ts
server/data/catalog.json   bundled snapshot (source for the JSON fallback)
database/schema.sql        MariaDB schema
database/seed.sql          generated seed (788 statements)
scripts/build-dataset.mjs  txt → catalog.json + seed.sql
scripts/db-init.mjs        CREATE DATABASE + apply schema   (npm run db:init)
scripts/db-seed.mjs        load seed.sql                    (npm run db:seed)
scripts/import-wordpress.mjs  full WordPress → MariaDB importer
scripts/sync-wordpress.mjs    incremental delta sync (watermarks, soft-deletes, image mirror)
scripts/sync-health.mjs       freshness probe for monitoring/cron alerts
scripts/parity-check.mjs      old-vs-new URL parity checker (status/title/h1/text similarity)
scripts/gen-edge-rules.mjs    generates the edge canary config for a given rollout %
scripts/db-migrate.mjs        applies database/migrations/*.sql (idempotent)
deploy/environments.json      one host / many host names: port, DB, release paths, indexable flags
deploy/deploy.sh              atomic per-environment deploy (blue/green on www, auto-rollback)
deploy/refresh-db.sh          copy the production DB into a sub-domain DB (dry-run by default)
deploy/install-subdomains.sh  installs all vhosts + certs + systemd instances (dry-run by default)
deploy/nginx/aph-edge.conf    WordPress ⇄ Nuxt router with automatic fallback + instant rollback
deploy/cloudflare/worker.js   same router as a Cloudflare Worker
docs/MIGRATION-ZERO-DOWNTIME.md  full migration runbook (Thai)
docs/SUBDOMAIN-SETUP.md       staging/uat sub-domains, noindex layers
docs/DEPLOY-MULTI-DOMAIN.md   deploying several domains from one host (Thai)
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
| `GET /api/products/by-id/:id` | used by the compatibility layer for old `?add-to-cart=<id>` links |
| `GET /api/health` | `{ ok, dataSource }` |

Non-API routes that keep the migration invisible:
`/sitemap.xml`, `/sitemap_index.xml` (same URL set as Yoast), `/robots.txt`,
`/wp-content/uploads/**` (served from the local mirror or proxied to the legacy origin).

---

## 6. Zero-downtime migration (WordPress stays live)

The rewrite is **not** a big-bang switch. WordPress keeps serving production while the new stack
is fed from it, and the cut-over is a single routing decision at the edge.

```
                 ┌───────────────────────────────┐
 user / Google → │ Edge (nginx or Cloudflare)    │  one knob: --rollout 0…100
                 │ sticky cookie · 5xx → WP      │  rollback < 1 second
                 └───────┬───────────────┬───────┘
                  rollout│               │rest
                         ▼               ▼
              Nuxt 3 :3000  ⇠sync 5min⇢  WordPress + MySQL (untouched)
                         │
                         ▼
                  MariaDB «aph_website» (new)
```

**Six rules** (details + runbook in **[docs/MIGRATION-ZERO-DOWNTIME.md](docs/MIGRATION-ZERO-DOWNTIME.md)**):

1. WordPress is the source of truth until T0 — data only ever flows *into* MariaDB via the REST API.
2. The production WordPress database is never touched (no direct MySQL access, read-only REST).
3. One switch (`$aph_rollout`) decides the split; no DNS shuffling, no config drift.
4. Every existing URL/behaviour keeps working (`/product/x/`, `?s=`, `?add-to-cart=`, `/wp-content/uploads/…`).
5. Every step is reversible in under a minute; idempotent GETs fall back to WordPress on 5xx,
   POSTs never do (no double orders).
6. Go/No-Go is decided by numbers: parity diff ≤ 5 %, zero FAILs, 5xx ≤ baseline, conversion ±5 %.

### Phases

| Phase | When | Command / artifact |
| --- | --- | --- |
| 0 · Baseline + freeze | T−3 weeks | snapshot WP DB/files, GA4 + Search Console baseline |
| 1 · Staging sub-domain (private, noindex) | T−2 weeks | `deploy/nginx/subdomain.conf` + `npm run check:staging` — see [docs/SUBDOMAIN-SETUP.md](docs/SUBDOMAIN-SETUP.md) |
| 2 · Delta sync every 5 min | from phase 1 | `npm run sync` (cron), `npm run sync:health` (alerting) |
| 3 · Parity + UAT | T−1 week | `npm run parity -- --old … --new … --limit 400` |
| 4 · Canary 1 → 5 → 25 → 50 → 100 % | T−1 day | `npm run edge:gen -- --rollout 5` + `nginx -s reload` |
| 5 · Cut-over runbook | T0 | `npm run sync -- --full` → parity → `--rollout 100` |
| 6 · Rollback (rehearsed) | any time | `npm run edge:gen -- --rollout 0` (< 1 s) |
| 7 · Post-cutover / decommission | T+1 … T+30 | drop `NUXT_LEGACY_ORIGIN` after WordPress is retired |

### Staging on a sub-domain (`new.aph-ita.co.th`)

A sub-domain is the safe place to *rehearse* the cut-over — it is **not** the cut-over itself: serving real
visitors there would change the URL, split cookies/cart sessions and split SEO authority.
The repo ships the vhost, the guard and a checker:

```bash
sudo cp deploy/nginx/subdomain.conf /etc/nginx/sites-available/new.aph-ita.co.th
sudo certbot --nginx -d new.aph-ita.co.th --redirect
NUXT_PUBLIC_ROBOTS_NOINDEX=1 npm run build        # X-Robots-Tag + meta robots + robots.txt
npm run check:staging -- --url https://new.aph-ita.co.th --auth aph:secret
```

`NUXT_PUBLIC_ROBOTS_NOINDEX=1` is a three-layer guard (header, meta tag, `Disallow: /`), so a
half-finished staging build can never compete with the live WordPress site.

The chosen setup is **two** sub-domains, both declared in [`deploy/environments.json`](deploy/environments.json):

| host | who | mode | port | password | noindex |
| --- | --- | --- | --- | --- | --- |
| `staging.aph-ita.co.th` | dev/QA, technical customers | `staging` | 3000 | ✅ Basic Auth | ✅ 4 layers |
| `uat.aph-ita.co.th` | customer / sales sign-off | `uat` | 3010 | — (shared link) | ✅ 4 layers |

```bash
npm run vhost:gen -- --all                   # renders both vhosts (refuses indexable:true)
./deploy/install-subdomains.sh               # dry-run: shows every command
sudo ./deploy/install-subdomains.sh --apply  # nginx + certbot + systemd aph-nuxt@3000/@3010
npm run check:staging -- --url https://uat.aph-ita.co.th
```

Env files per instance live in `deploy/env/`; `NUXT_PUBLIC_ROBOTS_NOINDEX=1` must be set for **both**.
Read the trade-offs: **[docs/SUBDOMAIN-SETUP.md](docs/SUBDOMAIN-SETUP.md)**.

### What makes the switch invisible

| Behaviour | How it is preserved |
| --- | --- |
| `/product/ac3fa/` (trailing slash) | `server/middleware/legacy-compat.ts` rewrites internally — no redirect, URL bar unchanged |
| `/?s=keyword` | 302 → `/search?q=keyword` |
| `/?add-to-cart=11943` | 302 → that product page (lookup via `/api/products/by-id/:id`) |
| `/wp-content/uploads/…` | local mirror first, then proxied to `NUXT_LEGACY_ORIGIN` |
| `/my-account`, `/wishlist`, `/compare`, `/wp-admin`, `/wp-json` | stay on WordPress until decommissioned |
| `฿0.00` price rendering | `NUXT_PUBLIC_ZERO_PRICE_STYLE=woo` for the cut-over window |
| GTM / GA4 | same container & property injected from env — no data gap |
| Sitemap URL set | `/sitemap.xml` + `/sitemap_index.xml` generated from the DB |
| Canonical tags | `plugins/canonical.ts` — absolute, always the production host (even on the staging sub-domain), WooCommerce-style noindex for `/cart`, `/checkout`, `/search` |

### Day-of commands

```bash
npm run sync -- --full                        # close the last 5-minute gap
npm run parity -- --limit 400                 # FAIL must be 0
npm run edge:gen -- --rollout 100             # cut over
curl -sI https://www.aph-ita.co.th/ | grep -i x-aph    # which stack served you?
npm run edge:gen -- --rollout 0               # rollback, < 1 second
```

> Cannot run it here? `scripts/sync-wordpress.mjs` and `scripts/parity-check.mjs` need network access to
> `aph-ita.co.th`; both are safe to dry-run (`--dry-run`, `--no-old`) and neither writes to WordPress.

---

## 7. Deploying several domains from one host

`www` is the parent; `staging` / `uat` are children on the same machine, each with its own port,
its own database name and its own release symlink — so deploying one never touches the others.

```
nginx :443 ─┬─ www     → 127.0.0.1:3020 (blue) / :3030 (green)   ← zero-downtime flip
            ├─ staging → 127.0.0.1:3000  (Basic Auth)
            └─ uat     → 127.0.0.1:3010  (shared link, noindex)

/srv/aph/current-3020 → /srv/aph/releases/<env>-<utc>-<sha>      (immutable release)
```

```bash
./deploy/deploy.sh --env staging            # build + restart :3000
./deploy/deploy.sh --env uat                # build + restart :3010
./deploy/deploy.sh --env www                # blue/green: builds the idle slot, then flips nginx
./deploy/deploy.sh --env staging --rollback # previous release, ~5 s
./deploy/deploy.sh --env staging --dry-run  # show every command, change nothing

./deploy/refresh-db.sh --to staging --apply --sanitize   # copy prod DB into the staging DB
```

Every deploy is atomic (new release directory + symlink), health-checked on `/api/health`, and
**self-rolls-back** when the check fails. Since `NUXT_PUBLIC_*` is runtime config, one build serves all
environments — only `/etc/aph/aph-nuxt-<port>.env` differs.

Full runbook (bootstrap, sudoers, DB strategy, FAQ): **[docs/DEPLOY-MULTI-DOMAIN.md](docs/DEPLOY-MULTI-DOMAIN.md)**

## 8. Production

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

## 9. Status & known limitations

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

### การย้ายระบบแบบไม่ให้เว็บล้ม (Zero-downtime)

WordPress ยังเป็นเว็บจริงตลอดการย้าย — ระบบใหม่ดึงข้อมูลจาก WP ผ่าน REST API ทุก 5 นาที
แล้วสลับทราฟฟิกที่ **edge (nginx/Cloudflare)** ทีละ 1% → 5% → 25% → 50% → 100% พร้อม **rollback ได้ใน 1 วินาที**

```bash
npm run sync -- --full      # ปิดช่องว่างข้อมูล 5 นาทีสุดท้าย
npm run parity -- --limit 400   # ตรวจว่า 400 URL เหมือนเดิม (FAIL ต้องเป็น 0)
npm run edge:gen -- --rollout 100   # cut-over
npm run edge:gen -- --rollout 0     # rollback ทันที (< 1 วินาที)
```

สิ่งที่ทำให้ “ไม่รู้สึกว่าเปลี่ยน”: URL เดิมทุกแบบรวม `/` ปิดท้าย, `?s=`, `?add-to-cart=`,
`/wp-content/uploads/...`, ฟอนต์/สี/ข้อความเดิม, GTM+GA4 ตัวเดิม, ราคา `฿0.00` แบบเดิม (ตั้ง `NUXT_PUBLIC_ZERO_PRICE_STYLE=woo`)
และ path ที่ยังไม่ทำใหม่ (`/my-account`, `/wishlist`, `/compare`, `/wp-admin`, `/wp-json`) จะถูกส่งกลับ WordPress อัตโนมัติ

👉 **แผนละเอียด + runbook นาทีต่อนาที + ตารางความเสี่ยง: [docs/MIGRATION-ZERO-DOWNTIME.md](docs/MIGRATION-ZERO-DOWNTIME.md)**

### Deploy หลายโดเมนบนโฮสต์เดียว

`www` เป็นแม่, `staging`/`uat` เป็นลูก — คนละ port, คนละชื่อฐานข้อมูล, คนละ release symlink จึง deploy แยกกันได้จริง

```bash
./deploy/deploy.sh --env staging       # build + restart :3000
./deploy/deploy.sh --env www           # blue/green: build ฝั่งว่าง → ตรวจ → สลับ nginx (ไม่มี request หลุด)
./deploy/deploy.sh --env staging --rollback   # ย้อนกลับใน ~5 วินาที
./deploy/refresh-db.sh --to staging --apply   # คัดลอก DB prod ลง staging (มี --sanitize)
```
ทุกครั้งที่ deploy: release ใหม่แยกโฟลเดอร์ → ตรวจ `/api/health` → ถ้าไม่ผ่าน **ถอยกลับเองอัตโนมัติ**

👉 รายละเอียด (bootstrap, สิทธิ์ sudo, กลยุทธ์ DB, FAQ): **[docs/DEPLOY-MULTI-DOMAIN.md](docs/DEPLOY-MULTI-DOMAIN.md)**

**ข้อควรทราบ**: รูปสินค้าอ้างอิงไฟล์จากเว็บเดิม (ใช้ `--images` เพื่อโหลดมาเก็บในเครื่อง),
ราคาส่วนใหญ่ต้นฉบับเป็น 0 บาท (ขายแบบใบเสนอราคา) จึงแสดง “สอบถามราคา”,
รายชื่อตัวแทนจำหน่ายเป็นข้อมูลตัวอย่าง และฟอร์มติดต่อยังไม่เชื่อมอีเมล
