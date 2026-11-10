<template>
  <footer class="footer">
    <div class="container">
      <div class="footer__top">
        <div class="footer__about">
          <NuxtLink to="/" class="logo" style="margin-bottom: 14px">
            <span class="logo__mark">APH</span>
            <span class="logo__text" style="color: #fff">
              <span class="logo__name">APH <span style="color: var(--brand)">Interactive</span></span>
              <span class="logo__sub" style="color: #8d99ac">Amphenol Distributor</span>
            </span>
          </NuxtLink>
          <p>{{ site.description }}</p>
          <div class="footer__socials">
            <a :href="site.facebook" target="_blank" rel="noopener" aria-label="Facebook"><Icon name="facebook" :size="16" /></a>
            <a :href="site.instagram" target="_blank" rel="noopener" aria-label="Instagram"><Icon name="instagram" :size="16" /></a>
            <a :href="site.line?.url" target="_blank" rel="noopener" aria-label="LINE"><Icon name="chat" :size="16" /></a>
            <a :href="`mailto:${site.email}`" aria-label="อีเมล"><Icon name="mail" :size="16" /></a>
          </div>
        </div>

        <div>
          <h5>หมวดหมู่สินค้า</h5>
          <div class="footer__links">
            <NuxtLink v-for="c in categories.slice(0, 8)" :key="c.id" :to="`/product-category/${c.path}`">{{ c.name }}</NuxtLink>
            <NuxtLink to="/products"><strong>สินค้าทั้งหมด</strong></NuxtLink>
          </div>
        </div>

        <div>
          <h5>บริการและข้อมูล</h5>
          <div class="footer__links">
            <NuxtLink to="/about">เกี่ยวกับเรา</NuxtLink>
            <NuxtLink to="/articles">บทความและสาระน่ารู้</NuxtLink>
            <NuxtLink to="/catalogs">ดาวน์โหลดแคตตาล็อก</NuxtLink>
            <NuxtLink to="/dealers">ตัวแทนจำหน่าย</NuxtLink>
            <NuxtLink to="/contact">ติดต่อสอบถาม</NuxtLink>
            <NuxtLink to="/cart">ตะกร้าสินค้า</NuxtLink>
          </div>
        </div>

        <div>
          <h5>ติดต่อเรา</h5>
          <div class="footer__contact">
            <div><Icon name="pin" :size="16" style="flex: none; margin-top: 3px" /><span>{{ site.legalName }}<br>{{ site.addressTh }}</span></div>
            <div><Icon name="phone" :size="16" style="flex: none" /><span><a v-for="(p, i) in site.phones" :key="p" :href="`tel:${p.replace(/-/g, '')}`">{{ p }}<template v-if="i < site.phones.length - 1">, </template></a></span></div>
            <div><Icon name="mail" :size="16" style="flex: none" /><a :href="`mailto:${site.email}`">{{ site.email }}</a></div>
            <div><Icon name="clock" :size="16" style="flex: none" /><span>{{ site.hours }}</span></div>
          </div>
        </div>
      </div>

      <div class="footer__bottom">
        <span>© {{ new Date().getFullYear() }} {{ site.englishName }} · เลขทะเบียนนิติบุคคล {{ site.taxId }}</span>
        <span>Nuxt 3 + MariaDB · ข้อมูลอ้างอิงจาก <a :href="site.sourceSite" target="_blank" rel="noopener">aph-ita.co.th</a></span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import type { CategoryNode } from '~/server/utils/types'
defineProps<{ site: Record<string, any>; categories: CategoryNode[] }>()
</script>
