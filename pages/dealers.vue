<template>
  <div>
    <Breadcrumbs :items="[{ label: 'ตัวแทนจำหน่าย' }]" />
    <div class="container" style="padding-bottom: 56px">
      <div class="page-head">
        <div class="section__kicker">Dealers</div>
        <h1 class="page-head__title">ตัวแทนจำหน่ายทั่วประเทศ</h1>
        <p class="page-head__desc">ค้นหาร้านค้าและศูนย์บริการ APH Interactive ตามภาคของคุณ</p>
      </div>

      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px">
        <button
          v-for="r in regions" :key="r" class="btn btn--sm"
          :class="active === r ? '' : 'btn--ghost'" @click="active = r"
        >{{ r }}</button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px" class="dealer-grid">
        <div v-for="d in filtered" :key="d.name + d.province" class="card">
          <div class="badge" style="text-transform: none">{{ d.region }}</div>
          <h3 style="font-size: 16px; margin: 10px 0 6px">{{ d.name }}</h3>
          <div class="small muted" style="display: grid; gap: 6px">
            <span style="display: flex; gap: 8px"><Icon name="pin" :size="15" style="flex: none; margin-top: 3px" />{{ d.address }} จ.{{ d.province }}</span>
            <span v-if="d.phone" style="display: flex; gap: 8px"><Icon name="phone" :size="15" style="flex: none" /><a :href="`tel:${d.phone.replace(/-/g, '')}`">{{ d.phone }}</a></span>
          </div>
          <a
            :href="`https://www.google.com/maps/search/${encodeURIComponent(`${d.name} ${d.province}`)}`"
            target="_blank" rel="noopener" class="btn btn--ghost btn--sm" style="margin-top: 14px"
          ><Icon name="pin" :size="14" /> ดูแผนที่</a>
        </div>
      </div>

      <div class="notice" style="margin-top: 28px">
        รายชื่อตัวแทนจำหน่ายในหน้านี้เป็นข้อมูลตัวอย่างสำหรับโครงสร้างหน้าร้าน
        เมื่อเชื่อมต่อ MariaDB ให้แก้ไขข้อมูลจริงได้ที่ตาราง <code>dealers</code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Dealer } from '~/server/utils/types'

const { data } = await useFetch<{ items: Dealer[] }>('/api/dealers')
const active = ref('ทั้งหมด')
const items = computed(() => data.value?.items || [])
const regions = computed(() => ['ทั้งหมด', ...new Set(items.value.map((d) => d.region))])
const filtered = computed(() => (active.value === 'ทั้งหมด' ? items.value : items.value.filter((d) => d.region === active.value)))

useHead({ title: 'ตัวแทนจำหน่าย' })
</script>

<style scoped>
@media (max-width: 1024px) { .dealer-grid { grid-template-columns: repeat(2, 1fr) !important; } }
@media (max-width: 700px) { .dealer-grid { grid-template-columns: 1fr !important; } }
</style>
