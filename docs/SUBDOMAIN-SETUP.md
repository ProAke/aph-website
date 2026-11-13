# ใช้ sub-domain “เบี่ยงเส้น” ได้ไหม?

**ได้ครับ — แต่ต้องแยกให้ชัดว่าเบี่ยงไปเพื่ออะไร** เพราะคำว่า “sub-domain” ถูกใช้ปนกัน 2 เรื่อง
ซึ่งผลลัพธ์ต่างกันมาก:

| วัตถุประสงค์ | ทำได้ไหม | เหมาะกับงานนี้หรือไม่ |
| --- | --- | --- |
| **A. เปิดเว็บใหม่บน sub-domain เพื่อทดสอบ/UAT/ให้ลูกค้าลองใช้** | ✅ ทำได้ ปลอดภัย 100 % | ✅ **แนะนำ** — เป็น Phase 1 ของแผน |
| **B. ใช้ sub-domain เป็นที่ให้ทราฟฟิกจริงวิ่งไป (แทน www)** | ⚠️ ทำได้ แต่มีต้นทุน | ❌ ไม่แนะนำ ถ้าเป้าหมายคือ “ไม่ให้รู้สึกว่าเปลี่ยน” |

---

## 1. ทำไม sub-domain ไม่ใช่ทาง “สลับเว็บ” ที่ดี

ถ้าให้ผู้ใช้จริงเข้าเว็บใหม่ผ่าน `new.aph-ita.co.th` (หรือ `shop.aph-ita.co.th`) ทุกคนจะเห็น URL เปลี่ยนทันที
และมีผลพวงที่ต้องแก้ทีละจุด:

| ผลกระทบ | รายละเอียด | ต้องทำอะไร |
| --- | --- | --- |
| **URL ที่ผู้ใช้เห็น** | `www.aph-ita.co.th/product/x/` → `new.aph-ita.co.th/product/x` | ต้อง 301 กลับ/แก้ canonical ทั้งเว็บ — ขัดเป้าหมาย “ไม่รู้สึกว่าเปลี่ยน” |
| **SEO** | Google มองเป็นคนละโดเมน → authority แยก, backlink เดิมยังชี้ www, อันดับอาจแกว่ง 2–8 สัปดาห์ | ต้อง canonical + Search Console + 301 ระยะยาว |
| **Cookie / ตะกร้า / session** | cookie ของ `www.` ไม่ถูกส่งไป `new.` → ตะกร้า, wishlist, ภาษา หาย | ตั้ง `Domain=.aph-ita.co.th` และทำ cross-domain consent |
| **GA4 / GTM** | session ใหม่ = ตัวเลขผู้ใช้และ conversion แตกเป็นสองส่วน | ต้องตั้ง cross-domain measurement (`linker`) |
| **ลิงก์ภายนอก** | อีเมล/LINE/Facebook/Google Ads ชี้ www เดิมทั้งหมด | ต้องแก้หรือ 301 (มี lag) |
| **ใบรับรอง / HSTS** | ต้องมี cert ของ sub-domain และถ้า HSTS เปิดทั้งโดเมนต้องระวัง | certbot + wildcard |

> ถ้าคำถามคือ “ขอให้ผู้ใช้ไม่รู้สึกว่าเปลี่ยน และห้ามเว็บล้ม” → **edge canary** (สลับ % ที่ www ตัวเดิม) คือคำตอบ
> sub-domain ใช้เป็น “สนามซ้อม” ไม่ใช่ “ประตูทางเข้า”

---

## 2. ทางเลือกในการ “เบี่ยงเส้น” — เทียบให้เห็นภาพ

| วิธี | ผู้ใช้เห็น URL อะไร | Downtime | Rollback | SEO | เหมาะกับ |
| --- | --- | --- | --- | --- | --- |
| **Edge canary** (nginx/Cloudflare) — ที่ใช้ในแผนนี้ | `www.aph-ita.co.th/...` เหมือนเดิม | 0 | < 1 วินาที (`--rollout 0`) | ไม่กระทบ (โดเมนเดิม) | ✅ ทางขึ้นจริง |
| **Sub-domain staging** | `new.aph-ita.co.th/...` | 0 | ปิด sub-domain | ไม่กระทบ (ถ้า noindex) | ✅ ทดสอบ/UAT |
| **Sub-domain เป็นเว็บจริง** | เปลี่ยนโดเมน | 0 | ต้องสลับ DNS กลับ | แกว่ง 2–8 สัปดาห์ | ❌ |
| **สลับ DNS A record** | โดเมนเดิม | 0–5 นาที (ตาม TTL/cache) | 5–60 นาที (TTL) | โดเมนเดิม แต่เสี่ยงช่วงสลับ | ทางสำรอง ถ้าไม่มี edge |

**สรุปที่แนะนำ:** ใช้ **ทั้งสองอย่างร่วมกัน**
1. `new.aph-ita.co.th` = สนามซ้อม (Basic Auth + noindex) ให้ทีม/ลูกค้าลองจริงก่อน
2. `www.aph-ita.co.th` = ที่เดียวที่ผู้ใช้จริงเห็น และสลับด้วย edge canary 1% → 100 %

---

## 3. ขั้นตอนเปิด sub-domain staging (ทำได้ใน 15 นาที)

### 3.1 DNS
| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| A | `new` | `<IP เครื่องใหม่>` | 300 |
| AAAA | `new` | `<IPv6>` (ถ้ามี) | 300 |

* ถ้าใช้ Cloudflare: เปิด **Proxied (orange cloud)** ได้ แต่ **Basic Auth จะชนกับ Cloudflare Access** — เลือกอย่างใดอย่างหนึ่ง
* **ห้าม** ใช้ CNAME ไปที่ `www` (จะวนกลับมาเว็บเดิม)

### 3.2 ใบรับรอง
```bash
sudo certbot --nginx -d new.aph-ita.co.th --redirect
# ทางเลือก: wildcard (ต้องมี DNS-01)
# sudo certbot certonly --manual --preferred-challenges dns -d '*.aph-ita.co.th'
```

### 3.3 nginx (ไฟล์พร้อมใช้: `deploy/nginx/subdomain.conf`)
```bash
sudo cp deploy/nginx/subdomain.conf /etc/nginx/sites-available/new.aph-ita.co.th
sudo ln -s /etc/nginx/sites-available/new.aph-ita.co.th /etc/nginx/sites-enabled/
# เปิด Basic Auth (แนะนำช่วง UAT)
sudo htpasswd -c /etc/nginx/.htpasswd-aph aph
sudo vi /etc/nginx/sites-available/new.aph-ita.co.th   # เอา # หน้า auth_basic ออก
sudo nginx -t && sudo nginx -s reload
```

### 3.4 ฝั่งแอป (`/srv/aph/.env`)
```dotenv
NUXT_PUBLIC_SITE_URL=https://www.aph-ita.co.th     # canonical ต้องชี้ production เสมอ
NUXT_PUBLIC_ROBOTS_NOINDEX=1                       # กัน Google 3 ชั้น
NUXT_LEGACY_ORIGIN=https://www.aph-ita.co.th       # ให้ /my-account, /wp-content/uploads ทำงาน
NUXT_PUBLIC_ZERO_PRICE_STYLE=woo                   # ให้ราคาเหมือนของเดิมตอนทดสอบ
```
```bash
npm run build && pm2 restart aph || systemctl restart aph
```

### 3.5 ตรวจว่า “พร้อมและล่องหน”
```bash
npm run check:staging -- --url https://new.aph-ita.co.th --auth aph:secret
```
ตรวจให้ครบ: 401 เมื่อไม่มีรหัส, `X-Robots-Tag: noindex`, meta robots, `robots.txt = Disallow: /`,
canonical ไม่ชี้เข้า staging, ทุกหน้าหลัก 200, `/my-account` + `/wp-admin` ต้อง 302 ไป WordPress,
sitemap ชี้ production host

> ถ้า `/my-account` ขึ้น **404** แปลว่ายังไม่ได้ตั้ง `NUXT_LEGACY_ORIGIN` — ตอน start แอปจะเตือนเป็นตัวหนังสือใหญ่
> (ตั้งใจให้เตือน เพราะถ้าลืมตอน cut-over ผู้ใช้จะเจอ 404 = “เว็บเปลี่ยนแล้ว” ทันที)

### 3.6 ปิดเมื่อไม่ใช้
```bash
sudo rm /etc/nginx/sites-enabled/new.aph-ita.co.th && sudo nginx -s reload
```

---

## 4. ถ้าจำเป็นต้องใช้ sub-domain เป็นเว็บจริง (กรณีย้าย DNS ไม่ได้)

ทำได้ แต่ต้องทำ 6 ข้อนี้พร้อมกัน ไม่อย่างนั้นผู้ใช้/Google จะสับสน:

1. **canonical ทุกหน้า** ชี้ `https://www.aph-ita.co.th/...` (ตั้ง `NUXT_PUBLIC_SITE_URL` ให้ถูก — ทำไว้แล้ว)
2. **301 ทุก path** จาก sub-domain → www เมื่อ production พร้อม (ยกเว้น path ที่ยังไม่ย้าย)
3. **GTM/GA4 cross-domain**: เพิ่ม `new.aph-ita.co.th` ใน GA4 Admin → Data streams → Configure tag settings → Configure your domains
4. **Cookie domain** = `.aph-ita.co.th` (ถ้ามีระบบ login/ตะกร้าที่ต้องแชร์)
5. **Search Console**: เพิ่ม property ของ sub-domain และกด “Change of address” *เฉพาะ* ตอนย้ายถาวรจริง
6. **ads/LINE/อีเมล**: อัปเดต final URL หรือปล่อย 301 ไว้อย่างน้อย 12 เดือน

---

## 5. หลัง cut-over เสร็จแล้ว sub-domain ทำอะไรต่อ

| ทางเลือก | ใช้เมื่อ |
| --- | --- |
| **301 → www** | ไม่ต้องการ staging อีก (Google จะรวม signal ให้เอง) |
| **เก็บเป็น staging ถาวร** (`staging.aph-ita.co.th`) + Basic Auth + noindex | ยังต้องมีที่ทดสอบเวอร์ชันใหม่/ดีไซน์ใหม่ต่อไป — **แนะนำข้อนี้** |
| ลบทิ้ง | ไม่มีทีมดูแลระบบอีก |

> กติกาเดียวที่ต้องจำ: **ผู้ใช้จริงต้องอยู่บน `www.aph-ita.co.th` เสมอ** — sub-domain ไว้ให้ทีมงานเท่านั้น

---

## 6. คำสั่งสรุป

```bash
# staging sub-domain
sudo cp deploy/nginx/subdomain.conf /etc/nginx/sites-available/new.aph-ita.co.th
sudo ln -s /etc/nginx/sites-available/new.aph-ita.co.th /etc/nginx/sites-enabled/
sudo certbot --nginx -d new.aph-ita.co.th --redirect
sudo htpasswd -c /etc/nginx/.htpasswd-aph aph
sudo nginx -t && sudo nginx -s reload

NUXT_PUBLIC_SITE_URL=https://www.aph-ita.co.th \
NUXT_PUBLIC_ROBOTS_NOINDEX=1 \
NUXT_LEGACY_ORIGIN=https://www.aph-ita.co.th npm run build

npm run check:staging -- --url https://new.aph-ita.co.th --auth aph:secret

# ทางขึ้นจริง (โดเมนเดิม ไม่มี downtime)
npm run edge:gen -- --rollout 1 && sudo nginx -s reload
```
