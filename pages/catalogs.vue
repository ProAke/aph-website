<template>
  <div>
    <Breadcrumbs :items="[{ label: 'แคตตาล็อกสินค้า' }]" />
    <div class="container" style="padding-bottom: 56px">
      <div class="page-head">
        <div class="section__kicker">Downloads</div>
        <h1 class="page-head__title">แคตตาล็อกและเอกสารสินค้า</h1>
        <p class="page-head__desc">ดาวน์โหลดแคตตาล็อก Amphenol และใบข้อมูลสินค้า (Datasheet) เป็นไฟล์ PDF</p>
      </div>
      <CatalogCards :items="items" />
      <div class="notice" style="margin-top: 28px">
        ไฟล์ PDF เชื่อมโยงไปยังคลังเอกสารของเว็บไซต์เดิม (aph-ita.co.th) — เมื่อทำ migration เสร็จสามารถคัดลอกไฟล์มาไว้ที่
        <code>/public/downloads</code> และแก้ไขคอลัมน์ <code>file_url</code> ในตาราง <code>catalogs</code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: boot } = await useBootstrap()
const items = computed(() => boot.value?.catalogs || [])
useHead({ title: 'แคตตาล็อกสินค้า' })
</script>
