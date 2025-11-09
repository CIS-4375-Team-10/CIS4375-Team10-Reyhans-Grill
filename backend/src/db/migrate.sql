-- Reyhan's Grill inventory schema migration
-- Execute with: mysql -u user -p reyhans_grill < src/db/migrate.sql

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS inventory_item (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  type ENUM('INGREDIENT', 'UTENSIL') NOT NULL,
  uom VARCHAR(32) NOT NULL,
  decimals TINYINT UNSIGNED DEFAULT 0,
  active TINYINT(1) DEFAULT 1,
  low_stock_threshold DECIMAL(12,3) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_inventory_item_name_type (name, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_balance (
  item_id BIGINT UNSIGNED NOT NULL,
  on_hand DECIMAL(14,3) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id),
  CONSTRAINT fk_inventory_balance_item
    FOREIGN KEY (item_id) REFERENCES inventory_item(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_variation (
  variation_id VARCHAR(64) NOT NULL,
  item_name VARCHAR(160) NULL,
  variation_name VARCHAR(160) NULL,
  sku VARCHAR(120) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (variation_id),
  KEY idx_catalog_variation_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recipe_component (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  variation_id VARCHAR(64) NOT NULL,
  inventory_item_id BIGINT UNSIGNED NOT NULL,
  qty_per_sale DECIMAL(12,4) NOT NULL,
  modifier_catalog_object_id VARCHAR(64) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_recipe_component_variation
    FOREIGN KEY (variation_id) REFERENCES catalog_variation(variation_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_recipe_component_item
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_item(id)
    ON DELETE CASCADE,
  UNIQUE KEY uniq_recipe_component (
    variation_id,
    inventory_item_id,
    modifier_catalog_object_id
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_ledger (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id BIGINT UNSIGNED NOT NULL,
  delta DECIMAL(14,3) NOT NULL,
  reason ENUM('SALE','REFUND','MANUAL','RECON','PHYSICAL_COUNT') NOT NULL,
  square_event_id VARCHAR(100) DEFAULT NULL,
  square_payment_id VARCHAR(100) DEFAULT NULL,
  square_refund_id VARCHAR(100) DEFAULT NULL,
  square_order_id VARCHAR(100) DEFAULT NULL,
  occurred_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note VARCHAR(255) DEFAULT NULL,
  CONSTRAINT fk_stock_ledger_item
    FOREIGN KEY (item_id) REFERENCES inventory_item(id)
    ON DELETE RESTRICT,
  UNIQUE KEY uniq_stock_event_item (square_event_id, item_id),
  KEY idx_stock_ledger_item_occurred (item_id, occurred_at),
  KEY idx_stock_ledger_reason (reason)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS webhook_event (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(100) NOT NULL,
  type VARCHAR(80) NOT NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME DEFAULT NULL,
  status ENUM('RECEIVED','PROCESSED','SKIPPED','ERROR') DEFAULT 'RECEIVED',
  error TEXT DEFAULT NULL,
  UNIQUE KEY uniq_webhook_event (event_id),
  KEY idx_webhook_event_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Helper view to inspect balances alongside metadata.
CREATE OR REPLACE VIEW inventory_item_with_balance AS
SELECT
  i.id,
  i.name,
  i.type,
  i.uom,
  i.decimals,
  i.active,
  i.low_stock_threshold,
  b.on_hand,
  IF(
    i.low_stock_threshold IS NULL,
    NULL,
    IF(b.on_hand <= i.low_stock_threshold, 1, 0)
  ) AS is_low_stock
FROM inventory_item i
LEFT JOIN inventory_balance b ON b.item_id = i.id;
