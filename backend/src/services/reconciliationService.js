import { query } from '../config/db.js';
import logger from '../config/logger.js';
import {
  searchOrders,
} from './orderService.js';
import {
  calculateUsageFromOrder,
  recordLedgerEntry,
} from './inventoryService.js';

const round = (value, decimals = 3) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const getUsageTotalsForOrder = async (orderId) => {
  const [rows] = await query(
    `
      SELECT item_id, SUM(delta) AS total
      FROM stock_ledger
      WHERE square_order_id = ?
        AND reason IN ('SALE', 'RECON')
      GROUP BY item_id
    `,
    [orderId],
  );

  const map = new Map();
  for (const row of rows) {
    map.set(row.item_id, Number(row.total));
  }
  return map;
};

const determineDifference = (expected, actual, decimals) =>
  round(expected - actual, Math.min(decimals ?? 3, 3));

export const reconcileOrdersForRange = async (startAt, endAt) => {
  const orders = await searchOrders({ startAt, endAt });

  let adjustments = 0;
  let processedOrders = 0;

  for (const order of orders) {
    processedOrders += 1;
    const orderId = order.id;
    const usageMap = await calculateUsageFromOrder(order);
    if (!usageMap.size) continue;

    const actualTotals = await getUsageTotalsForOrder(orderId);

    for (const [itemId, meta] of usageMap.entries()) {
      const expectedDelta = round(-meta.total, meta.decimals ?? 3);
      const actualDelta = actualTotals.get(itemId) ?? 0;
      const difference = determineDifference(
        expectedDelta,
        actualDelta,
        meta.decimals ?? 3,
      );

      if (Math.abs(difference) < 0.0005) {
        continue;
      }

      await recordLedgerEntry({
        itemId,
        delta: difference,
        reason: 'RECON',
        occurredAt: new Date(order.closedAt || order.updatedAt || Date.now()),
        squareOrderId: orderId,
        note: `Reconciliation adjustment for ${orderId}`,
      });

      adjustments += 1;
    }
  }

  logger.info(
    {
      processedOrders,
      adjustments,
      startAt,
      endAt,
    },
    'Reconciliation run completed',
  );

  return { processedOrders, adjustments };
};

export const reconcilePreviousDay = async () => {
  const now = new Date();
  const target = new Date(now);
  target.setUTCDate(now.getUTCDate() - 1);
  target.setUTCHours(0, 0, 0, 0);

  const startAt = target.toISOString();
  const end = new Date(target);
  end.setUTCHours(23, 59, 59, 999);
  const endAt = end.toISOString();

  return reconcileOrdersForRange(startAt, endAt);
};
