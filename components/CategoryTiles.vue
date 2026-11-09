<template>
  <div class="cats">
    <NuxtLink v-for="t in tiles" :key="t.link" :to="t.link" class="cat-tile">
      <div class="cat-tile__img">
        <img :src="t.image" :alt="t.name" loading="lazy" referrerpolicy="no-referrer" />
      </div>
      <div class="cat-tile__name">{{ t.name }}</div>
      <div class="cat-tile__sub">{{ t.sub }}</div>
      <span class="cat-tile__cta">{{ t.cta }} <Icon name="arrowRight" :size="14" /></span>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
const W = 'https://www.aph-ita.co.th/wp-content/uploads'
defineProps<{ tiles?: any[] }>()
const tiles = [
  {
    name: 'Amphenol Dante', sub: 'AMPHENOL AMPHE-DANTE ADAPTERS — Professional 1-Channel & 2-Channel Dante Audio Solutions',
    image: `${W}/2026/08/Amphenol_Date-scaled.jpeg`, link: '/product-category/dante', cta: 'ดูข้อมูลเพิ่มเติม'
  },
  {
    name: 'XLRnet', sub: 'เทียบสัญญานเหนือชั้นกว่าแบรนด์อื่น ตัวเล็กแต่ได้สัญญานคม ไม่พลาดทุกการเชื่อมต่อ',
    image: `${W}/2026/05/ethernet_promotion.png`, link: '/product-category/ethernet/xlrnet', cta: 'ดูข้อมูลเพิ่มเติม'
  },
  {
    name: 'XLR', sub: 'หัวต่อสัญญาณเสียง AC / AX Series มาตรฐานงานมืออาชีพ',
    image: `${W}/2026/08/1_XLR_chassis_Mounts-1.png`, link: '/product-category/xlr', cta: 'ดูรายละเอียดเพิ่มเติม'
  },
  {
    name: 'Power', sub: 'หัวต่อไฟ HP / HPT Series รับกระแสสูง พร้อมระบบล็อก',
    image: `${W}/2026/08/Power.png`, link: '/product-category/power', cta: 'ดูรายละเอียดเพิ่มเติม'
  },
  {
    name: 'Loudspeaker', sub: 'SP / EP / AP Series หัวต่อลำโพง 2 และ 4 ขั้ว',
    image: `${W}/2026/08/SP-4-FS-1.jpg`, link: '/product-category/loudspeaker', cta: 'ดูรายละเอียดเพิ่มเติม'
  },
  {
    name: 'Multipin', sub: 'MP-41 / MP-62 รวมสายหลายชุดในหัวต่อเดียว',
    image: `${W}/2026/08/8Multipin.jpg`, link: '/product-category/multipin', cta: 'ดูรายละเอียดเพิ่มเติม'
  },
  {
    name: 'RCA', sub: 'ACPR / ACPL / ACJR งาน Audio & Video',
    image: `${W}/2026/08/6_rca.jpg`, link: '/product-category/rca', cta: 'ดูรายละเอียดเพิ่มเติม'
  },
  {
    name: 'Mini XLR', sub: 'AG Series ขนาดกะทัดรัด สำหรับงานพื้นที่จำกัด',
    image: `${W}/2026/08/7.mini_xlr.jpg`, link: '/product-category/mini-xlr', cta: 'ดูรายละเอียดเพิ่มเติม'
  }
]
</script>
