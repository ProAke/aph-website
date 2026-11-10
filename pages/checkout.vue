<template>
  <div>
    <Breadcrumbs :items="[{ label: 'ตะกร้าสินค้า', link: '/cart' }, { label: 'สั่งซื้อสินค้า' }]" />
    <div class="container" style="padding-bottom: 60px; max-width: 1080px">
      <div class="page-head">
        <h1 class="page-head__title">สั่งซื้อสินค้า</h1>
        <p class="page-head__desc">กรอกข้อมูลผู้ติดต่อ เจ้าหน้าที่จะยืนยันคำสั่งซื้อและราคาภายใน 1 วันทำการ</p>
      </div>

      <div v-if="done" class="card" style="text-align: center; padding: 44px">
        <Icon name="check" :size="44" style="margin: 0 auto 14px; color: var(--green)" />
        <h2 style="font-size: 22px">ได้รับคำสั่งซื้อแล้ว</h2>
        <p class="muted">หมายเลขอ้างอิง <strong>{{ result.code }}</strong></p>
        <div v-if="!result.stored" class="notice" style="max-width: 560px; margin: 16px auto; text-align: left">
          โหมดตัวอย่างข้อมูล (snapshot) — คำสั่งซื้อนี้ยังไม่ถูกบันทึกลง MariaDB
          เมื่อเชื่อมต่อฐานข้อมูลแล้ว คำสั่งซื้อจะถูกบันทึกในตาราง <code>orders</code> / <code>order_items</code>
        </div>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 18px">
          <NuxtLink to="/products" class="btn">เลือกซื้อสินค้าต่อ</NuxtLink>
          <NuxtLink to="/" class="btn btn--ghost">กลับหน้าแรก</NuxtLink>
        </div>
      </div>

      <div v-else-if="!items.length" class="empty">
        <p>ไม่มีสินค้าในตะกร้า</p>
        <NuxtLink to="/products" class="btn">เลือกซื้อสินค้า</NuxtLink>
      </div>

      <form v-else class="with-sidebar" style="grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); padding-bottom: 0" @submit.prevent="submit">
        <div class="card">
          <h3 style="font-size: 16px; margin-bottom: 16px">ข้อมูลผู้สั่งซื้อ</h3>
          <div class="form-grid">
            <div class="field">
              <label for="name">ชื่อ–นามสกุล *</label>
              <input id="name" v-model="form.customerName" required placeholder="เช่น สมชาย ใจดี" />
            </div>
            <div class="field">
              <label for="phone">เบอร์โทรศัพท์ *</label>
              <input id="phone" v-model="form.phone" required placeholder="08X-XXX-XXXX" />
            </div>
          </div>
          <div class="field">
            <label for="email">อีเมล</label>
            <input id="email" v-model="form.email" type="email" placeholder="you@company.com" />
          </div>
          <div class="field">
            <label for="address">ที่อยู่จัดส่ง / ที่อยู่ออกใบกำกับภาษี</label>
            <textarea id="address" v-model="form.address" rows="3" placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์" />
          </div>
          <div class="field">
            <label for="note">หมายเหตุ</label>
            <textarea id="note" v-model="form.note" rows="2" placeholder="เช่น ต้องการใบเสนอราคา / ระบุผู้ติดต่อหน้างาน" />
          </div>

          <div v-if="errorMsg" class="notice notice--err" style="margin-bottom: 14px">{{ errorMsg }}</div>
          <button class="btn btn--block" type="submit" :disabled="submitting">
            {{ submitting ? 'กำลังส่งคำสั่งซื้อ…' : 'ยืนยันคำสั่งซื้อ' }}
          </button>
        </div>

        <div class="card" style="align-self: start">
          <h3 style="font-size: 16px; margin-bottom: 14px">รายการสินค้า ({{ count }})</h3>
          <div v-for="item in items" :key="item.productId" class="cart-line" style="grid-template-columns: 46px 1fr auto; padding: 10px 0">
            <div class="cart-line__img" style="width: 46px; height: 46px">
              <img v-if="item.image" :src="item.image" :alt="item.name" referrerpolicy="no-referrer" />
            </div>
            <div>
              <div class="cart-line__name" style="font-size: 13px">{{ item.name }}</div>
              <div class="small muted">จำนวน {{ item.qty }}</div>
            </div>
            <div class="small">{{ THB(item.price * item.qty) }}</div>
          </div>
          <hr style="margin: 12px 0" />
          <div class="cart-total"><span>ยอดรวม</span><span>{{ THB(subtotal) }}</span></div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const { items, count, subtotal, clear } = useCart()
const toast = useToast()
const form = reactive({ customerName: '', phone: '', email: '', address: '', note: '' })
const submitting = ref(false)
const done = ref(false)
const errorMsg = ref('')
const result = ref<{ code: string; stored: boolean }>({ code: '', stored: false })

async function submit() {
  submitting.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch<{ code: string; stored: boolean }>('/api/orders', {
      method: 'POST',
      body: { ...form, items: items.value.map((i) => ({ ...i })) }
    })
    result.value = res
    done.value = true
    clear()
    toast.show('ส่งคำสั่งซื้อเรียบร้อย')
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || 'ไม่สามารถส่งคำสั่งซื้อได้ กรุณาลองใหม่'
  } finally {
    submitting.value = false
  }
}

useHead({ title: 'สั่งซื้อสินค้า' })
</script>
