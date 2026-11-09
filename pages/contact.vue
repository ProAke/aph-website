<template>
  <div>
    <Breadcrumbs :items="[{ label: 'ติดต่อเรา' }]" />
    <div class="container" style="padding-bottom: 56px">
      <div class="page-head">
        <div class="section__kicker">Contact</div>
        <h1 class="page-head__title">ติดต่อสอบถาม</h1>
        <p class="page-head__desc">สอบถามข้อมูลสินค้า ราคาโครงการ หรือขอใบเสนอราคา ทีมงานพร้อมให้บริการ</p>
      </div>

      <div class="with-sidebar" style="grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr); padding-bottom: 0">
        <div class="card">
          <h3 style="font-size: 17px">{{ site.legalName }}</h3>
          <hr style="margin: 12px 0" />
          <div style="display: grid; gap: 14px; font-size: 14px">
            <div style="display: flex; gap: 10px"><Icon name="pin" :size="16" style="flex: none; margin-top: 4px" /><span>{{ site.addressTh }}<br /><span class="muted small">{{ site.addressEn }}</span></span></div>
            <div style="display: flex; gap: 10px"><Icon name="phone" :size="16" style="flex: none" /><span><a v-for="p in site.phones" :key="p" :href="`tel:${p.replace(/-/g, '')}`" style="display: block">{{ p }}</a></span></div>
            <div style="display: flex; gap: 10px"><Icon name="mail" :size="16" style="flex: none" /><a :href="`mailto:${site.email}`">{{ site.email }}</a></div>
            <div style="display: flex; gap: 10px"><Icon name="chat" :size="16" style="flex: none" /><a :href="site.line?.url" target="_blank" rel="noopener">LINE {{ site.line?.label }}</a></div>
            <div style="display: flex; gap: 10px"><Icon name="clock" :size="16" style="flex: none" /><span>{{ site.hours }}</span></div>
            <div style="display: flex; gap: 10px"><Icon name="shield" :size="16" style="flex: none" /><span class="muted small">เลขทะเบียนนิติบุคคล {{ site.taxId }}</span></div>
          </div>
        </div>

        <form class="card" @submit.prevent="submit">
          <h3 style="font-size: 17px; margin-bottom: 16px">ส่งข้อความถึงเรา</h3>
          <div class="form-grid">
            <div class="field">
              <label for="name">ชื่อ *</label>
              <input id="name" v-model="form.name" required />
            </div>
            <div class="field">
              <label for="phone">เบอร์โทร</label>
              <input id="phone" v-model="form.phone" />
            </div>
          </div>
          <div class="field">
            <label for="email">อีเมล *</label>
            <input id="email" v-model="form.email" type="email" required />
          </div>
          <div class="field">
            <label for="product">สินค้าที่สนใจ</label>
            <input id="product" v-model="form.product" placeholder="เช่น SP-4-MDVT-8" />
          </div>
          <div class="field">
            <label for="message">ข้อความ *</label>
            <textarea id="message" v-model="form.message" rows="5" required placeholder="รายละเอียดที่ต้องการสอบถาม" />
          </div>
          <div v-if="error" class="notice notice--err" style="margin-bottom: 14px">{{ error }}</div>
          <div v-if="sent" class="notice notice--ok" style="margin-bottom: 14px">ส่งข้อความเรียบร้อย ทีมงานจะติดต่อกลับโดยเร็ว</div>
          <button class="btn" type="submit" :disabled="sending">{{ sending ? 'กำลังส่ง…' : 'ส่งข้อความ' }}</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { data: boot } = await useBootstrap()
const site = computed(() => boot.value?.site || {})
const toast = useToast()

const form = reactive({ name: '', phone: '', email: '', product: '', message: '' })
const sending = ref(false)
const sent = ref(false)
const error = ref('')

onMounted(() => {
  if (route.query.product) form.product = String(route.query.product)
  if (route.query.sku) form.message = `สนใจสินค้า SKU: ${route.query.sku}`
})

async function submit() {
  sending.value = true
  error.value = ''
  try {
    await $fetch('/api/contact', { method: 'POST', body: form })
    sent.value = true
    toast.show('ส่งข้อความเรียบร้อย')
    form.message = ''
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'ส่งข้อความไม่สำเร็จ'
  } finally {
    sending.value = false
  }
}

useHead({ title: 'ติดต่อเรา' })
</script>
