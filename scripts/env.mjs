import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// minimal .env loader (no dependency)
const envPath = resolve(process.cwd(), '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

export const dbConfig = {
  host: process.env.NUXT_DB_HOST || process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.NUXT_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.NUXT_DB_USER || process.env.DB_USER || 'aph',
  password: process.env.NUXT_DB_PASSWORD || process.env.DB_PASSWORD || 'aph_secret',
  database: process.env.NUXT_DB_NAME || process.env.DB_NAME || 'aph_website'
}

export const WP_BASE = process.env.WP_BASE || 'https://www.aph-ita.co.th'
