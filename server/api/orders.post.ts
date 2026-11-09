export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = String(body?.customerName || '').trim()
  const phone = String(body?.phone || '').trim()
  const items = Array.isArray(body?.items) ? body.items : []

  if (name.length < 2) throw createError({ statusCode: 400, statusMessage: 'กรุณากรอกชื่อผู้รับ' })
  if (!/^[0-9+\-\s()]{8,20}$/.test(phone)) throw createError({ statusCode: 400, statusMessage: 'กรุณากรอกเบอร์โทรให้ถูกต้อง' })
  if (!items.length) throw createError({ statusCode: 400, statusMessage: 'ไม่มีสินค้าในตะกร้า' })

  const store = await getStore()
  const result = await store.createOrder({
    customerName: name,
    phone,
    email: body?.email ? String(body.email) : undefined,
    address: body?.address ? String(body.address) : undefined,
    note: body?.note ? String(body.note) : undefined,
    items: items.map((i: any) => ({
      productId: Number(i.productId) || undefined,
      name: String(i.name || '').slice(0, 250),
      sku: i.sku ? String(i.sku).slice(0, 100) : undefined,
      qty: Math.max(1, Math.min(999, Number(i.qty) || 1)),
      price: Number(i.price) || 0
    }))
  })
  return { ok: true, ...result, source: store.name }
})
