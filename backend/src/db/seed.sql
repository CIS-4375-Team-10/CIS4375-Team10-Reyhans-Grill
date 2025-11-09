INSERT INTO inventory_item (name, type, uom, decimals, low_stock_threshold)
VALUES
  ('Sesame Bun', 'INGREDIENT', 'pcs', 0, 50),
  ('Beef Patty', 'INGREDIENT', 'pcs', 0, 50),
  ('Tomato', 'INGREDIENT', 'slices', 0, 30),
  ('French Fry Potatoes', 'INGREDIENT', 'g', 0, 5000),
  ('Foil Sheet', 'UTENSIL', 'pcs', 0, 100),
  ('Napkin', 'UTENSIL', 'pcs', 0, 200)
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO inventory_balance (item_id, on_hand)
SELECT id, 200
FROM inventory_item
WHERE name IN ('Sesame Bun', 'Beef Patty')
ON DUPLICATE KEY UPDATE on_hand = VALUES(on_hand);

INSERT INTO inventory_balance (item_id, on_hand)
SELECT id, 100
FROM inventory_item
WHERE name IN ('Tomato', 'Foil Sheet', 'Napkin')
ON DUPLICATE KEY UPDATE on_hand = VALUES(on_hand);

INSERT INTO inventory_balance (item_id, on_hand)
SELECT id, 5000
FROM inventory_item
WHERE name = 'French Fry Potatoes'
ON DUPLICATE KEY UPDATE on_hand = VALUES(on_hand);

-- Sample Square catalog variations (replace IDs with your sandbox catalog objects)
INSERT INTO catalog_variation (variation_id, item_name, variation_name, sku)
VALUES
  ('VARIATION_BURGER_STD', 'Classic Burger', 'Default', 'BURG-001'),
  ('VARIATION_FRIES_STD', 'Fries', 'Default', 'SIDE-001')
ON DUPLICATE KEY UPDATE
  item_name = VALUES(item_name),
  variation_name = VALUES(variation_name),
  sku = VALUES(sku);

-- Recipe: burger consumes bun, patty, tomato, foil, napkin
INSERT INTO recipe_component (
  variation_id,
  inventory_item_id,
  qty_per_sale,
  modifier_catalog_object_id
)
SELECT
  'VARIATION_BURGER_STD',
  inventory_item.id,
  CASE inventory_item.name
    WHEN 'Sesame Bun' THEN 2
    WHEN 'Beef Patty' THEN 1
    WHEN 'Tomato' THEN 2
    WHEN 'Foil Sheet' THEN 1
    WHEN 'Napkin' THEN 1
  END AS qty_per_sale,
  ''
FROM inventory_item
WHERE inventory_item.name IN (
  'Sesame Bun',
  'Beef Patty',
  'Tomato',
  'Foil Sheet',
  'Napkin'
)
ON DUPLICATE KEY UPDATE
  qty_per_sale = VALUES(qty_per_sale);

-- Recipe: fries consumes potatoes and napkins
INSERT INTO recipe_component (
  variation_id,
  inventory_item_id,
  qty_per_sale,
  modifier_catalog_object_id
)
SELECT
  'VARIATION_FRIES_STD',
  inventory_item.id,
  CASE inventory_item.name
    WHEN 'French Fry Potatoes' THEN 150
    WHEN 'Napkin' THEN 1
  END AS qty_per_sale,
  ''
FROM inventory_item
WHERE inventory_item.name IN (
  'French Fry Potatoes',
  'Napkin'
)
ON DUPLICATE KEY UPDATE
  qty_per_sale = VALUES(qty_per_sale);
