#!/usr/bin/env node
/**
 * Health probe for the delta sync — wire this to your monitoring (cron + alert, Zabbix, Uptime Kuma…).
 *
 *   node scripts/sync-health.mjs            # exit 0 = fresh, 1 = stale/failed, 2 = degraded
 *
 * "Fresh" means: the last successful sync finished less than MAX_AGE_MINUTES ago and nobody
 * has failed twice in a row. During the migration this is the metric that decides whether
 * a canary step may continue.
 */
import mysql from 'mysql2/promise'
import { dbConfig } from './env.mjs'

const MAX_AGE_MINUTES = Number(process.env.SYNC_MAX_AGE_MINUTES || 15)
const conn = await mysql.createConnection(dbConfig)

const [[state]] = await conn.query(
  "SELECT MAX(CASE WHEN `key`='sync:last_run' THEN `value` END) AS last_run, MAX(CASE WHEN `key`='sync:last_status' THEN `value` END) AS last_status FROM sync_state"
)
const [runs] = await conn.query(
  "SELECT id, status, started_at, finished_at, products, posts, message FROM import_runs ORDER BY id DESC LIMIT 3"
)

const lastRun = state?.last_run ? new Date(state.last_run) : null
const ageMinutes = lastRun ? (Date.now() - lastRun.getTime()) / 60000 : Infinity
const consecutiveFailures = (() => {
  let n = 0
  for (const r of runs) { if (r.status === 'failed') n++; else break }
  return n
})()

const verdict =
  !lastRun ? 'never-run'
  : consecutiveFailures >= 2 ? 'failed'
  : ageMinutes > MAX_AGE_MINUTES ? 'stale'
  : state.last_status === 'failed' ? 'degraded'
  : 'fresh'

console.log(JSON.stringify({
  verdict,
  lastRun: lastRun ? lastRun.toISOString() : null,
  ageMinutes: Number.isFinite(ageMinutes) ? Number(ageMinutes.toFixed(1)) : null,
  maxAgeMinutes: MAX_AGE_MINUTES,
  consecutiveFailures,
  recentRuns: runs
}, null, 2))

await conn.end()
process.exit(verdict === 'fresh' ? 0 : verdict === 'degraded' ? 2 : 1)
