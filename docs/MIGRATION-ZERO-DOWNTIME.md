# แผน Migrate WordPress → Nuxt 3 + MariaDB แบบ **Zero-downtime** และ **ไม่ให้ผู้ใช้รู้สึกว่าเปลี่ยน**

> เอกสารนี้คือ runbook ที่ใช้จริงกับ `www.aph-ita.co.th` (WordPress + WooCommerce → Nuxt 3 + MariaDB)
> ทุกคำสั่งอ้างอิงสคริปต์ที่อยู่ในรีโปนี้แล้ว — ไม่มีขั้นตอนไหนที่ต้อง “ปิดเว็บ”

---

## 0. TL;DR

| เป้าหมาย | วิธีที่ใช้ | ผลลัพธ์ |
| --- | --- | --- |
| **ไม่มี downtime** | WordPress ยังรันอยู่ตลอด + สลับ traffic ที่ **edge (nginx/Cloudflare)** ทีละ % | 0 วินาที |
| **ย้อนกลับได้ทันที** | เปลี่ยน `--rollout 0` → reload nginx | **< 1 วินาที** |
| **ไม่ให้รู้สึกว่าเปลี่ยน** | URL เดิมทุกแบบ (รวม `/` ปิดท้าย), `?s=`, `/wp-content/uploads`, ฟอนต์/สี/ข้อความเดิม, GTM ตัวเดิม, ราคา `฿0.00` แบบเดิม | parity ≥ 95 % |
| **ข้อมูลไม่ตกหล่น** | `npm run sync` ทุก 5 นาที (delta) + soft-delete | ข้อมูลตามหลัง WP ≤ 5 นาที |
| **ไม่แตะของเดิม** | DB ใหม่ (`aph_website`) แยก instance, WordPress อ่าน/เขียน DB เดิม | ไม่มีความเสี่ยงต่อข้อมูลเดิม |
| **รู้ว่าพลาดตรงไหน** | `npm run parity` เทียบ 300 URL อัตโนมัติ + fallback ไป WP เมื่อ Nuxt 5xx | ตรวจพบก่อนผู้ใช้เห็น |

จุดสำคัญ: **เราไม่ได้ “ย้ายข้อมูลแล้วสลับเว็บ”** — เราทำให้ทั้งสองระบบทำงานคู่กัน โดย WordPress เป็นเจ้าของข้อมูลจนถึงวินาทีสุดท้าย แล้วให้ **edge** เป็นสวิตช์ตัวเดียว

---

## 1. หลักการ 6 ข้อ (ถ้าจำได้แค่นี้)

1. **WordPress = source of truth จนถึง T0** — ห้ามแก้ข้อมูลใน DB ใหม่ด้วยมือก่อน cut-over (ทุกอย่างมาจาก sync)
2. **จุดตัดสินใจเดียว (single switch)** — การเปลี่ยนระบบคือการเปลี่ยน `$aph_rollout` ที่ edge ไม่ใช่การแก้ DNS ทีละระเบียน/แก้ config หลายที่
3. **ห้ามแตะ production DB ของ WordPress** — สคริปต์ทุกตัวอ่านผ่าน HTTPS REST API เท่านั้น (`wp-json`) ไม่ต่อ MySQL ของ WP
4. **URL และพฤติกรรมเดิมต้องอยู่ครบ** — ไม่มี 404 ใหม่, ไม่มี redirect ที่ผู้ใช้เห็น, ไม่มีหน้าที่ “หายไป”
5. **ทุกขั้นต้องย้อนกลับได้ใน < 60 วินาที** — canary ทุกขั้นมีเลขเกณฑ์ไปต่อ/ถอยชัดเจน
6. **ตัดสินด้วยตัวเลข ไม่ใช่ความรู้สึก** — error rate, p95, conversion, parity diff %, จำนวนออเดอร์

---

## 2. สถาปัตยกรรมระหว่าง migration

```
                        ┌──────────────────────────────┐
  ผู้ใช้ / Google  ───►  │  Edge: nginx หรือ Cloudflare │  ← สวิตช์เดียว: $aph_rollout (0–100)
                        │  • cookie sticky             │     rollback < 1 วินาที
                        │  • 5xx → fallback (GET เท่านั้น)
                        └───────┬──────────────┬───────┘
                       rollout% │              │ ที่เหลือ
                                ▼              ▼
                    ┌───────────────┐   ┌──────────────────┐
                    │ Nuxt 3 :3000  │   │ WordPress (เดิม) │
                    │ SSR + Nitro   │   │ Apache/PHP-FPM   │
                    └───────┬───────┘   └────────┬─────────┘
                            │ SELECT             │ อ่าน/เขียนปกติ
                            ▼                    ▼
                    ┌───────────────┐   ┌──────────────────┐
                    │ MariaDB ใหม่  │   │ MySQL เดิม (WP)  │
                    │ aph_website   │   │ ห้ามแตะ           │
                    └───────▲───────┘   └────────┬─────────┘
                            │  delta sync ทุก 5 นาที (REST API)
                            └────────────────────┘
```

* WordPress ยังรับ order จริง และเสิร์ฟ `/wp-admin`, `/wp-json`, `/my-account`, `/wishlist`, `/compare` ต่อไป
* Nuxt เสิร์ฟหน้า catalog/สินค้า/บทความ ที่อ่านจาก MariaDB (ซึ่งตามหลัง WP ไม่เกิน 5 นาที)
* ทุก path ที่ Nuxt ยังไม่รองรับ จะถูกส่งกลับไป WordPress อัตโนมัติ (ดูลิสต์ใน `server/middleware/legacy-compat.ts`)

---

## 3. Phase 0 — เตรียมตัว (สัปดาห์ −3 ถึง −2)

**เป้าหมาย: รู้ให้ครบว่า “ของเดิม” คืออะไร ก่อนแตะอะไรทั้งสิ้น**

- [ ] **Snapshot ของเดิม** (สำหรับ rollback ระดับฐานข้อมูล ไม่ใช่แค่ routing)
  ```bash
  mysqldump --single-transaction --quick wp_db | gzip > wp-$(date +%F).sql.gz
  tar czf wp-files-$(date +%F).tar.gz /var/www/html/wp-content
  ```
- [ ] **Baseline ตัวเลขจริง 7 วัน** — เก็บไว้เทียบหลัง cut-over
  * GA4: users, sessions, conversion (form submit / LINE click / order), bounce
  * Server: requests/day, p95 TTFB, error rate (nginx log `%{500,502}`)
  * Search Console: clicks/impressions ของ top 50 URL
- [ ] **URL inventory** — จำนวน URL ทั้งหมด และหน้าไหนสำคัญ (ใช้ `npm run parity` ดึงจาก sitemap ได้)
  ```bash
  npm run parity -- --old https://www.aph-ita.co.th --new http://127.0.0.1:3000 --limit 500 --out reports/baseline.json
  ```
- [ ] **Freeze นโยบาย**: ตั้งแต่ T−7 ห้ามเปลี่ยน theme/plugin/slug/โครงสร้างเมนูใน WordPress (แก้เนื้อหาได้)
- [ ] **ยืนยันหน้า/ฟีเจอร์ที่ WordPress ให้บริการ** และตัดสินว่าจะทำใน Nuxt หรือส่งกลับ WP:
      `wishlist`, `compare`, `my-account`, `checkout`, `blog`, `promotions`, `services`, `delivery-return`
- [ ] **ตัดสินเรื่องออเดอร์**: ช่วง canary ถ้าผู้ใช้บางคนอยู่บน Nuxt และบางคนอยู่บน WP
      → **ต้องมีเจ้าของออเดอร์เจ้าเดียว** คำแนะนำ: ช่วง canary ให้ปุ่มสั่งซื้อบน Nuxt ส่งเข้า “ขอใบเสนอราคา”
      (สำหรับร้าน B2B ที่ราคาเป็น 0 บาทอยู่แล้ว ธุรกิจไม่สะดุด) แล้วเปิด order เต็มรูปแบบหลัง 100 %

**ทางออกที่ปลอดภัยที่สุดถ้าต้องขายจริงทั้งสองฝั่ง:** ทำ checkout ของ Nuxt ให้ POST เข้า WooCommerce REST
(`/wp-json/wc/v3/orders` ด้วย API key) ระหว่างช่วง canary → ออเดอร์ลงที่เดียวคือ Woo เสมอ แล้วค่อยสลับมาเขียน DB ใหม่ตอน 100 %

---

## 4. Phase 1 — Staging ที่ไม่กระทบใคร (สัปดาห์ −2)

```bash
# บนเครื่องใหม่ (แยกจากเครื่อง WordPress โดยสิ้นเชิง)
cp .env.example .env && vi .env        # NUXT_DB_* , NUXT_PUBLIC_SITE_URL=https://new.aph-ita.co.th
docker compose up -d db
npm ci
npm run db:init && npm run db:migrate  # schema + objects สำหรับ sync
npm run import:wp:full                 # ดึงทั้งหมด + โหลดรูปมาเครื่องนี้(--images --dump-json)
npm run build && node .output/server/index.mjs
```

- เปิด `new.aph-ita.co.th` แบบ **Basic Auth** และ **`noindex`** — ห้ามให้ Google เห็นก่อนเวลา
  ```bash
  sudo cp deploy/nginx/subdomain.conf /etc/nginx/sites-available/new.aph-ita.co.th
  sudo ln -s /etc/nginx/sites-available/new.aph-ita.co.th /etc/nginx/sites-enabled/
  sudo certbot --nginx -d new.aph-ita.co.th --redirect
  sudo htpasswd -c /etc/nginx/.htpasswd-aph aph      # แล้วเปิด auth_basic ใน config
  # .env ของ staging: NUXT_PUBLIC_ROBOTS_NOINDEX=1  (X-Robots-Tag + meta robots + robots.txt)
  npm run check:staging -- --url https://new.aph-ita.co.th --auth aph:secret
  ```
  รายละเอียด + ข้อดีข้อเสียของการใช้ sub-domain (และทำไมไม่ควรใช้เป็นทางขึ้นจริง): **[docs/SUBDOMAIN-SETUP.md](SUBDOMAIN-SETUP.md)**
- `.env` ของ staging ต้องมี `NUXT_LEGACY_ORIGIN=https://www.aph-ita.co.th` เพื่อให้ `/wp-content/uploads/...` ทำงาน
- ตรวจ 20 หน้าหลักด้วยตาเปล่า + `npm run parity -- --new https://new.aph-ita.co.th --no-old`

---

## 5. Phase 2 — Delta sync ทุก 5 นาที (เริ่มตั้งแต่วันแรกของ staging)

`scripts/sync-wordpress.mjs` เป็นตัวรักษาความสดของข้อมูล:

```cron
# /etc/cron.d/aph-sync   — ทุก 5 นาที
*/5 * * * *  aph  cd /srv/aph && /usr/bin/npm run sync --silent >> /var/log/aph-sync.log 2>&1

# ตรวจสุขภาพ sync ทุกชั่วโมง ถ้าล้มเหลว 2 ครั้งติดให้แจ้งเตือน
0 * * * *    aph  cd /srv/aph && node scripts/sync-health.mjs || /usr/local/bin/alert "sync failed"
```

คุณสมบัติที่ทำให้ปลอดภัย:

| กลไก | รายละเอียด |
| --- | --- |
| **Incremental** | ใช้ watermark `modified_after` (เก็บในตาราง `sync_state`) → รอบปกติประมวลผลไม่กี่รายการ |
| **Idempotent** | `INSERT … ON DUPLICATE KEY UPDATE` ด้วย WP id เดิม → รันซ้ำได้ไม่เกิดข้อมูลซ้ำ |
| **Soft delete** | สินค้าที่ถูกลบ/ฉบับร่างใน WP จะถูกตั้ง `is_published=0` (ไม่ลบทิ้ง → ไม่เกิด 404 ใหม่ทันที) |
| **ไม่แตะ WP** | อ่านผ่าน `wp-json` เท่านั้น + retry/back-off, ไม่มี write กลับ |
| **มี run log** | ทุกครั้งเขียน `import_runs` + `sync_state` → ตรวจย้อนหลังได้ |
| **เร็ว** | 800 SKU ≈ ไม่กี่วินาที; `--content` อย่างเดียวเบากว่ามาก (ใช้ทุก 5 นาทีก็ได้) |

คำสั่งที่ใช้บ่อย:

```bash
npm run sync                 # ปกติ (ราคา/สต็อก/เนื้อหา/บทความ)
npm run sync -- --content    # เฉพาะเนื้อหา (เบา)
npm run sync -- --prices     # เฉพาะราคา/สต็อก
npm run sync -- --images     # โหลดรูปใหม่เข้ามาเก็บในเครื่อง
npm run sync -- --full       # รีเซ็ต watermark แล้วดึงใหม่ทั้งหมด
npm run sync -- --dry-run --json   # ดูว่าจะเปลี่ยนอะไร โดยไม่เขียน DB
```

> หมายเหตุ: ตอน cut-over จริง ให้รัน `npm run sync -- --full` **หนึ่งครั้งสุดท้าย** ก่อนเปิด Nuxt 100 %
> (ใช้เวลาไม่ถึงนาที) เพื่อปิดช่องว่าง 5 นาทีสุดท้าย

---

## 6. Phase 3 — Parity & UAT (สัปดาห์ −1)

### 6.1 ตรวจอัตโนมัติทุกคืน

```bash
npm run parity -- --old https://www.aph-ita.co.th \
                  --new https://new.aph-ita.co.th \
                  --limit 400 --out reports/parity-$(date +%F).json
```

`scripts/parity-check.mjs` เทียบทีละ URL: **HTTP status, `<title>`, meta description, `<h1>`,
canonical, จำนวนสินค้าในหน้า, จำนวนราคา และความคล้ายของข้อความ (shingle similarity)**

**เกณฑ์ผ่าน (Go/No-Go):**

| ตัวชี้วัด | เกณฑ์ |
| --- | --- |
| `FAIL` (404/5xx/ไม่มีสินค้า) | **0** |
| `diff-ratio` | ≤ 5 % และทุกตัวที่ต่างต้องอธิบายได้ |
| ความคล้ายข้อความ (หน้า catalog) | ≥ 90 % |
| p95 latency | Nuxt ≤ WordPress (ปกติจะเร็วกว่า 30–60 %) |

### 6.2 Checklist “ต้องเหมือน” (ติ๊กทีละข้อกับหน้าเว็บจริง)

**URL / เทคนิค**
- [ ] `/product/<slug>/` **มี `/` ปิดท้าย** และไม่ redirect (browser URL เหมือนเดิม)
- [ ] `/product-category/<path>/` ทุกชั้น (เช่น `/product-category/ethernet/xlrnet/`)
- [ ] `/?s=คำค้น` → หน้าผลการค้นหาใหม่ (302 ภายใน ไม่ทำให้ผู้ใช้สะดุด)
- [ ] `/?add-to-cart=<id>` → ไปหน้าสินค้านั้น
- [ ] `/wp-content/uploads/...` รูป/PDF ในอีเมลเก่าและ Google Images ยังเปิดได้
- [ ] `/sitemap.xml` + `/sitemap_index.xml` ตอบได้ และมี URL ชุดเดียวกับของเดิม
- [ ] `/robots.txt` ไม่บล็อกอะไรที่เดิมเปิด
- [ ] `/my-account`, `/wishlist`, `/compare`, `/wp-admin`, `/wp-json` → ส่งกลับ WordPress (302)

**หน้าตา / เนื้อหา**
- [ ] ฟอนต์ (IBM Plex Sans Thai), สีหลัก (แดง/navy), โลโก้, ไอคอน
- [ ] Header: topbar (เบอร์โทร/อีเมล/LINE), ช่องค้นหา, ตะกร้า, เมกะเมนูครบทุกหมวด
- [ ] Footer: ที่อยู่/เบอร์/LINE/Facebook/Instagram/เลขทะเบียนนิธิบุคคล ตรงกับของเดิม
- [ ] ตัวเลข “สินค้าในหมวด” ตรงกับ Woo (หลัง `--full` sync)
- [ ] ลำดับสินค้า/หน้าแรก (hero → การ์ดหมวด → โปรโมชัน → บริการ → แคตตาล็อก → สินค้าแนะนำ → ข่าวสาร)
- [ ] ราคา: **ถ้าเดิมแสดง `฿0.00` ให้ตั้ง `NUXT_PUBLIC_ZERO_PRICE_STYLE=woo` ในวัน cut-over**
- [ ] ข้อความ/ปุ่มภาษาเดียวกับเดิม (ถ้าเดิม “Add to cart” ให้ใช้ข้อความเดิม)
- [ ] หน้า 404 ภาษาไทย + มีทางกลับหน้าแรก
- [ ] รูป thumbnail/แกลเลอรีสินค้าเปิดครบ (ไม่มี broken image)

**ธุรกิจ / Analytics**
- [ ] GTM + GA4 ตัวเดิม (`NUXT_PUBLIC_GTM_ID`, `NUXT_PUBLIC_GA_ID`) — ไม่มี data gap
- [ ] LINE OA / Facebook / โทรศัพท์ กดได้จริง
- [ ] ฟอร์มติดต่อ + LINE/อีเมล ถึงปลายทางจริง
- [ ] ผังเว็บ / breadcrumb / canonical ถูกต้อง (ไม่ทำให้อันดับตก)

### 6.3 สิ่งที่ “ตั้งใจให้ต่าง” — ต้องตัดสินใจก่อน ไม่ใช่หลัง

| เรื่อง | เดิม (WooCommerce) | ใหม่ (Nuxt) | ตัวเลือกเพื่อ “ไม่ให้รู้สึก” |
| --- | --- | --- | --- |
| ราคา 0 บาท | `฿0.00` + ปุ่ม Add to cart | `สอบถามราคา` | ตั้ง `NUXT_PUBLIC_ZERO_PRICE_STYLE=woo` ช่วง cut-over |
| Wishlist / Compare | มี (plugin) | ยังไม่มี | ใช้ edge ส่งกลับ WP หรือทำเพิ่มก่อน T0 |
| My account | มี | ยังไม่มี | ส่งกลับ WP ก่อน (ตั้งไว้แล้วใน compat layer) |
| ตะกร้า | PHP session | localStorage | ตะกร้ามีอายุสั้น — cut-over ตอนกลางคืน, ไม่มีใครถือตะกร้าข้ามวัน |
| Canonical sitemap | Yoast | sitemap ที่ generate เอง | ตรวจ URL ชุดเดียวกันก่อน T0 (สคริปต์ parity ช่วยได้) |

---

## 7. Phase 4 — Canary ที่ edge (วัน T−1 ถึง T0)

ใช้ config ที่ generate ไว้: `deploy/nginx/aph-edge.conf` (หรือ `deploy/cloudflare/worker.js`)

```bash
npm run edge:gen -- --rollout 1
sudo cp deploy/generated/aph-edge-1.conf /etc/nginx/conf.d/aph-edge.conf
sudo nginx -t && sudo nginx -s reload
curl -sI https://www.aph-ita.co.th/ | grep -i x-aph    # ดูว่า request นี้ถูกเสิร์ฟจากเจ้าไหน
```

**ขั้นบันไดและเกณฑ์ (ทุกขั้นพักอย่างน้อย 30 นาที หรือ 1 ช่วง peak):**

| % | ระยะเวลา | ผ่านเมื่อ | ถ้าไม่ผ่าน |
| --- | --- | --- | --- |
| 1 % | 1 ชม. | error 5xx ≤ baseline, ไม่มี 404 ใหม่, p95 ≤ +10 % | `--rollout 0` |
| 5 % | 2–4 ชม. | ข้างบน + ไม่มี complaint, order/quote ยังทำงาน | `--rollout 0` |
| 25 % | 12–24 ชม. | conversion ไม่ตก > 5 %, GA4 events ครบ | `--rollout 0` |
| 50 % | 24 ชม. | ทุกอย่างนิ่ง + sync ok 100 % | `--rollout 5` |
| 100 % | ถาวร | ผ่านครบ + ทีมพร้อมเฝ้า 1 วัน | `--rollout 0` |

**สิ่งที่ต้องดูระหว่าง canary**
```bash
# จำนวน error แยกตาม backend (nginx log format ที่เพิ่ม $aph_backend)
grep 'x-aph-backend: nuxt'   /var/log/nginx/access.log | awk '$9>=500' | wc -l
grep 'x-aph-backend: legacy' /var/log/nginx/access.log | awk '$9>=500' | wc -l
# fallback ที่เกิดขึ้น (Nuxt ล่มแล้ว WP เสิร์ฟแทน)
grep -c 'X-APH-Fallback' /var/log/nginx/access.log
```
- `X-APH-Fallback` ต้อง **≈ 0** (ถ้ามี = Nuxt มีปัญหา real-time แต่ผู้ใช้ไม่เห็น — ดี แต่ต้องแก้)
- **POST ไม่ fallback** (ตั้งใจ): `map $request_method` ใน config อนุญาตเฉพาะ GET/HEAD → ไม่มีออเดอร์ซ้ำ

---

## 8. Phase 5 — Runbook วัน Cut-over

| เวลา | งาน | ผู้รับผิดชอบ | เกณฑ์ผ่าน |
| --- | --- | --- | --- |
| T−24 ชม. | เตรียม `--rollout 100` config, ซ้อม rollback 1 ครั้ง, แจ้งทีม | Ops | rollback ใช้เวลา < 1 นาที |
| T−60 นาที | `npm run sync -- --full` แล้วดู `import_runs` = ok | Dev | products/posts ครบ |
| T−30 นาที | `npm run parity -- --limit 400` | QA | FAIL = 0, diff ≤ 5 % |
| T−10 นาที | ตรวจ health: `/api/health` → `mariadb`, `import_runs` ok | Ops | ok |
| **T0** | `npm run edge:gen -- --rollout 100` → reload nginx | Ops | traffic 100 % ที่ Nuxt |
| T+5 นาที | ตรวจ 5xx, `x-aph-backend`, ตะกร้า/ฟอร์ม/โทร/LINE, GA4 realtime | Ops+QA | ไม่มี error ใหม่ |
| T+60 นาที | รัน `npm run parity` อีกรอบ + ดู Search Console (live) | QA | ผ่าน |
| T+4 ชม. | ประกาศภายใน “ย้ายเสร็จ” + เฝ้าต่อ 24 ชม. | PM | — |
| **T+24 ชม.** | ตัดสินใจ: เก็บ WordPress แบบ **read-only warm standby** ต่อ 14–30 วัน | ทีม | — |

> **สำคัญ**: หลัง `--rollout 100` **อย่าปิด WordPress** — ให้คงไว้เป็น warm standby (ยังกด rollback ได้ทันที)
> และปิด “การแก้ข้อมูลใน WP” เพื่อไม่ให้ข้อมูลสองฝั่งแยกกัน

---

## 9. Phase 6 — Rollback runbook (ซ้อมก่อนวันจริง)

| ระดับ | สถานการณ์ | คำสั่ง | เวลา |
| --- | --- | --- | --- |
| **L1 — Routing** | Nuxt มีปัญหา, ผู้ใช้ต้องไม่สะดุด | `npm run edge:gen -- --rollout 0` + `nginx -s reload` | < 1 วิ |
| **L2 — ถอยหนึ่งขั้น** | canary 25 % มีปัญหาเฉพาะกลุ่ม | `--rollout 5` | < 1 วิ |
| **L3 — ปิด legacy origin** | ต้องการให้ทุก path กลับ WP รวม `/` | `--rollout 0` + ตั้ง `NUXT_LEGACY_ORIGIN` ให้ชี้ WP | < 1 นาที |
| **L4 — ข้อมูลเสียหาย** | MariaDB มีปัญหา | หยุด Nuxt, `--rollout 0`; WP ยังมีข้อมูลครบ (ไม่เคยถูกแตะ) | < 5 นาที |
| **L5 — กู้ DB ใหม่** | ต้องสร้างใหม่ | `npm run db:reset` → `db:init` → `import:wp:full` | ~10 นาที |

**กติกา:** ถ้าเจอปัญหา “ผู้ใช้เห็นไม่ได้” (หน้าขาว, 404, ตะกร้าพัง) → **L1 ทันที ไม่ต้องสอบสวนก่อน**
สอบสวนทีหลังได้ เพราะข้อมูลไม่หาย (WordPress ยังครบ)

---

## 10. Phase 7 — หลัง Cut-over (T+1 ถึง T+30)

- [ ] T+1: ตรวจ Google Search Console (Coverage), เก็บ sitemap ใหม่, ดู soft-404
- [ ] T+1..T+7: เฝ้า error rate, ตะกร้า, ฟอร์ม, LINE clicks, GA4 events
- [ ] T+7: เทียบ conversion/ยอด lead กับ baseline 7 วันก่อน cut-over (ยอมรับ ±5 %)
- [ ] T+14: ถ้านิ่ง → ตั้ง WordPress เป็น read-only จริง (deny POST/PUT, ปิด XML-RPC)
- [ ] T+30: decommission WordPress:
      • เก็บ snapshot สุดท้าย (DB + files)
      • ลบ `NUXT_LEGACY_ORIGIN` (compat layer จะเริ่มตอบ 404 เองอย่างสุภาพ)
      • ย้าย `/wp-content/uploads` ที่ยังถูกเรียกจริงเข้า `public/`
      • คืนทรัพยากรเซิร์ฟเวอร์เดิม

---

## 11. ตารางความเสี่ยง & วิธีรับมือ

| ความเสี่ยง | ผลกระทบ | การรับมือ (ทำไว้แล้ว / ต้องทำ) |
| --- | --- | --- |
| ตะกร้า/ตะกร้าค้างใน session WP | ผู้ใช้ต้องเลือกสินค้าใหม่ | cut-over ช่วงตี 2–4, ตะกร้าเก็บใน localStorage (ไม่ผูก session) |
| Wishlist/Compare หาย | ผู้ใช้ที่ใช้ฟีเจอร์นี้รู้สึกเปลี่ยน | edge ส่งกลับ WP + ทำเวอร์ชัน Nuxt ก่อน T0 (ถ้าจำเป็น) |
| `?s=` search behavior ต่าง | ผลค้นหาไม่เหมือนเดิม | map ไป `/search` + ปรับ ranking ให้ใกล้ Woo (LIKE บน name/sku/desc) |
| ออเดอร์ซ้ำ (สองระบบเขียน) | ข้อมูลเพี้ยน | POST ไม่ fallback + เจ้าของออเดอร์เจ้าเดียว (ลิสต์ใน Phase 0) |
| รูปเก่า 404 | SEO/อีเมลเสีย | route `/wp-content/uploads/**` (mirror + proxy) ✔ |
| URL มี `/` ปิดท้ายแล้ว 404 | traffic ตก | trailing-slash tolerant + parity test ✔ |
| GTM/GA4 ขาด | ข้อมูล analytics หาย | ใช้ container/property เดิม ✔ |
| ฟอนต์/สี เพี้ยน | ดูเหมือนเปลี่ยนเว็บ | ใช้ IBM Plex Sans Thai + palette เดิม ✔ |
| ราคาแสดง `สอบถามราคา` แทน `฿0.00` | รู้สึกเปลี่ยน | `NUXT_PUBLIC_ZERO_PRICE_STYLE=woo` ช่วง cut-over ✔ |
| plugin page (promotions/services/delivery) ไม่มี | 404 | ส่งกลับ WP + ทำหน้าใหม่ภายหลัง |
| cache/CDN เก่าค้าง | ผู้ใช้เห็นหน้าเก่า/ใหม่สลับ | purge CDN ตอน reload edge, ตั้ง `cache-control` ให้ Nuxt ตาม WP |
| timezone/น้ำหนัก sync | ข้อมูลตามหลังเกิน 5 นาที | watermark แบบ site-local + overlap; ดู `sync:last_run` |
| DB ล่มระหว่าง canary | หน้าขาว | fallback: store JSON snapshot + edge fallback ไป WP ✔ |

---

## 12. Definition of Done (ก่อนกด 100 %)

- [ ] `parity`: FAIL = 0, diff ≤ 5 %
- [ ] `sync`: รันต่อเนื่อง 48 ชม. ไม่มี fail ติดกัน 2 ครั้ง
- [ ] UAT: หน้าแรก, หมวด, สินค้า 20 รายการ, ค้นหา, บทความ, ติดต่อ, ตะกร้า ผ่านการกดจริงทั้ง desktop/mobile
- [ ] GA4 Realtime เห็น event จาก Nuxt
- [ ] ซ้อม rollback (L1) สำเร็จ 1 ครั้งใน staging
- [ ] ทีมมีคนเฝ้า 24 ชม. หลัง cut-over
- [ ] มี snapshot WordPress ล่าสุด (DB+files) เก็บไว้นอกเครื่อง

---

## 13. Cheat sheet — คำสั่งทั้งหมด

```bash
# เตรียม DB ใหม่
cp .env.example .env
docker compose up -d db
npm run db:init && npm run db:migrate

# ดึงข้อมูลทั้งหมดครั้งแรก (รวมรูป)
npm run import:wp:full

# sync ต่อเนื่อง (cron ทุก 5 นาที)
npm run sync

# ตรวจ parity ก่อนขึ้น canary ทุกขั้น
npm run parity -- --old https://www.aph-ita.co.th \
                  --new https://new.aph-ita.co.th \
                  --limit 400 --out reports/parity.json

# canary / cut-over / rollback
npm run edge:gen -- --rollout 1      # 1 %
npm run edge:gen -- --rollout 25     # 25 %
npm run edge:gen -- --rollout 100    # 100 % (cut-over)
npm run edge:gen -- --rollout 0      # ROLLBACK ทันที

# ตรวจสุขภาพระบบใหม่
curl -s https://www.aph-ita.co.th/api/health     # {"ok":true,"dataSource":"mariadb"}
curl -sI https://www.aph-ita.co.th/ | grep -i x-aph
```

---

## 14. สิ่งที่ต้องตัดสินใจก่อนเริ่ม (ถามเจ้าของเว็บ)

1. **ออเดอร์ช่วง canary** ไปลงที่ไหน: WooCommerce ตัวเดิม หรือ Nuxt DB? (แนะนำ: Woo จนถึง 100 %)
2. **Wishlist / Compare / My account** — ทำใหม่ใน Nuxt หรือส่งกลับ WP ต่อไป?
3. **ราคา 0 บาท** — จะคงการแสดง `฿0.00` หรือเปลี่ยนเป็น “สอบถามราคา” หลัง cut-over? (ช่วงแรกควรคงเดิม)
4. **หน้า plugin อื่น ๆ** (Promotions, Services, Delivery & Return) — ย้ายเนื้อหาเมื่อไร
5. **เวลาต่ำสุดของ traffic** (ปกติธุรกิจ B2B ไทย: หลัง 22:00) — ใช้เป็นกรอบ canary ขั้น 1 %
6. **ใครมีสิทธิ์กด rollback** และช่องทางสื่อสารตอน cut-over (LINE กลุ่มภายใน)
