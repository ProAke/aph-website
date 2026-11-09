export default defineEventHandler(async () => {
  const store = await getStore()
  return {
    ok: true,
    dataSource: store.name === 'db' ? 'mariadb' : 'snapshot',
    time: new Date().toISOString()
  }
})
