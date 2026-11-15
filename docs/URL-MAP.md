# เอาขึ้นที่ URL ไหน — แผน URL ทั้งหมดของโปรเจกต์

> **คำตอบสั้น:** เว็บจริงคือ **`https://www.aph-ita.co.th`** (ตอนนี้เป็น WordPress → หลัง cut-over เป็น Nuxt)
> ที่เหลือเป็นสนามซ้อม: **`https://staging.aph-ita.co.th`** (มีรหัส) และ **`https://uat.aph-ita.co.th`** (แชร์ลิงก์ให้ลูกค้า)

ทุกโดเมนอยู่บน **โฮสต์เดียวกัน** — ต่างกันที่ port, ฐานข้อมูล และการป้องกัน:

```
https://www.aph-ita.co.th      ─┐
https://aph-ita.co.th          ─┼─► nginx :443 ─┬─► 127.0.0.1:3020 / :3030   (Nuxt, DB aph_website)
https://staging.aph-ita.co.th  ─┤               ├─► 127.0.0.1:3000           (Nuxt, DB aph_website_staging)
https://uat.aph-ita.co.th      ─┘               ├─► 127.0.0.1:3010           (Nuxt, DB aph_website_uat)
                                                └─► WordPress (เดิม) — จนถึงวัน cut-over
```

---

## 1. ตาราง URL ทั้งหมด

| URL | ใครใช้ | ตอนนี้ | หลัง cut-over | Google เห็น |
| --- | --- | --- | --- | --- |
| **`https://www.aph-ita.co.th`** | ผู้ใช้จริง, ลูกค้า, Google | WordPress | **Nuxt** (blue/green :3020/:3030) | ✅ index |
| `https://aph-ita.co.th` (apex) | คนที่พิมพ์ไม่มี www | 301 → www (หรือ WP) | **301 → www** | ✅ (301) |
| `http://…` ทุกตัว | — | 301 → https | **301 → https** | ✅ (301) |
| **`https://staging.aph-ita.co.th`** | ทีม dev/QA | Nuxt :3000 | Nuxt :3000 (เก็บไว้ใช้ต่อ) | ❌ noindex 4 ชั้น |
| **`https://uat.aph-ita.co.th`** | ฝ่ายขาย/ลูกค้า | Nuxt :3010 | 301 → www (หลังจบงาน) | ❌ noindex 4 ชั้น |
| `https://new.aph-ita.co.th` (ถ้าเคยแจก) | ลิงก์เก่า | — | 301 → www | ✅ (301) |
| `127.0.0.1:3000/3010/3020/3030` | ภายในเครื่องเท่านั้น | Nuxt | Nuxt | ❌ (ไม่ควรเปิดออกเน็ต) |

> **canonical ที่ทุกหน้าอ้างถึง** = `https://www.aph-ita.co.th` (ตั้งจาก `NUXT_PUBLIC_SITE_URL`)
> แม้เปิดจาก `staging.` หรือ `uat.` — canonical ก็ยังชี้ www เสมอ (ดู `plugins/canonical.ts`)

ตรวจแผนที่นี้ได้ด้วยคำสั่งเดียว:
```bash
npm run urls                 # พิมพ์ตารางจาก deploy/environments.json
npm run urls -- --check      # ตรวจ URL จริง (401 ของ staging, noindex ของ uat, 301 ของ apex)
npm run urls -- --check-local # ตรวจ port ในเครื่อง (ก่อนมี DNS)
```

---

## 2. DNS ที่ต้องมี (ทั้งหมดชี้ IP เดียวกัน)

| Type | Name | Value | TTL | หมายเหตุ |
| --- | --- | --- | --- | --- |
| A | `@` (apex) | IP เครื่องใหม่ | 300 → 3600 | 301 → www |
| A | `www` | IP เครื่องใหม่ | 300 → 3600 | **เว็บจริง** |
| A | `staging` | IP เครื่องใหม่ | 300 | ที่ทดสอบภายใน |
| A | `uat` | IP เครื่องใหม่ | 300 | ให้ลูกค้าลอง |

```bash
dig +short www.aph-ita.co.th aph-ita.co.th staging.aph-ita.co.th uat.aph-ita.co.th
```

* ลด TTL เป็น **300 วินาที ล่วงหน้าอย่างน้อย 48 ชั่วโมง** ก่อนวัน cut-over (เพื่อ rollback ได้ไว)
* **ห้ามใช้ CNAME** ชี้ไป `www` (จะวนกลับ)
* ถ้าใช้ Cloudflare: เปิด Proxied ได้ แต่ต้องเลือกอย่างใดอย่างหนึ่งระหว่าง **Cloudflare Access** กับ **Basic Auth** (ซ้อนกันจะวน 401/302)

---

## 3. ใบรับรอง TLS (ตัวละ 1 ใบ หรือ wildcard ใบเดียว)

```bash
# ทางที่ชัดเจนที่สุด: ออกทีละชื่อ
sudo certbot --nginx -d www.aph-ita.co.th -d aph-ita.co.th --redirect
sudo certbot --nginx -d staging.aph-ita.co.th --redirect
sudo certbot --nginx -d uat.aph-ita.co.th --redirect

# ทางเลือก: wildcard (ต้องแก้ TXT record เอง / ใช้ DNS plugin)
sudo certbot certonly --manual --preferred-challenges dns -d '*.aph-ita.co.th' -d aph-ita.co.th
```

ตั้ง renew อัตโนมัติ: `sudo systemctl enable --now certbot.timer && sudo certbot renew --dry-run`

---

## 4. กติกา redirect (ต้องตรงทุกข้อ ไม่งั้นผู้ใช้/Google สับสน)

| จาก | ไป | รหัส | ใครจัดการ |
| --- | --- | --- | --- |
| `http://…` | `https://…` | 301 | nginx (certbot --redirect) |
| `https://aph-ita.co.th/*` | `https://www.aph-ita.co.th/*` | 301 | `deploy/nginx/apex-redirect.conf` |
| `/product/x/` (มี `/` ปิดท้าย) | เสิร์ฟหน้าเดิม **ไม่ redirect** | 200 | `server/middleware/legacy-compat.ts` |
| `/?s=คำ` | `/search?q=คำ` | 302 | legacy-compat |
| `/?add-to-cart=ID` | `/product/<slug>` | 302 | legacy-compat |
| `/my-account`, `/wishlist`, `/compare`, `/wp-admin`, `/wp-json` | WordPress | 302 | legacy-compat (`NUXT_LEGACY_ORIGIN`) |
| `https://staging.…` / `https://uat.…` | ไม่ redirect (แต่ noindex) | 200 | nginx + app |
| `https://uat.…` **หลังปิดงาน** | `https://www.…` | 301 | `npm run vhost:gen -- --host uat.aph-ita.co.th --mode redirect` |

---

## 5. URL ไหน รันจากอะไร

| องค์ประกอบ | ที่อยู่บนเครื่อง | ไฟล์ config |
| --- | --- | --- |
| nginx (ทุกโดเมน) | `:80`, `:443` | `deploy/nginx/aph-edge.conf`, `deploy/generated/*.conf`, `deploy/nginx/apex-redirect.conf` |
| Nuxt staging | `127.0.0.1:3000` | `deploy/systemd/aph-nuxt@.service` + `/etc/aph/aph-nuxt-3000.env` |
| Nuxt uat | `127.0.0.1:3010` | `/etc/aph/aph-nuxt-3010.env` |
| Nuxt www (blue) | `127.0.0.1:3020` | `/etc/aph/aph-nuxt-3020.env` |
| Nuxt www (green) | `127.0.0.1:3030` | `/etc/aph/aph-nuxt-3030.env` |
| WordPress เดิม | หลัง nginx (เช่น `:8080`) | คงไว้จน decommission |
| MariaDB | `127.0.0.1:3306` | `aph_website`, `aph_website_staging`, `aph_website_uat` |

> ทุก port ผูกกับ `127.0.0.1` เท่านั้น (ไม่เปิดออกอินเทอร์เน็ต) — เข้าจากภายนอกได้ทาง nginx 443 เท่านั้น

---

## 6. ถ้ายังไม่มีโฮสต์/โดเมน — ต้องเตรียมอะไร

1. **เครื่อง (VPS หรือ on-prem)** — แนะนำ 4 vCPU / 8 GB RAM / NVMe 60 GB ขึ้นไป (Nuxt 4 instance + MariaDB)
2. **สิทธิ์ DNS** ของ `aph-ita.co.th` (registrar หรือ Cloudflare) — ต้องเพิ่ม 4 A record ข้างบน
3. **สิทธิ์เข้าเครื่องเดิม** (WordPress) เพื่อเก็บ snapshot + ยืนยันว่า `/wp-json` เปิดให้ sync อ่านได้
4. ติดตั้ง: nginx, Node 20+, MariaDB 11, certbot, git
5. รัน bootstrap ใน `docs/DEPLOY-MULTI-DOMAIN.md §8` แล้ว `npm run import:wp:full`

ถ้ายังไม่มีโดเมนชั่วคราว ให้ทดสอบด้วย IP + `/etc/hosts` ก่อนได้:
```
203.0.113.10  staging.aph-ita.co.th
203.0.113.10  uat.aph-ita.co.th
```

---

## 7. ห้ามทำ (เคยทำให้เว็บ “ดูเปลี่ยน” มาแล้วหลายเคส)

- ❌ ลิงก์ `staging.` / `uat.` จากเว็บจริง, อีเมล, LINE, Facebook, Google Ads
- ❌ ใช้ `http://` หรือ IP ตรงในการแชร์ลิงก์
- ❌ ใช้ apex (`aph-ita.co.th`) เป็นเว็บหลักคู่ขนานกับ `www` (ต้องเลือกหนึ่ง — เราเลือก www)
- ❌ เปลี่ยน `NUXT_PUBLIC_SITE_URL` ให้ชี้ host ของ staging (canonical/sitemap จะเพี้ยนทั้งเว็บ)
- ❌ เปิด `NUXT_PUBLIC_ROBOTS_NOINDEX=0` บน staging/uat ก่อน cut-over
- ❌ ปล่อย `/wp-admin` เปิดโล่งหลัง decommission WordPress (ปิดหรือย้ายไป path ใหม่)

---

## 8. FAQ

**ต้องมี www ไหม?** ต้องเลือกหนึ่งเป็น canonical — เราเลือก `www` เพราะลิงก์/แบคลิงก์/Ads ของเดิมชี้ `www` อยู่แล้ว
และ apex จะ 301 มาที่ www เสมอ (ผล SEO รวมที่เดียว)

**ใช้ apex เป็นหลักได้ไหม?** ได้ แต่ต้องแก้ทุกที่ (canonical, sitemap, GTM, Ads, อีเมล) — ไม่คุ้มกับความเสี่ยงช่วง cut-over

**ใช้ Cloudflare ได้ไหม?** ได้: A record ชี้ IP เครื่อง, เปิด Proxied, ตั้ง SSL mode = Full (strict), และ **ปิด** “Always Use HTTPS” ซ้ำซ้อนไม่เป็นไร แต่ห้ามเปิด Cloudflare Access ซ้อนกับ Basic Auth

**staging/uat ต้องมี cert แยกไหม?** ต้องมีชื่อในใบรับรอง (แยกใบหรือ wildcard ก็ได้) ไม่งั้นเบราว์เซอร์จะเตือน

**จะรู้ได้ไงว่า request นี้ถูกเสิร์ฟจากตัวไหน?** ดู header `X-APH-Env` (staging/uat) และ `X-APH-Backend`/`X-APH-Fallback` ที่ edge
```bash
curl -sI https://www.aph-ita.co.th/ | grep -i x-aph
```
