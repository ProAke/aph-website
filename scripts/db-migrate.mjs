#!/usr/bin/env node
/**
 * Applies every file in database/migrations/*.sql in order.
 * Scripts are written to be idempotent (CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT EXISTS),
 * so running this repeatedly is safe.
 *
 *   npm run db:migrate
 */
import mysql from 'mysql2/promise'
import { readdir, readFile } from 'node:fs/promises'
import { dbConfig } from './env.mjs'

const dir = new URL('../database/migrations/', import.meta.url)
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true })

await conn.query(`CREATE TABLE IF NOT EXISTS _migrations (
  name VARCHAR(191) NOT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

for (const file of files) {
  const [rows] = await conn.query('SELECT name FROM _migrations WHERE name = ?', [file])
  if (rows.length) { console.log(`· skip ${file} (already applied)`); continue }
  const sql = await readFile(new URL(file, dir), 'utf8')
  await conn.query(sql)
  await conn.query('INSERT INTO _migrations (name) VALUES (?)', [file])
  console.log(`✔ applied ${file}`)
}
await conn.end()
