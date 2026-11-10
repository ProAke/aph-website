-- ============================================================
--  APH Interactive (aph-ita.co.th) — MariaDB schema
--  WordPress/WooCommerce  ->  rewrite on Nuxt 3 + MariaDB
--  charset: utf8mb4 (Thai + emoji safe)  engine: InnoDB
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  id            INT UNSIGNED NOT NULL,
  parent_id     INT UNSIGNED NOT NULL DEFAULT 0,
  slug          VARCHAR(191) NOT NULL,
  name          VARCHAR(191) NOT NULL,
  description   TEXT NULL,
  image_url     VARCHAR(512) NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  product_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_categories_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id                INT UNSIGNED NOT NULL,
  slug              VARCHAR(191) NOT NULL,
  name              VARCHAR(255) NOT NULL,
  sku               VARCHAR(120) NULL,
  short_description TEXT NULL,
  description       LONGTEXT NULL,
  price             DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  regular_price     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency          CHAR(3) NOT NULL DEFAULT 'THB',
  in_stock          TINYINT(1) NOT NULL DEFAULT 1,
  is_featured       TINYINT(1) NOT NULL DEFAULT 0,
  is_published      TINYINT(1) NOT NULL DEFAULT 1,
  rating_avg        DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  rating_count      INT NOT NULL DEFAULT 0,
  datasheet_url     VARCHAR(512) NULL,
  specs             JSON NULL,
  wp_permalink      VARCHAR(512) NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_slug (slug),
  KEY idx_products_sku (sku),
  KEY idx_products_featured (is_featured, is_published),
  FULLTEXT KEY ft_products_search (name, sku, short_description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_categories (
  product_id  INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (product_id, category_id),
  KEY idx_pc_category (category_id),
  CONSTRAINT fk_pc_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_pc_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_images (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED NOT NULL,
  url        VARCHAR(512) NOT NULL,
  alt        VARCHAR(255) NULL,
  position   INT NOT NULL DEFAULT 0,
  wp_media_id INT UNSIGNED NULL,
  PRIMARY KEY (id),
  KEY idx_pi_product (product_id, position),
  CONSTRAINT fk_pi_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id           INT UNSIGNED NOT NULL,
  slug         VARCHAR(191) NOT NULL,
  title        VARCHAR(255) NOT NULL,
  excerpt      TEXT NULL,
  content      LONGTEXT NULL,
  image_url    VARCHAR(512) NULL,
  category     VARCHAR(120) NULL,
  author       VARCHAR(120) NULL DEFAULT 'admin',
  kind         ENUM('news','article') NOT NULL DEFAULT 'news',
  published_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_posts_slug (slug),
  KEY idx_posts_kind (kind, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS banners (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slot       ENUM('hero','promo','service') NOT NULL DEFAULT 'hero',
  title      VARCHAR(255) NOT NULL,
  subtitle   VARCHAR(255) NULL,
  body       TEXT NULL,
  image_url  VARCHAR(512) NULL,
  link_url   VARCHAR(512) NULL,
  link_label VARCHAR(120) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_banners_slot (slot, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalogs (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title      VARCHAR(255) NOT NULL,
  series     VARCHAR(120) NULL,
  image_url  VARCHAR(512) NULL,
  file_url   VARCHAR(512) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dealers (
  id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name     VARCHAR(191) NOT NULL,
  province VARCHAR(120) NOT NULL,
  region   VARCHAR(120) NOT NULL,
  phone    VARCHAR(60) NULL,
  address  VARCHAR(255) NULL,
  map_url  VARCHAR(512) NULL,
  PRIMARY KEY (id),
  KEY idx_dealers_region (region)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code         VARCHAR(40) NOT NULL,
  customer_name VARCHAR(191) NOT NULL,
  email        VARCHAR(191) NULL,
  phone        VARCHAR(60) NOT NULL,
  address      TEXT NULL,
  note         TEXT NULL,
  subtotal     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status       ENUM('pending','confirmed','shipped','cancelled') NOT NULL DEFAULT 'pending',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id   BIGINT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NULL,
  product_name VARCHAR(255) NOT NULL,
  sku        VARCHAR(120) NULL,
  qty        INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id),
  KEY idx_oi_order (order_id),
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_runs (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  source      VARCHAR(191) NOT NULL,
  started_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  products    INT NOT NULL DEFAULT 0,
  posts       INT NOT NULL DEFAULT 0,
  status      VARCHAR(40) NOT NULL DEFAULT 'running',
  message     TEXT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
