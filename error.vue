<template>
  <div style="min-height: 100vh; display: grid; place-items: center; padding: 40px 20px; background: var(--bg-soft)">
    <div class="card" style="max-width: 560px; text-align: center; padding: 46px 34px">
      <div class="logo__mark" style="margin: 0 auto 18px; width: 56px; height: 56px; font-size: 16px">APH</div>
      <h1 style="font-size: 30px; letter-spacing: -.02em">{{ error.statusCode }} — ไม่พบหน้าที่ต้องการ</h1>
      <p class="muted" style="margin-top: 10px">
        {{ error.statusCode === 404 ? 'หน้านี้ถูกย้ายหรือถูกลบไปแล้ว ลองค้นหาสินค้าหรือกลับไปหน้าแรก' : 'เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง' }}
      </p>
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 22px">
        <button class="btn" @click="handleError">กลับหน้าแรก</button>
        <NuxtLink to="/products" class="btn btn--ghost">ดูสินค้าทั้งหมด</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'
const props = defineProps<{ error: NuxtError }>()
const handleError = () => clearError({ redirect: '/' })
useHead({ title: `${props.error.statusCode} — ไม่พบหน้า` })
</script>
