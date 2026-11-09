#!/usr/bin/env node
/**
 * Creates the MariaDB database (if missing) and applies database/schema.sql.
 *   npm run db:init            # create database + tables
 *   npm run db:init -- --reset # DROP the database first (destructive)
 */
import mysql from 'mysql2/promise'
import { readFileSync } from 'node:fs'
import { dbConfig } from './env.mjs'

const reset = process.argv.includes('--reset')
const { database, ...server } = dbConfig

const conn = await mysql.createConnection({ ...server, multipleStatements: true })
console.log(`→ connected to ${server.user}@${server.host}:${server.port}`)

if (reset) {
  await conn.query(`DROP DATABASE IF EXISTS \`${database}\``)
  console.log(`✖ dropped database ${database}`)
}
await conn.query(
  `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
)
console.log(`✔ database ${database} ready`)

await conn.query(`USE \`${database}\``)
const schema = readFileSync(new URL('../database/schema.sql', import.meta.url), 'utf8')
await conn.query(schema)
console.log('✔ schema applied (database/schema.sql)')

const [tables] = await conn.query('SHOW TABLES')
console.log(`  tables: ${tables.map((t) => Object.values(t)[0]).join(', ')}`)
await conn.end()
