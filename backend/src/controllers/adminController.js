import Joi from 'joi';
import { query, withTransaction } from '../config/db.js';
import logger from '../config/logger.js';
import {
  listInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  adjustInventoryBalance,
  listLowStockItems,
  getLedgerEntries,
  getRecentLedgerForItem,
} from '../services/inventoryService.js';
import {
  getRecipeForVariation,
  upsertRecipeComponent,
  deleteRecipeComponent,
} from '../services/recipeService.js';
import { getCatalogVariations } from '../services/orderService.js';

const itemSchema = Joi.object({
  name: Joi.string().max(120).required(),
  type: Joi.string().valid('INGREDIENT', 'UTENSIL').required(),
  uom: Joi.string().max(32).required(),
  decimals: Joi.number().integer().min(0).max(3).default(0),
  lowStockThreshold: Joi.number().optional().allow(null),
  initialOnHand: Joi.number().optional(),
});

const itemUpdateSchema = Joi.object({
  name: Joi.string().max(120),
  type: Joi.string().valid('INGREDIENT', 'UTENSIL'),
  uom: Joi.string().max(32),
  decimals: Joi.number().integer().min(0).max(3),
  lowStockThreshold: Joi.number().allow(null),
  active: Joi.boolean(),
})
  .min(1)
  .required();

const adjustmentSchema = Joi.object({
  delta: Joi.number().required(),
  reason: Joi.string().valid('MANUAL', 'PHYSICAL_COUNT').required(),
  note: Joi.string().max(255).allow('', null),
});

const recipeSchema = Joi.object({
  variationId: Joi.string().max(64).required(),
  inventoryItemId: Joi.number().integer().positive().required(),
  qtyPerSale: Joi.number().positive().required(),
  modifierCatalogObjectId: Joi.string().max(64).allow('', null),
  remove: Joi.boolean().default(false),
});

const ledgerQuerySchema = Joi.object({
  itemId: Joi.number().integer().positive().optional(),
  reason: Joi.string()
    .valid('SALE', 'REFUND', 'MANUAL', 'RECON', 'PHYSICAL_COUNT')
    .optional(),
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
  start: Joi.date().optional(),
  end: Joi.date().optional(),
});

const itemLedgerQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
});

export const getItems = async (_req, res) => {
  const items = await listInventoryItems();
  res.json({ items });
};

export const createItemHandler = async (req, res) => {
  const { value, error } = itemSchema.validate(req.body, {
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const item = await createInventoryItem(value);
  res.status(201).json({ item });
};

export const updateItemHandler = async (req, res) => {
  const { id } = req.params;
  const { value, error } = itemUpdateSchema.validate(req.body, {
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const updated = await updateInventoryItem(Number(id), value);
  if (!updated) {
    return res.status(404).json({ error: 'Inventory item not found' });
  }

  res.json({ item: updated });
};

export const adjustItemHandler = async (req, res) => {
  const { id } = req.params;
  const { value, error } = adjustmentSchema.validate(req.body, {
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const updated = await adjustInventoryBalance(Number(id), value);
    res.json({ item: updated });
  } catch (err) {
    logger.error({ err, itemId: id }, 'Failed to adjust inventory');
    res.status(400).json({ error: err.message });
  }
};

export const getLowStockHandler = async (_req, res) => {
  const items = await listLowStockItems();
  res.json({ items });
};

export const getLedgerHandler = async (req, res) => {
  const { value, error } = ledgerQuerySchema.validate(req.query, {
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const entries = await getLedgerEntries({
    itemId: value.itemId,
    reason: value.reason,
    limit: value.limit,
    offset: value.offset,
    startDate: value.start,
    endDate: value.end,
  });

  res.json({ entries, pagination: { limit: value.limit, offset: value.offset } });
};

export const getItemLedgerHandler = async (req, res) => {
  const { value, error } = itemLedgerQuerySchema.validate(req.query, {
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const entries = await getRecentLedgerForItem(Number(req.params.id), value.limit);
  res.json({ entries });
};

export const getRecipeHandler = async (req, res) => {
  const { variation } = req.params;
  const components = await getRecipeForVariation(variation);
  res.json({ components });
};

export const upsertRecipeHandler = async (req, res) => {
  const { value, error } = recipeSchema.validate(req.body, {
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  if (value.remove) {
    await deleteRecipeComponent(value);
    return res.json({ removed: true });
  }

  await upsertRecipeComponent(value);
  res.status(201).json({ ok: true });
};

export const syncCatalogHandler = async (_req, res) => {
  const variations = await getCatalogVariations();

  await withTransaction(async (connection) => {
    for (const variation of variations) {
      await connection.execute(
        `
          INSERT INTO catalog_variation (
            variation_id,
            item_name,
            variation_name,
            sku
          ) VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            item_name = VALUES(item_name),
            variation_name = VALUES(variation_name),
            sku = VALUES(sku),
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          variation.variationId,
          variation.itemName,
          variation.variationName,
          variation.sku,
        ],
      );
    }
  });

  res.json({ synced: variations.length });
};

export const getCatalogEntriesHandler = async (_req, res) => {
  const [rows] = await query(
    `
      SELECT variation_id, item_name, variation_name, sku, updated_at
      FROM catalog_variation
      ORDER BY item_name ASC, variation_name ASC
    `,
  );

  res.json({ variations: rows });
};
