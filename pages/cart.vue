<template>
  <div>
    <Breadcrumbs :items="[{ label: 'ตะกร้าสินค้า' }]" />
    <div class="container" style="padding-bottom: 60px">
      <div class="page-head">
        <h1 class="page-head__title">ตะกร้าสินค้า</h1>
        <p class="page-head__desc">ตรวจสอบรายการสินค้าและจำนวนก่อนดำเนินการสั่งซื้อ</p>
      </div>

      <div v-if="!items.length" class="empty">
        <Icon name="cart" :size="40" style="margin: 0 auto 12px" />
        <p>ยังไม่มีสินค้าในตะกร้า</p>
        <NuxtLink to="/products" class="btn">เลือกซื้อสินค้า</NuxtLink>
      </div>

      <div v-else class="with-sidebar" style="grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); padding-bottom: 0">
        <div class="card" style="padding: 8px 22px">
          <div v-for="item in items" :key="item.productId" class="cart-line" style="grid-template-columns: 76px 1fr auto; padding: 18px 0">
            <NuxtLink :to="`/product/${item.slug}`" class="cart-line__img" style="width: 76px; height: 76px">
              <img v-if="item.image" :src="item.image" :alt="item.name" referrerpolicy="no-referrer" />
            </NuxtLink>
            <div>
              <NuxtLink :to="`/product/${item.slug}`" class="cart-line__name" style="font-size: 15px">{{ item.name }}</NuxtLink>
              <div class="small muted">SKU: {{ item.sku || '-' }}</div>
              <div style="display: flex; align-items: center; gap: 14px; margin-top: 8px">
                <div class="qty">
                  <button @click="setQty(item.productId, item.qty - 1)" aria-label="ลด">−</button>
                  <input :value="item.qty" readonly aria-label="จำนวน" />
                  <button @click="setQty(item.productId, item.qty + 1)" aria-label="เพิ่ม">+</button>
                </div>
                <button class="cart-line__rm" @click="remove(item.productId)">ลบรายการ</button>
              </div>
            </div>
            <div style="text-align: right">
              <div class="price">{{ THB(item.price * item.qty) }}</div>
              <div class="small muted">{{ THB(item.price) }} / ชิ้น</div>
            </div>
          </div>
        </div>

        <div class="card" style="position: sticky; top: 130px">
          <h3 style="font-size: 16px; margin-bottom: 14px">สรุปคำสั่งซื้อ</h3>
          <div class="cart-total"><span class="muted" style="font-weight: 400">รวม {{ count }} รายการ</span><span>{{ THB(subtotal) }}</span></div>
          <div class="cart-total" style="font-size: 14px"><span class="muted" style="font-weight: 400">ค่าจัดส่ง</span><span>คำนวณที่ขั้นตอนถัดไป</span></div>
          <hr style="margin: 8px 0 14px" />
          <div class="cart-total" style="font-size: 17px"><span>ยอดรวม</span><span>{{ THB(subtotal) }}</span></div>
          <NuxtLink to="/checkout" class="btn btn--block" style="margin-top: 8px">ดำเนินการสั่งซื้อ</NuxtLink>
          <NuxtLink to="/products" class="btn btn--ghost btn--block" style="margin-top: 8px">เลือกซื้อสินค้าเพิ่ม</NuxtLink>
          <p class="small muted" style="margin-top: 12px">สินค้าบางรายการเป็นราคาโครงการ (แสดง “สอบถามราคา”) เจ้าหน้าที่จะติดต่อกลับเพื่อยืนยันราคา</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { items, count, subtotal, setQty, remove } = useCart()
useHead({ title: 'ตะกร้าสินค้า' })
</script>
