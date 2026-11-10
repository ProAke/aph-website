import mysql from 'mysql2/promise'
import type { Pool, RowDataPacket } from 'mysql2/promise'

let pool: Pool | null = null
let retryAfter = 0

export function getPool(): Pool {
  if (!pool) {
    const { db } = useRuntimeConfig()
    pool = mysql.createPool({
      host: db.host,
      port: db.port,
      user: db.user,
      password: db.password,
      database: db.database,
      waitForConnections: true,
      connectionLimit: 8,
      queueLimit: 0,
      charset: 'utf8mb4',
      dateStrings: true,
      connectTimeout: 4000
    })
  }
  return pool
}

/**
 * True when a MariaDB connection can actually be opened.
 * `APH_DATA_SOURCE=json` forces the bundled snapshot, `auto` (default) probes the DB.
 */
export async function dbAvailable(): Promise<boolean> {
  const cfg = useRuntimeConfig()
  if (cfg.dataSource === 'json') return false
  if (Date.now() < retryAfter) return false
  try {
    const conn = await getPool().getConnection()
    try {
      await conn.query('SELECT 1')
    } finally {
      conn.release()
    }
    return true
  } catch {
    // don't hammer a downed database: back off for 15s
    retryAfter = Date.now() + 15_000
    return false
  }
}

export async function query<T extends RowDataPacket = RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await getPool().query<T[]>(sql, params)
  return rows
}

export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  await getPool().execute(sql, params)
}
