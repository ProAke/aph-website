export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = String(body?.name || '').trim()
  const message = String(body?.message || '').trim()
  if (name.length < 2) throw createError({ statusCode: 400, statusMessage: 'กรุณากรอกชื่อ' })
  if (message.length < 5) throw createError({ statusCode: 400, statusMessage: 'กรุณากรอกข้อความ' })
  // Wire this to SMTP / a CRM later – for now we log to the server console.
  console.info('[contact]', { name, email: body?.email, phone: body?.phone, product: body?.product, message })
  return { ok: true, receivedAt: new Date().toISOString() }
})
