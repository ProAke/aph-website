# สถานะโปรเจกต์ — อัปเดต 21 พ.ย. 2026

> **สรุปหนึ่งบรรทัด:** ระบบใหม่ + เครื่องมือย้ายระบบ **เขียนเสร็จและทดสอบในเครื่องครบแล้ว (7 PR merged)**
> เหลือสิ่งที่ทำแทนไม่ได้: **IP เครื่องจริง / สิทธิ์ DNS / สิทธิ์ WordPress / คำตอบ 4 ข้อเชิงธุรกิจ**

ความคืบหน้าโดยรวม: **~85 %** — โค้ดพร้อม, ยังไม่เคยรันกับข้อมูลจริงและเซิร์ฟเวอร์จริง

---

## 1. เสร็จแล้ว และตรวจแล้วในเครื่องนี้

| ด้าน | สถานะ | หลักฐาน |
| --- | --- | --- |
| Nuxt 3 rewrite (SSR) | ✅ | 14 หน้า, 16 คอมโพเนนต์, 13 API endpoints |
| แคตตาล็อกสินค้า | ✅ | 207 สินค้า · 48 หมวด (มีลำดับชั้น) · 7 บทความ · 484 KB |
| รูปสินค้า | ⚠️ | 202/207 มีรูป (อ้าง URL เดิมของ WordPress — ยังไม่ได้ mirror มาเครื่อง) |
| MariaDB schema + seed | ✅ (โค้ด) | `database/schema.sql`, `seed.sql`, `migrations/001-sync.sql` — ผ่านการ parse 788/788 statements |
| URL/พฤติกรรมเดิม | ✅ | `/product/x/`, `/product-category/a/b/`, `?s=`, `?add-to-cart=`, `/sitemap.xml` (269 URL), `/robots.txt`, `/wp-content/uploads/*`, `/my-account` → WP |
| Delta sync | ✅ (โค้ด) | `npm run sync` (watermark, soft delete, image mirror, `import_runs`) |
| Parity checker | ✅ | `npm run parity` เทียบ status/title/meta/h1/canonical/จำนวนสินค้า/ความคล้ายข้อความ |
| Zero-downtime cut-over | ✅ (config) | edge router + `--rollout 0–100`, fallback GET→WP, rollback < 1 วินาที |
| Sub-domain staging/UAT | ✅ (config) | noindex 4 ชั้น, Basic Auth, `npm run check:staging` (19 ข้อ) |
| Deploy แยกโดเมน | ✅ (ทดสอบจริง) | atomic release, auto-rollback, blue/green www (:3020/:3030) |
| URL map + ตัวตรวจ | ✅ | `npm run urls`, `npm run urls -- --check` |
| เอกสาร | ✅ | 5 ฉบับ: migration, subdomain, deploy, URL map, สถานะ (ไฟล์นี้) |

**ทดสอบล่าสุด (dev server, วันนี้):** `/` `/products` `/product-category/xlr/` `/product/sp-4-mdvt-8/` `/articles`
`/catalogs` `/dealers` `/about` `/contact` `/cart` `/checkout` `/search` `/sitemap.xml` `/robots.txt` `/api/health` → **200 ทั้งหมด**, `/?s=xlr` → 302

---

## 2. เขียนเสร็จแต่ **ยังไม่เคยรันกับของจริง** (ข้อจำกัดของ sandbox)

| สิ่งที่ยังไม่ยืนยัน | เหตุผล | ใครปิดได้ |
| --- | --- | --- |
| `npm run import:wp:full` / `sync` กับเว็บจริง | sandbox ต่อเน็ตได้เฉพาะ npm/github | เครื่องที่มีเน็ตปกติ |
| MariaDB จริง (schema, index, performance) | ไม่มี MySQL/MariaDB ใน sandbox | เครื่องจริง (`npm run db:init`) |
| nginx config (`nginx -t`, certbot) | ไม่มี nginx ใน sandbox | เครื่องจริง |
| mirror รูปทั้ง 202 รูป | ต้องดึงจากเว็บจริง | `npm run sync -- --images` |
| GTM/GA4 ส่งข้อมูลจริง | ยังไม่มี ID ของเจ้าของเว็บ | ใส่ใน `/etc/aph/aph-common.env` |
| ภาระเครื่อง (4 instance + MariaDB) | ไม่ได้วัดบนเครื่องจริง | load test 1 ชั่วโมงก่อน canary |

---

## 3. ยังไม่ได้ทำ (ตั้งใจเลื่อน)

- [ ] หน้า `/my-account`, `/wishlist`, `/compare` ใน Nuxt — ตอนนี้ 302 กลับ WordPress (ปลอดภัย แต่ยังพึ่ง WP)
- [ ] Checkout เขียนออเดอร์เข้า WooCommerce REST ระหว่าง canary — **รอคำตอบข้อ 1**
- [ ] Parity รายคืนอัตโนมัติ + แจ้งเตือน (LINE/อีเมล)
- [ ] Backup DB ก่อน deploy (`mysqldump` เก็บ 7 วัน)
- [ ] `deploy.sh --all` ปล่อย staging → uat → www พร้อม gate
- [ ] GitHub Actions (deploy staging อัตโนมัติเมื่อ merge เข้า `main`)
- [ ] 301 map สำหรับหน้า plugin เก่า (promotions/services/delivery) ถ้าจะ include

---

## 4. สิ่งที่ต้องได้จากเจ้าของเว็บ (blockers)

| # | ต้องได้อะไร | ใช้ทำอะไร | ถ้าไม่มีจะเกิดอะไร |
| --- | --- | --- | --- |
| 1 | **IP ของเซิร์ฟเวอร์โฮสต์** | เขียน 4 A records (`@`, `www`, `staging`, `uat`) | เปิด sub-domain ไม่ได้ |
| 2 | **สิทธิ์ DNS** `aph-ita.co.th` | ลด TTL, ชี้ record, ทำใบรับรอง | ย้าย traffic ไม่ได้ |
| 3 | **สิทธิ์เครื่อง WordPress เดิม** | snapshot DB/files, เก็บ baseline | rollback ไม่มีข้อมูลสำรอง |
| 4 | **ยืนยันว่า `/wp-json` เปิดให้อ่าน** | sync ข้อมูล | ได้แค่ snapshot เก่า 207 รายการ |
| 5 | **GTM ID + GA4 ID** | analytics ต่อเนื่อง | ข้อมูล analytics ขาดช่วง cut-over |
| 6 | **คำตอบ 4 ข้อเชิงธุรกิจ** (ดู §5) | ตัดสินรูปแบบ checkout/ฟีเจอร์ | ต้องเดา = เสี่ยง “รู้สึกว่าเปลี่ยน” |

---

## 5. ต้องตัดสินใจ 4 ข้อ (จาก `MIGRATION-ZERO-DOWNTIME.md §14`)

1. **ออเดอร์ช่วง canary** — ลงที่ WooCommerce เดิม หรือ Nuxt DB? *(แนะนำ: Woo จนถึง 100 %)*
2. **Wishlist / Compare / My account** — ทำใหม่ใน Nuxt หรือส่งกลับ WP ต่อไป?
3. **ราคา 0 บาท** — คง `฿0.00` หรือเปลี่ยนเป็น “สอบถามราคา” หลัง cut-over? *(แนะนำ: คงเดิมช่วงแรก)*
4. **หน้า plugin อื่น** (Promotions, Services, Delivery & Return) — ย้ายเมื่อไร

---

## 6. ความเสี่ยงที่ยังเปิดอยู่

| ความเสี่ยง | ระดับ | สถานะการรับมือ |
| --- | --- | --- |
| ข้อมูลจริงอาจต่างจาก snapshot (207 รายการ) | 🟠 | ต้องรัน `import --full` แล้วเทียบจำนวนกับ Woo |
| รูปยังพึ่ง WordPress | 🟠 | route proxy ทำงาน แต่ควร `sync --images` ให้เป็นของเรา |
| ยังไม่ทดสอบ DB จริง (index/perf) | 🟠 | `db:init` + import บนเครื่องจริง ก่อน UAT |
| ยังไม่มี backup/restore ที่ซ้อมแล้ว | 🟠 | เพิ่ม job + ซ้อม 1 ครั้ง (§3) |
| ใบรับรอง/nginx ยังไม่ผ่าน `nginx -t` จริง | 🟡 | `install-subdomains.sh --apply` จะรันให้ + fail-safe |
| บุคลากร: ใครกด rollback | 🟡 | ต้องระบุชื่อ + ช่องทางสื่อสารก่อน T0 |

---

## 7. ลำดับงานถัดไป (ประมาณการ)

| ลำดับ | งาน | เวลา | ต้องมี |
| --- | --- | --- | --- |
| 1 | ได้ IP + DNS → เปิด `staging.aph-ita.co.th` | ครึ่งวัน | ข้อ 1, 2 |
| 2 | `import:wp:full` + `sync --images` + เทียบจำนวนสินค้า | 2 ชม. | ข้อ 3, 4 |
| 3 | `db:init` บน MariaDB จริง + วัดผล query | 2 ชม. | เครื่องจริง |
| 4 | UAT บน `uat.` (ลูกค้า/ฝ่ายขาย) + parity 400 URL | 1–2 วัน | ข้อ 6 |
| 5 | ซ้อม cut-over + rollback 1 ครั้ง (dry run) | 2 ชม. | ทีมพร้อม |
| 6 | Canary 1 % → 100 % | 1–2 วัน | ทุกอย่างผ่าน |
| 7 | หลัง cut-over: เฝ้า 24 ชม. → เก็บ WP read-only → decommission | 30 วัน | — |

---

## 8. ตรวจสถานะเองได้ทุกเมื่อ

```bash
npm run urls                      # แผนที่ URL ทั้งหมด
npm run urls -- --check           # staging ต้อง 401, uat ต้อง noindex, apex ต้อง 301
npm run check:staging -- --url https://staging.aph-ita.co.th --auth aph:…
npm run parity -- --old https://www.aph-ita.co.th --new https://staging.aph-ita.co.th --limit 400
npm run sync:health               # sync ล่าสุดกี่นาทีที่แล้ว / ล้มเหลวกี่ครั้งติด
curl -s https://www.aph-ita.co.th/api/health   # {"ok":true,"dataSource":"mariadb"}
git log --oneline -10             # ประวัติการเปลี่ยนแปลง
```

---

## 9. ประวัติ (PR ที่ merge แล้ว)

| PR | วันที่ | สิ่งที่ได้ |
| --- | --- | --- |
| #1 | 10 พ.ย. | Nuxt 3 rewrite + MariaDB schema + ข้อมูล 207 สินค้า |
| #2 | 13 พ.ย. | Zero-downtime tooling: sync, parity, edge canary, runbook |
| #3 | 13 พ.ย. | Sub-domain guard: noindex 4 ชั้น, canonical, `check:staging` |
| #4 | 14 พ.ย. | Multi-sub-domain generator + systemd units |
| #5 | 14 พ.ย. | staging + uat พร้อมติดตั้ง (declarative) |
| #6 | 14 พ.ย. | Deploy แยกโดเมน: atomic release, blue/green www, `refresh-db` |
| #7 | 15 พ.ย. | URL map + ตัวตรวจ URL |
