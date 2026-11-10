import { dbAvailable } from './db'
import { sqlStore } from './store-sql'
import { jsonStore } from './store-json'
import type { Store } from './types'

let lastUsed: { name: string; at: number } = { name: 'json', at: 0 }

export async function getStore(): Promise<Store> {
  const useDb = await dbAvailable()
  const store = useDb ? sqlStore : jsonStore
  lastUsed = { name: store.name, at: Date.now() }
  return store
}

export function dataSource(): string {
  return lastUsed.name === 'db' ? 'mariadb' : 'snapshot'
}
