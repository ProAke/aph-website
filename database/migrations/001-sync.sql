-- ============================================================
--  001-sync.sql — objects needed for zero-downtime WordPress sync
--  Safe to run repeatedly (idempotent). Applied by:
--    npm run db:migrate
--  and automatically by scripts/sync-wordpress.mjs
-- ============================================================

-- bookkeeping for the incremental importer / delta sync
CREATE TABLE IF NOT EXISTS sync_state (
  `key`       VARCHAR(120) NOT NULL,
  `value`     VARCHAR(255) NULL,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- products: keep WP lifecycle state so deletions become soft-deletes (410-able, never 404-spikes)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS wp_modified DATETIME NULL AFTER wp_permalink,
  ADD COLUMN IF NOT EXISTS wp_status   VARCHAR(20) NOT NULL DEFAULT 'publish' AFTER wp_modified;

ALTER TABLE products
  ADD KEY IF NOT EXISTS idx_products_modified (wp_modified),
  ADD KEY IF NOT EXISTS idx_products_published (is_published, id);

-- posts: same treatment (news/articles can be unpublished in WP)
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_published TINYINT(1) NOT NULL DEFAULT 1 AFTER kind,
  ADD COLUMN IF NOT EXISTS wp_modified DATETIME NULL AFTER published_at,
  ADD COLUMN IF NOT EXISTS wp_status VARCHAR(20) NOT NULL DEFAULT 'publish' AFTER wp_modified;

ALTER TABLE posts
  ADD KEY IF NOT EXISTS idx_posts_published (is_published, published_at);

-- categories: remember the WP term id + permalink path for parity checks
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS path VARCHAR(255) NULL AFTER slug,
  ADD COLUMN IF NOT EXISTS wp_count INT NOT NULL DEFAULT 0 AFTER product_count;

CREATE INDEX IF NOT EXISTS idx_categories_path ON categories (path);
