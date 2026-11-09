<template>
  <div v-if="isOpen" class="cart-drawer">
    <div class="cart-drawer__backdrop" @click="isOpen = false" />
    <aside class="cart-drawer__panel" aria-label="ตะกร้าสินค้า">
      <div class="cart-drawer__head">
        <strong>ตะกร้าสินค้า ({{ count }})</strong>
        <button class="icon-btn" aria-label="ปิด" @click="isOpen = false"><Icon name="close" :size="20" /></button>
      </div>
      <div class="cart-drawer__body">
        <div v-if="!items.length" class="empty">
          <Icon name="cart" :size="34" style="margin: 0 auto 10px" />
          <p>ยังไม่มีสินค้าในตะกร้า</p>
          <NuxtLink to="/products" class="btn btn--sm" @click="isOpen = false">เลือกซื้อสินค้า</NuxtLink>
        </div>
        <div v-for="item in items" :key="item.productId" class="cart-line">
          <NuxtLink :to="`/product/${item.slug}`" class="cart-line__img" @click="isOpen = false">
            <img v-if="item.image" :src="item.image" :alt="item.name" referrerpolicy="no-referrer" />
          </NuxtLink>
          <div>
            <NuxtLink :to="`/product/${item.slug}`" class="cart-line__name" @click="isOpen = false">{{ item.name }}</NuxtLink>
            <div class="small muted">SKU: {{ item.sku }}</div>
            <div class="qty" style="margin-top: 6px; transform: scale(.88); transform-origin: left">
              <button @click="setQty(item.productId, item.qty - 1)" aria-label="ลด">−</button>
              <input :value="item.qty" readonly />
              <button @click="setQty(item.productId, item.qty + 1)" aria-label="เพิ่ม">+</button>
            </div>
          </div>
          <div style="text-align: right">
            <div class="price" style="font-size: 13px">{{ THB(item.price * item.qty) }}</div>
            <button class="cart-line__rm" @click="remove(item.productId)">ลบ</button>
          </div>
        </div>
      </div>
      <div v-if="items.length" class="cart-drawer__foot">
        <div class="cart-total"><span>รวมทั้งหมด</span><span>{{ THB(subtotal) }}</span></div>
        <p class="small muted" style="margin-bottom: 10px">ราคาสำหรับสินค้าที่มีราคาแสดง · สินค้าบางรายการต้องสอบถามราคา</p>
        <NuxtLink to="/checkout" class="btn btn--block" @click="isOpen = false">ดำเนินการสั่งซื้อ</NuxtLink>
        <NuxtLink to="/cart" class="btn btn--ghost btn--block" style="margin-top: 8px" @click="isOpen = false">ดูตะกร้าทั้งหมด</NuxtLink>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
const { items, isOpen, count, subtotal, setQty, remove } = useCart()
</script>
