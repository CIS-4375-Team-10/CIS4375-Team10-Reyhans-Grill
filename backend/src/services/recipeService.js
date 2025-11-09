import { query } from '../config/db.js';

const normalizeModifier = (modifier) => modifier || '';

const mapRecipeRow = (row) => ({
  id: row.id,
  variationId: row.variation_id,
  inventoryItemId: row.inventory_item_id,
  inventoryItemName: row.inventory_item_name,
  qtyPerSale: Number(row.qty_per_sale),
  modifierCatalogObjectId: normalizeModifier(row.modifier_catalog_object_id),
  itemDecimals: row.item_decimals,
});

export const getRecipeComponentsByVariationIds = async (
  variationIds,
  connection,
) => {
  if (!variationIds || variationIds.length === 0) {
    return new Map();
  }

  const uniqueIds = [...new Set(variationIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const sql = `
    SELECT
      rc.id,
      rc.variation_id,
      rc.inventory_item_id,
      rc.qty_per_sale,
      rc.modifier_catalog_object_id,
      ii.name AS inventory_item_name,
      ii.decimals AS item_decimals
    FROM recipe_component rc
    INNER JOIN inventory_item ii
      ON ii.id = rc.inventory_item_id
    WHERE rc.variation_id IN (?)
  `;

  const executor = connection ?? { query };
  const [rows] = await executor.query(sql, [uniqueIds]);

  const map = new Map();
  for (const row of rows) {
    const component = mapRecipeRow(row);
    if (!map.has(component.variationId)) {
      map.set(component.variationId, []);
    }
    map.get(component.variationId).push(component);
  }

  return map;
};

export const getRecipeForVariation = async (variationId) => {
  const [rows] = await query(
    `
      SELECT
        rc.id,
        rc.variation_id,
        rc.inventory_item_id,
        rc.qty_per_sale,
        rc.modifier_catalog_object_id,
        ii.name AS inventory_item_name,
        ii.uom,
        ii.decimals AS item_decimals
      FROM recipe_component rc
      INNER JOIN inventory_item ii
        ON ii.id = rc.inventory_item_id
      WHERE rc.variation_id = ?
      ORDER BY ii.name
    `,
    [variationId],
  );

  return rows.map((row) => ({
    ...mapRecipeRow(row),
    uom: row.uom,
  }));
};

export const upsertRecipeComponent = async ({
  variationId,
  inventoryItemId,
  qtyPerSale,
  modifierCatalogObjectId,
}) => {
  const modifier = normalizeModifier(modifierCatalogObjectId);
  await query(
    `
      INSERT INTO recipe_component (
        variation_id,
        inventory_item_id,
        qty_per_sale,
        modifier_catalog_object_id
      )
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        qty_per_sale = VALUES(qty_per_sale)
    `,
    [variationId, inventoryItemId, qtyPerSale, modifier],
  );
};

export const deleteRecipeComponent = async ({
  variationId,
  inventoryItemId,
  modifierCatalogObjectId,
}) => {
  const modifier = normalizeModifier(modifierCatalogObjectId);
  await query(
    `
      DELETE FROM recipe_component
      WHERE variation_id = ?
        AND inventory_item_id = ?
        AND modifier_catalog_object_id = ?
    `,
    [variationId, inventoryItemId, modifier],
  );
};
