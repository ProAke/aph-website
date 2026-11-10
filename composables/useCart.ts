export interface CartItem {
  productId: number
  slug: string
  name: string
  sku: string | null
  price: number
  image: string | null
  qty: number
}

const KEY = 'aph.cart.v1'

export function useCart() {
  const items = useState<CartItem[]>('cart-items', () => [])
  const isOpen = useState<boolean>('cart-open', () => false)
  const loaded = useState<boolean>('cart-loaded', () => false)

  function persist() {
    if (!import.meta.client) return
    localStorage.setItem(KEY, JSON.stringify(items.value))
  }

  function init() {
    if (!import.meta.client || loaded.value) return
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) items.value = JSON.parse(raw)
    } catch {
      items.value = []
    }
    loaded.value = true
  }

  function add(item: Omit<CartItem, 'qty'>, qty = 1) {
    const found = items.value.find((i) => i.productId === item.productId)
    if (found) found.qty = Math.min(999, found.qty + qty)
    else items.value = [...items.value, { ...item, qty }]
    persist()
    isOpen.value = true
  }

  function setQty(productId: number, qty: number) {
    const found = items.value.find((i) => i.productId === productId)
    if (!found) return
    found.qty = Math.max(1, Math.min(999, qty))
    items.value = [...items.value]
    persist()
  }

  function remove(productId: number) {
    items.value = items.value.filter((i) => i.productId !== productId)
    persist()
  }

  function clear() {
    items.value = []
    persist()
  }

  const count = computed(() => items.value.reduce((s, i) => s + i.qty, 0))
  const subtotal = computed(() => items.value.reduce((s, i) => s + i.qty * i.price, 0))

  return { items, isOpen, count, subtotal, init, add, setQty, remove, clear }
}

export function useToast() {
  const message = useState<string>('toast-message', () => '')
  const visible = useState<boolean>('toast-visible', () => false)
  let timer: ReturnType<typeof setTimeout> | null = null
  function show(msg: string) {
    message.value = msg
    visible.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => (visible.value = false), 2400)
  }
  return { message, visible, show }
}
