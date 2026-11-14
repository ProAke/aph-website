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

## 6. มีหลาย sub-domain พร้อมกัน (staging + UAT + beta)

บางทีที่เดียวไม่พอ — เช่น อยากมี **ที่ทดสอบภายใน** (มีรหัส) และ **ที่ให้ลูกค้าลอง** (ไม่มีรหัส แต่ห้าม Google เห็น)
ระบบรองรับหลาย sub-domain พร้อมกัน โดยแต่ละตัวรัน Nuxt คนละ port และมี vhost ของตัวเอง:

```bash
npm run vhost:gen -- --host staging.aph-ita.co.th --mode staging            # Basic Auth + noindex
npm run vhost:gen -- --host uat.aph-ita.co.th     --mode uat --port 3010    # ให้ลูกค้าลอง (noindex)
npm run vhost:gen -- --host new.aph-ita.co.th     --mode redirect           # หลัง cut-over → 301 ไป www
```

ไฟล์ที่ได้: `deploy/generated/<host>.conf` (สร้างจาก generator เสมอ เพื่อให้กฎ noindex/auth เหมือนกันทุก environment)

### โหมดที่มี

| mode | มีรหัสผ่าน | noindex | cache | ใช้กับ |
| --- | --- | --- | --- | --- |
| `staging` | ✅ Basic Auth | ✅ | ปิด cache | ทีมภายใน, ลูกค้าเทคนิค, UAT รอบสุดท้าย |
| `uat` | ❌ (แชร์ลิงก์ได้) | ✅ | ปิด cache | ให้ลูกค้า/ฝ่ายขายกดดูจริงบนมือถือ |
| `redirect` | — | — | — | หลัง cut-over: 301 → `www.aph-ita.co.th` |

### ตารางที่แนะนำ (ชื่อ host ชัดเจน = ลดความสับสน)

| host | mode | port | ใครใช้ | เปิดเมื่อ |
| --- | --- | --- | --- | --- |
| `staging.aph-ita.co.th` | staging | 3000 | ทีม dev/QA | ทันที (Phase 1) |
| `uat.aph-ita.co.th` | uat | 3010 | ลูกค้า / ฝ่ายขาย | หลัง parity ผ่าน |
| `new.aph-ita.co.th` | staging → redirect | — | ลิงก์ที่เคยแจกไปแล้ว | 301 หลัง cut-over |
| `www.aph-ita.co.th` | — | — | ผู้ใช้จริง | edge canary |

> กติกา: **ทุก sub-domain ต้องมี noindex และห้ามอยู่ใน sitemap** — ถ้า Google เห็นทั้ง `staging.` และ `www.`
> ในเนื้อหาเดียวกัน จะเกิด soft-duplicate และอันดับจริงอาจแกว่ง

### รันหลาย instance บนเครื่องเดียว

```bash
# 1) อ่านค่าที่ใช้ร่วมกัน (DB, legacy origin, analytics)
sudo mkdir -p /etc/aph
sudo tee /etc/aph/aph-common.env >/dev/null <<'EOF'
NUXT_DB_HOST=127.0.0.1
NUXT_DB_NAME=aph_website
NUXT_DB_USER=aph
NUXT_DB_PASSWORD=***
NUXT_LEGACY_ORIGIN=https://www.aph-ita.co.th
NUXT_PUBLIC_SITE_URL=https://www.aph-ita.co.th
NUXT_PUBLIC_ZERO_PRICE_STYLE=woo
EOF

# 2) ค่าที่ต่างกันต่อ instance
echo 'NUXT_PUBLIC_ROBOTS_NOINDEX=1' | sudo tee /etc/aph/aph-nuxt-3000.env
echo 'NUXT_PUBLIC_ROBOTS_NOINDEX=1' | sudo tee /etc/aph/aph-nuxt-3010.env

# 3) systemd template (รันได้หลาย port จากไฟล์เดียว)
sudo cp deploy/systemd/aph-nuxt@.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now aph-nuxt@3000 aph-nuxt@3010
systemctl status aph-nuxt@3010 --no-pager | head -5
```

### ตรวจทุก sub-domain ด้วยคำสั่งเดียว

```bash
for h in staging.aph-ita.co.th uat.aph-ita.co.th; do
  echo "── $h"; npm run check:staging -- --url https://$h --auth aph:secret
done
```

### ข้อควรระวังเมื่อมีหลาย sub-domain

| เรื่อง | ทำอย่างไร |
| --- | --- |
| ใบรับรอง | `certbot --nginx -d host` ทีละตัว หรือทำ wildcard `*.aph-ita.co.th` (DNS-01) ครั้งเดียวจบ |
| DNS | A record ทีละ sub-domain, TTL 300 — ห้าม CNAME ไป `www` |
| Cloudflare Access แทน Basic Auth | ถ้าเปิด orange cloud + Zero Trust ให้เลือกอย่างใดอย่างหนึ่ง (ซ้อนกันจะได้ 401/302 วน) |
| จำนวน environment | เก็บให้เหลือ 2–3 ตัว (staging, uat) พอ — ยิ่งมากยิ่งลืมปิด noindex/auth |
| เลิกใช้แล้ว | เปลี่ยนเป็น `--mode redirect` (301 → www) แล้วค่อยลบ DNS ทีหลัง 30 วัน |

---

## 7. คำสั่งสรุป

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

# เพิ่ม sub-domain อีกตัว (staging / uat / beta)
npm run vhost:gen -- --host uat.aph-ita.co.th --mode uat --port 3010
sudo cp deploy/generated/uat.aph-ita.co.th.conf /etc/nginx/sites-available/uat.aph-ita.co.th
sudo ln -sf /etc/nginx/sites-available/uat.aph-ita.co.th /etc/nginx/sites-enabled/
sudo certbot --nginx -d uat.aph-ita.co.th --redirect && sudo nginx -t && sudo nginx -s reload

# ทางขึ้นจริง (โดเมนเดิม ไม่มี downtime)
npm run edge:gen -- --rollout 1 && sudo nginx -s reload
```
