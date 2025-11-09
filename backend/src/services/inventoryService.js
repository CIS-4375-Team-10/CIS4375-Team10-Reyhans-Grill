import { query, withTransaction } from '../config/db.js';
import logger from '../config/logger.js';
import { getRecipeComponentsByVariationIds } from './recipeService.js';

const roundTo = (value, decimals = 3) => {
  const factor = 10 ** decimals;
  return Math.round(Number(value) * factor) / factor;
};

const parseQuantity = (quantity) => {
  if (quantity == null) return 0;
  const parsed = Number.parseFloat(quantity);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeReason = (reason) => reason?.toUpperCase();

const fetchItemById = async (itemId, connection) => {
  const executor = connection ?? { query };
  const [rows] = await executor.query(
    `
      SELECT
        i.id,
        i.name,
        i.type,
        i.uom,
        i.decimals,
        i.low_stock_threshold,
        i.active,
        COALESCE(b.on_hand, 0) AS on_hand
      FROM inventory_item i
      LEFT JOIN inventory_balance b
        ON b.item_id = i.id
      WHERE i.id = ?
    `,
    [itemId],
  );

  return rows[0] ? mapInventoryRow(rows[0]) : null;
};

const mapInventoryRow = (row) => ({
  id: row.id,
  name: row.name,
  type: row.type,
  uom: row.uom,
  decimals: row.decimals,
  active: Boolean(row.active),
  lowStockThreshold:
    row.low_stock_threshold == null ? null : Number(row.low_stock_threshold),
  onHand: row.on_hand == null ? 0 : Number(row.on_hand),
  isLowStock:
    row.low_stock_threshold == null
      ? false
      : Number(row.on_hand) <= Number(row.low_stock_threshold),
});

const writeLedger = async (connection, entry) => {
  const {
    itemId,
    delta,
    reason,
    occurredAt,
    squareEventId = null,
    squarePaymentId = null,
    squareRefundId = null,
    squareOrderId = null,
    note = null,
  } = entry;

  try {
    const [result] = await connection.execute(
      `
        INSERT INTO stock_ledger (
          item_id,
          delta,
          reason,
          square_event_id,
          square_payment_id,
          square_refund_id,
          square_order_id,
          occurred_at,
          note
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        itemId,
        delta,
        reason,
        squareEventId,
        squarePaymentId,
        squareRefundId,
        squareOrderId,
        occurredAt,
        note,
      ],
    );

    return result.insertId;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      logger.warn(
        {
          itemId,
          reason,
          squareEventId,
        },
        'Skipping duplicate ledger entry for Square event',
      );
      return null;
    }
    throw error;
  }
};

const upsertBalance = async (connection, itemId, delta) => {
  await connection.execute(
    `
      INSERT INTO inventory_balance (item_id, on_hand)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE on_hand = inventory_balance.on_hand + VALUES(on_hand)
    `,
    [itemId, delta],
  );
};

export const listInventoryItems = async () => {
  const [rows] = await query(
    `
      SELECT
        i.id,
        i.name,
        i.type,
        i.uom,
        i.decimals,
        i.active,
        i.low_stock_threshold,
        COALESCE(b.on_hand, 0) AS on_hand
      FROM inventory_item i
      LEFT JOIN inventory_balance b
        ON b.item_id = i.id
      ORDER BY i.name ASC
    `,
  );

  return rows.map(mapInventoryRow);
};

export const listLowStockItems = async () => {
  const [rows] = await query(
    `
      SELECT
        i.id,
        i.name,
        i.type,
        i.uom,
        i.decimals,
        i.active,
        i.low_stock_threshold,
        COALESCE(b.on_hand, 0) AS on_hand
      FROM inventory_item i
      LEFT JOIN inventory_balance b
        ON b.item_id = i.id
      WHERE i.low_stock_threshold IS NOT NULL
        AND COALESCE(b.on_hand, 0) <= i.low_stock_threshold
      ORDER BY i.name ASC
    `,
  );

  return rows.map(mapInventoryRow);
};

export const createInventoryItem = async ({
  name,
  type,
  uom,
  decimals,
  lowStockThreshold,
  initialOnHand = null,
}) => {
  const itemId = await withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `
        INSERT INTO inventory_item (
          name,
          type,
          uom,
          decimals,
          low_stock_threshold
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [name, type, uom, decimals, lowStockThreshold],
    );

    const newItemId = result.insertId;

    const openingQuantity =
      initialOnHand == null ? null : Number.parseFloat(initialOnHand);

    if (openingQuantity != null && !Number.isNaN(openingQuantity)) {
      await connection.execute(
        `
          INSERT INTO inventory_balance (item_id, on_hand)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE on_hand = VALUES(on_hand)
        `,
        [newItemId, openingQuantity],
      );

      await writeLedger(connection, {
        itemId: newItemId,
        delta: openingQuantity,
        reason: 'MANUAL',
        occurredAt: new Date(),
        note: 'Initial balance',
      });
    } else {
      await connection.execute(
        `
          INSERT INTO inventory_balance (item_id, on_hand)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE on_hand = VALUES(on_hand)
        `,
        [newItemId, 0],
      );
    }

    return newItemId;
  });

  return fetchItemById(itemId);
};

export const updateInventoryItem = async (itemId, updates) => {
  const fields = [];
  const params = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    params.push(updates.name);
  }
  if (updates.type !== undefined) {
    fields.push('type = ?');
    params.push(updates.type);
  }
  if (updates.uom !== undefined) {
    fields.push('uom = ?');
    params.push(updates.uom);
  }
  if (updates.decimals !== undefined) {
    fields.push('decimals = ?');
    params.push(updates.decimals);
  }
  if (updates.lowStockThreshold !== undefined) {
    fields.push('low_stock_threshold = ?');
    params.push(updates.lowStockThreshold);
  }
  if (updates.active !== undefined) {
    fields.push('active = ?');
    params.push(updates.active ? 1 : 0);
  }

  if (!fields.length) {
    return fetchItemById(itemId);
  }

  params.push(itemId);

  await query(
    `
      UPDATE inventory_item
      SET ${fields.join(', ')}
      WHERE id = ?
    `,
    params,
  );

  return fetchItemById(itemId);
};

export const adjustInventoryBalance = async (
  itemId,
  { delta, reason, note },
) => {
  const normalizedReason = normalizeReason(reason);
  if (!['MANUAL', 'PHYSICAL_COUNT'].includes(normalizedReason)) {
    throw new Error('Adjustments must use MANUAL or PHYSICAL_COUNT reason');
  }

  const numericDelta = Number.parseFloat(delta);
  if (Number.isNaN(numericDelta) || numericDelta === 0) {
    throw new Error('Adjustment delta must be a non-zero number');
  }

  await withTransaction(async (connection) => {
    const ledgerId = await writeLedger(connection, {
      itemId,
      delta: roundTo(numericDelta, 3),
      reason: normalizedReason,
      occurredAt: new Date(),
      note: note ?? null,
    });

    if (ledgerId) {
      await upsertBalance(connection, itemId, roundTo(numericDelta, 3));
    }
  });

  return fetchItemById(itemId);
};

export const getLedgerEntries = async ({
  itemId,
  reason,
  limit = 50,
  offset = 0,
  startDate,
  endDate,
}) => {
  const filters = [];
  const params = [];

  if (itemId) {
    filters.push('l.item_id = ?');
    params.push(itemId);
  }

  if (reason) {
    filters.push('l.reason = ?');
    params.push(reason);
  }

  if (startDate) {
    filters.push('l.occurred_at >= ?');
    params.push(startDate);
  }

  if (endDate) {
    filters.push('l.occurred_at <= ?');
    params.push(endDate);
  }

  const sanitizedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const sanitizedOffset = Math.max(Number(offset) || 0, 0);

  const [rows] = await query(
    `
      SELECT
        l.id,
        l.item_id,
        i.name AS item_name,
        i.uom,
        l.delta,
        l.reason,
        l.square_event_id,
        l.square_payment_id,
        l.square_refund_id,
        l.square_order_id,
        l.occurred_at,
        l.created_at,
        l.note
      FROM stock_ledger l
      INNER JOIN inventory_item i ON i.id = l.item_id
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY l.occurred_at DESC, l.id DESC
      LIMIT ?
      OFFSET ?
    `,
    [...params, sanitizedLimit, sanitizedOffset],
  );

  return rows.map((row) => ({
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    uom: row.uom,
    delta: Number(row.delta),
    reason: row.reason,
    squareEventId: row.square_event_id,
    squarePaymentId: row.square_payment_id,
    squareRefundId: row.square_refund_id,
    squareOrderId: row.square_order_id,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    note: row.note,
  }));
};

export const getRecentLedgerForItem = async (itemId, limit = 50) => {
  const [rows] = await query(
    `
      SELECT
        l.id,
        l.item_id,
        l.delta,
        l.reason,
        l.square_event_id,
        l.square_payment_id,
        l.square_refund_id,
        l.square_order_id,
        l.occurred_at,
        l.created_at,
        l.note
      FROM stock_ledger l
      WHERE l.item_id = ?
      ORDER BY l.occurred_at DESC, l.id DESC
      LIMIT ?
    `,
    [itemId, Math.min(Math.max(limit, 1), 200)],
  );

  return rows.map((row) => ({
    id: row.id,
    delta: Number(row.delta),
    reason: row.reason,
    squareEventId: row.square_event_id,
    squarePaymentId: row.square_payment_id,
    squareRefundId: row.square_refund_id,
    squareOrderId: row.square_order_id,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    note: row.note,
  }));
};

const buildUsageMap = async (order, connection) => {
  const lineItems = order?.lineItems || order?.line_items || [];
  if (!lineItems.length) {
    return new Map();
  }

  const variationIds = lineItems
    .map((item) => item.catalogObjectId || item.catalog_object_id)
    .filter(Boolean);

  const recipeMap = await getRecipeComponentsByVariationIds(
    variationIds,
    connection,
  );

  const usage = new Map();

  for (const lineItem of lineItems) {
    const variationId = lineItem.catalogObjectId || lineItem.catalog_object_id;
    const quantity = parseQuantity(lineItem.quantity);

    if (!variationId || !quantity) {
      continue;
    }

    const components = recipeMap.get(variationId) || [];
    if (!components.length) {
      logger.warn(
        {
          variationId,
          lineItemName: lineItem.name,
        },
        'Order line has no recipe mapping; skipping inventory usage',
      );
      continue;
    }

    const modifierIds = (lineItem.modifiers || []).reduce((acc, modifier) => {
      const id = modifier.catalogObjectId || modifier.catalog_object_id;
      if (id) acc.push(id);
      return acc;
    }, []);

    for (const component of components) {
      const isModifierComponent =
        component.modifierCatalogObjectId &&
        component.modifierCatalogObjectId.length > 0;

      if (isModifierComponent) {
        if (!modifierIds.includes(component.modifierCatalogObjectId)) {
          continue;
        }
      } else if (modifierIds.length && components.some((candidate) =>
        candidate.inventoryItemId === component.inventoryItemId &&
        candidate.modifierCatalogObjectId &&
        modifierIds.includes(candidate.modifierCatalogObjectId)
      )) {
        // Base component with modifier-specific override already counted.
        continue;
      }

      const perSaleQty = Number(component.qtyPerSale);
      const decimals =
        component.itemDecimals == null ? 3 : Math.min(component.itemDecimals, 3);

      if (!usage.has(component.inventoryItemId)) {
        usage.set(component.inventoryItemId, {
          total: 0,
          decimals,
          itemName: component.inventoryItemName,
        });
      }

      const entry = usage.get(component.inventoryItemId);
      entry.total += perSaleQty * quantity;
      entry.decimals = Math.min(entry.decimals, decimals);
      usage.set(component.inventoryItemId, entry);
    }
  }

  for (const [itemId, entry] of usage.entries()) {
    usage.set(itemId, {
      ...entry,
      total: roundTo(entry.total, entry.decimals ?? 3),
    });
  }

  return usage;
};

const applyUsageDeltas = async (usageMap, context, multiplier) => {
  if (!usageMap || usageMap.size === 0) {
    return;
  }

  await withTransaction(async (connection) => {
    for (const [itemId, { total, decimals }] of usageMap.entries()) {
      if (!total) continue;

      const delta = roundTo(total * multiplier, decimals ?? 3);

      const ledgerId = await writeLedger(connection, {
        itemId,
        delta,
        reason: context.reason,
        occurredAt: context.occurredAt,
        squareEventId: context.squareEventId,
        squarePaymentId: context.squarePaymentId,
        squareRefundId: context.squareRefundId,
        squareOrderId: context.squareOrderId,
        note: context.note ?? null,
      });

      if (ledgerId) {
        await upsertBalance(connection, itemId, delta);
      }
    }
  });
};

export const decrementForSale = async (eventContext, order) => {
  const usageMap = await buildUsageMap(order);
  await applyUsageDeltas(usageMap, {
    ...eventContext,
    reason: 'SALE',
  }, -1);
};

export const incrementForRefund = async (eventContext, order) => {
  const usageMap = await buildUsageMap(order);
  await applyUsageDeltas(usageMap, {
    ...eventContext,
    reason: 'REFUND',
  }, 1);
};

export const ensureInventoryItemExists = fetchItemById;

export const calculateUsageFromOrder = async (order) => buildUsageMap(order);

export const recordLedgerEntry = async ({
  itemId,
  delta,
  reason,
  occurredAt,
  squareEventId = null,
  squarePaymentId = null,
  squareRefundId = null,
  squareOrderId = null,
  note = null,
}) => {
  await withTransaction(async (connection) => {
    const ledgerId = await writeLedger(connection, {
      itemId,
      delta,
      reason,
      occurredAt,
      squareEventId,
      squarePaymentId,
      squareRefundId,
      squareOrderId,
      note,
    });

    if (ledgerId) {
      await upsertBalance(connection, itemId, delta);
    }
  });
};
