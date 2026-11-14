# Deploy หลายโดเมนบนโฮสต์เดียว (www = แม่, sub-domain = ลูก)

> สรุปสั้น: **โค้ดชุดเดียว, build ทีละ release, แต่ละโดเมนชี้ไปที่ release ที่ตัวเองเลือก**
> — deploy `staging` ไม่กระทบ `uat`, deploy `www` ไม่ทำให้ผู้ใช้หลุดแม้แต่ request เดียว

---

## 1. ภาพรวมบนเครื่องเดียว

```
                          ┌──────────────────────────── HOST (1 เครื่อง) ───────────────────────────┐
  ผู้ใช้จริง ───────────► │ nginx :443                                                              │
  www.aph-ita.co.th       │  ├─ server www   → upstream aph_new ──► 127.0.0.1:3020 (blue)          │
                          │  │                                    127.0.0.1:3030 (green)         │
  ทีมงาน ───────────────► │  ├─ server staging (Basic Auth) ─────► 127.0.0.1:3000                   │
  staging.aph-ita.co.th   │  └─ server uat (noindex) ────────────► 127.0.0.1:3010                   │
                          │                                                                         │
                          │  /srv/aph/current-3000  ─┐                                              │
                          │  /srv/aph/current-3010  ─┼─► symlink → /srv/aph/releases/<env>-<ts>-<sha> │
                          │  /srv/aph/current-3020  ─┤                                              │
                          │  /srv/aph/current-3030  ─┘   (node_modules ใช้ร่วมที่ /srv/aph/shared)   │
                          │                                                                         │
                          │  MariaDB: aph_website (www) · aph_website_staging · aph_website_uat     │
                          └─────────────────────────────────────────────────────────────────────────┘
```

**ทำไมต้อง blue/green เฉพาะ www** — staging/uat  restart 2–3 วินาทีไม่มีใครเดือดร้อน
แต่ www คือผู้ใช้จริง จึงมี 2 port: deploy ลง port ที่ *ไม่ได้ใช้งาน* → ตรวจสุขภาพ → สลับ upstream
(worst case = 0 request ที่หลุด) และ rollback = สลับกลับใน 1 วินาที

---

## 2. แผนที่ environment (แหล่งความจริงเดียว: `deploy/environments.json`)

| name | host | port | DB | systemd | ใครใช้ |
| --- | --- | --- | --- | --- | --- |
| `staging` | staging.aph-ita.co.th | 3000 | `aph_website_staging` | `aph-nuxt@3000` | dev/QA (Basic Auth) |
| `uat` | uat.aph-ita.co.th | 3010 | `aph_website_uat` | `aph-nuxt@3010` | ฝ่ายขาย/ลูกค้า (แชร์ลิงก์) |
| `www` | www.aph-ita.co.th | 3020 blue / 3030 green | `aph_website` | `aph-nuxt@3020`, `aph-nuxt@3030` | ผู้ใช้จริง |

ไฟล์ที่ผูกกับแผนที่นี้ทั้งหมด: vhost (`npm run vhost:gen -- --all`), deploy (`deploy/deploy.sh`),
รีเฟรช DB (`deploy/refresh-db.sh`) — แก้ที่เดียว ไม่ต้องจำ port/DB เอง

---

## 3. Deploy แต่ละโดเมน (คำสั่งที่ใช้จริง)

```bash
# staging — build ใหม่ + restart :3000
./deploy/deploy.sh --env staging

# uat — build ใหม่ + restart :3010
./deploy/deploy.sh --env uat

# www — ลง port ที่ว่างอัตโนมัติ (blue/green) ไม่มี request หลุด
./deploy/deploy.sh --env www

# ดูว่าจะทำอะไรก่อน (ไม่แก้อะไร)
./deploy/deploy.sh --env www --dry-run

# ย้อนกลับ
./deploy/deploy.sh --env staging --rollback          # ชี้ symlink กลับ release ก่อนหน้า
./deploy/deploy.sh --env www --slot green            # สลับ upstream กลับไปอีกฝั่ง
```

สิ่งที่สคริปต์ทำให้ (ตามลำดับ):

1. `git archive <ref>` → `releases/<env>-<UTC>-<sha>` (โฟลเดอร์ใหม่ทุกครั้ง = ไม่มี deploy ครึ่งๆ กลางๆ)
2. `npm run build` ในโฟลเดอร์นั้น (`node_modules` ใช้ร่วมจาก `shared/` → เร็ว ประหยัดดิสก์)
3. ชี้ `current-<port>` ไปที่ release ใหม่ → `systemctl restart aph-nuxt@<port>`
4. ยิง `/api/health` จนได้ `"ok":true` (สูงสุด 40 วินาที)
   **ถ้าไม่ผ่าน → ชี้ symlink กลับ release เดิม + restart ให้อัตโนมัติ แล้วจบด้วย exit 1**
5. (www) เขียน `/etc/nginx/aph-upstream-www.conf` → `nginx -t` → `nginx -s reload`
   **ถ้า nginx config ไม่ผ่าน → คืนค่าไฟล์เดิม ไม่สลับ traffic**
6. เก็บ release เก่าไว้ `keepReleases` ชุด (ค่าเริ่มต้น 5) + เขียน log ที่ `shared/deploy.log`

---

## 4. ลำดับการปล่อย (สำคัญ: staging ก่อนเสมอ)

```
code review → deploy staging → ตรวจ 30 นาที → deploy/allowed? → deploy uat → ลูกค้าเซ็น → deploy www
```

| ขั้น | คำสั่ง | เกณฑ์ผ่าน |
| --- | --- | --- |
| 1. staging | `./deploy/deploy.sh --env staging` | `npm run check:staging -- --url https://staging.aph-ita.co.th --auth aph:…` ผ่านทุกข้อ |
| 2. parity | `npm run parity -- --old https://www.aph-ita.co.th --new https://staging.aph-ita.co.th --limit 400` | FAIL = 0, diff ≤ 5 % |
| 3. uat | `./deploy/deploy.sh --env uat` | ลูกค้า/ฝ่ายขายกดบนมือถือผ่าน, `/my-account` ยัง 302 ไป WordPress |
| 4. www | `./deploy/deploy.sh --env www` | `curl -sI https://www.aph-ita.co.th/ \| grep -i x-aph` → ฝั่งใหม่, error rate ไม่ขึ้น |

> **หมายเหตุช่วง migration:** `www` ยังเป็น WordPress จนกว่าจะถึง canary
> (`npm run edge:gen -- --rollout 100`) — deploy Nuxt ลง www ทำได้ตลอด (ผู้ใช้ยังไม่เห็น) และปลอดภัย
> เพราะยังไม่มี traffic ไปที่ port เหล่านั้น

---

## 5. Database: แยกหรือใช้ร่วม?

คำถามคือ “แยก DB ได้ไหม” — **ได้ และแผนนี้แยกให้อยู่แล้ว** (staging / uat / www คนละชื่อ)
แต่ต้องเลือกนโยบายให้ชัด:

| แนวทาง | ข้อดี | ข้อเสีย | เหมาะเมื่อ |
| --- | --- | --- | --- |
| **A. DB เดียวกันทั้งสาม** | ข้อมูลตรงกัน 100 %, sync ที่เดียว, parity เชื่อถือได้ | staging ทำ import ผิด = prod เจอ | ช่วง migration (ข้อมูลมาจาก WP อยู่แล้ว) |
| **B. แยก DB ต่อ env** (ค่าเริ่มต้นในรีโป) | staging พังไม่กระทบใคร, ซ้อม migration ได้ | ต้องรีเฟรชให้ตรง, เปลืองพื้นที่ ~3 เท่า | ใช้งานระยะยาว (หลัง cut-over) |
| **C. ผสม**: www แยก, staging+uat ใช้ร่วม | ประหยัด + ปลอดภัยกับ prod | staging/uat แชร์กัน (ยอมรับได้) | ทีมเล็ก |

สลับไป A ได้ทันที: แก้ `db` ของทุก env ใน `deploy/environments.json` เป็น `aph_website` แล้ว deploy ใหม่ (ไม่ต้อง build ใหม่ ถ้าไม่แก้ env ฝั่ง client)

### รีเฟรช DB ของ sub-domain ให้ตรงกับ production

```bash
./deploy/refresh-db.sh --to staging                    # dry run
./deploy/refresh-db.sh --to staging --apply            # คัดลอกทั้งฐาน
./deploy/refresh-db.sh --to uat --apply --sanitize     # ปิดอีเมล/เบอร์โทรก่อนลง uat
```

- ใช้ `mysqldump --single-transaction` → ไม่ล็อกตารางของ production
- ตรวจว่าฐานปลายทาง **มีอยู่แล้ว** (ไม่สร้างชื่อที่พิมพ์ผิด), ปฏิเสธถ้า source = target
- ⚠ ข้อมูลมี PII ของลูกค้า: ใช้ `--sanitize` เมื่อให้คนนอกเข้าถึง และลบสำเนาเมื่อจบ UAT

ตั้ง cron รีเฟรชก่อนออฟฟิศเปิด (เช่น 06:30 ทุกวัน):

```cron
30 6 * * *  aph  cd /srv/aph && ./deploy/refresh-db.sh --to staging --apply --sanitize >> /var/log/aph-db-refresh.log 2>&1
```

---

## 6. Rollback (ซ้อมไว้ก่อน ไม่ใช่คิดตอนไฟไหม้)

| สถานการณ์ | คำสั่ง | เวลา | ผลกระทบ |
| --- | --- | --- | --- |
| staging/uat มีบั๊ก | `./deploy/deploy.sh --env staging --rollback` | ~5 วิ | ไม่มี |
| www build ใหม่มีปัญหา **ก่อน** สลับ | ไม่ต้องทำอะไร — สคริปต์ rollback เอง (health check fail) | ~40 วิ | ไม่มี (traffic ยังอยู่ฝั่งเดิม) |
| www มีปัญหาหลังสลับ | `./deploy/deploy.sh --env www --slot <ฝั่งเดิม>` | ~10 วิ | ไม่มี (ฝั่งเดิมยัง warm อยู่) |
| DB เสียหาย | `refresh-db.sh` หรือ restore snapshot | 5–30 นาที | ขึ้นกับข้อมูล |

**หลักการ**: เก็บ release เก่าไว้เสมอ (5 ชุด) และอย่าลบ `node_modules` ร่วม เพราะ rollback ต้องใช้ทันทีโดยไม่ต้อง build

---

## 7. สิทธิ์ (sudoers) — ให้ deploy ไม่ต้องกรอกรหัส

```bash
sudo visudo -f /etc/sudoers.d/aph-deploy
```
```
aph ALL=(root) NOPASSWD: /bin/systemctl restart aph-nuxt@*, /bin/systemctl status aph-nuxt@*
aph ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /sbin/nginx -t, /bin/systemctl reload nginx
aph ALL=(root) NOPASSWD: /usr/bin/install -m 644 * /etc/nginx/aph-upstream-www.conf
aph ALL=(root) NOPASSWD: /bin/cp -f /etc/nginx/aph-upstream-www.conf /etc/nginx/aph-upstream-www.conf.bak
```
หรือให้ผู้ดูแลเป็นคนรัน `sudo ./deploy/deploy.sh ...` (ปลอดภัยกว่า แต่ช้ากว่า)

---

## 8. Bootstrap ครั้งแรก (ทำครั้งเดียว)

```bash
# 1) ผู้ใช้ + โฟลเดอร์
sudo useradd -r -m -d /srv/aph -s /bin/bash aph
sudo mkdir -p /srv/aph/releases /srv/aph/shared /etc/aph
sudo chown -R aph:aph /srv/aph

# 2) โค้ด + dependencies (ติดตั้งครั้งเดียว ใช้ร่วมทุก release)
sudo -u aph git clone https://github.com/ProAke/aph-website.git /srv/aph/repo
cd /srv/aph/repo && sudo -u aph npm ci --include=dev
sudo ln -sfn /srv/aph/repo/node_modules /srv/aph/shared/node_modules

# 3) env
sudo install -m 640 -o root -g aph deploy/env/aph-common.env.example    /etc/aph/aph-common.env
sudo install -m 640 -o root -g aph deploy/env/aph-nuxt-3000.env.example /etc/aph/aph-nuxt-3000.env
sudo install -m 640 -o root -g aph deploy/env/aph-nuxt-3010.env.example /etc/aph/aph-nuxt-3010.env
# www blue/green (ค่าเหมือนกัน ต่างแค่ PORT)
sudo cp /etc/aph/aph-nuxt-3010.env /etc/aph/aph-nuxt-3020.env && sudo sed -i 's/3010/3020/' /etc/aph/aph-nuxt-3020.env
sudo cp /etc/aph/aph-nuxt-3010.env /etc/aph/aph-nuxt-3030.env && sudo sed -i 's/3010/3030/' /etc/aph/aph-nuxt-3030.env

# 4) systemd + nginx
sudo cp deploy/systemd/aph-nuxt@.service /etc/systemd/system/
sudo systemctl daemon-reload
npm run vhost:gen -- --all && sudo ./deploy/install-subdomains.sh --apply
sudo bash -c 'echo "server 127.0.0.1:3020 max_fails=2 fail_timeout=5s;" > /etc/nginx/aph-upstream-www.conf'
sudo nginx -t && sudo nginx -s reload

# 5) deploy แรก
sudo -u aph ./deploy/deploy.sh --env staging
```

---

## 9. Checklist ก่อน deploy ทุกครั้ง

- [ ] merge เข้า `main` แล้ว (deploy ใช้ `origin/main` เป็นค่าเริ่มต้น)
- [ ] `./deploy/deploy.sh --env staging` ผ่าน health + `check:staging`
- [ ] ถ้าแก้ schema: `--migrate` **เฉพาะ** env ที่ต้องการ (ค่าเริ่มต้นคือไม่รัน — กันพลาดรันบน prod)
- [ ] ถ้าแก้ `NUXT_PUBLIC_*`: แก้ `/etc/aph/aph-nuxt-<port>.env` แล้ว restart instance นั้น (ไม่ต้อง build ใหม่)
- [ ] www: deploy ช่วงที่มีคนเฝ้า 30 นาทีแรก
- [ ] เก็บ log: `shared/deploy.log`, `journalctl -u aph-nuxt@<port> -n 100`

## 10. คำถามที่พบบ่อย

**build ต้องทำทุก env ไหม?** ทำทุก env เพื่อความชัวร์ว่า release นั้น “แช่แข็ง” จริง (`--no-build` มีไว้ใช้เมื่อ deploy ซ้ำ release เดิม) — ใช้เวลา ~20 วินาทีต่อครั้ง

**deploy staging กับ uat พร้อมกันได้ไหม?** ได้ (คนละ port/คนละ symlink) แต่ build พร้อมกันจะแย่ง CPU — รอให้ตัวแรกจบก่อน

**www deploy ตอนคนเยอะได้ไหม?** ได้ เพราะสลับที่ nginx ไม่ได้ restart ฝั่งที่เสิร์ฟอยู่ — แต่ยังแนะนำให้เลี่ยงช่วงพีคของออเดอร์

**ถ้า health check ไม่ผ่านเพราะ DB ล่ม?** สคริปต์จะ rollback release แต่แอปเดิมก็ยังชี้ DB เดิมที่ล่ม → ต้องแก้ที่ DB (นี่คือเหตุผลที่ `refresh-db.sh` แยกจาก deploy)

**เพิ่มโดเมนที่ 4 (เช่น `beta`)?** เพิ่ม entry ใน `deploy/environments.json` → `npm run vhost:gen -- --all` → สร้าง env `/etc/aph/aph-nuxt-<port>.env` → `systemctl enable --now aph-nuxt@<port>` → `./deploy/deploy.sh --env beta`
