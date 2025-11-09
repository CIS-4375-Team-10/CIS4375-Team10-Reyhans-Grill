import logger from '../config/logger.js';
import {
  ordersApi,
  paymentsApi,
  refundsApi,
  catalogApi,
} from '../square/client.js';
import config from '../config/env.js';

export const getOrder = async (orderId) => {
  if (!orderId) {
    throw new Error('Order ID is required');
  }

  const { result } = await ordersApi.retrieveOrder(orderId);
  return result.order;
};

export const getPayment = async (paymentId) => {
  if (!paymentId) {
    throw new Error('Payment ID is required');
  }
  const { result } = await paymentsApi.getPayment(paymentId);
  return result.payment;
};

export const getRefund = async (refundId) => {
  if (!refundId) {
    throw new Error('Refund ID is required');
  }
  const { result } = await refundsApi.getPaymentRefund(refundId);
  return result.refund;
};

export const searchOrders = async ({ startAt, endAt }) => {
  const body = {
    locationIds: [config.square.locationId],
    query: {
      filter: {
        dateTimeFilter: {
          closeAt: {
            startAt,
            endAt,
          },
        },
        stateFilter: {
          states: ['COMPLETED'],
        },
      },
    },
    returnEntries: false,
  };

  const orders = [];
  let cursor;

  do {
    const { result } = await ordersApi.searchOrders({
      ...body,
      cursor,
    });
    if (result.orders) {
      orders.push(...result.orders);
    }
    cursor = result.cursor;
  } while (cursor);

  return orders;
};

export const syncCatalogVariations = async () => {
  const variations = [];
  let cursor;

  do {
    const { result } = await catalogApi.listCatalog(cursor, 'ITEM');
    cursor = result.cursor;

    const objects = result.objects || [];
    for (const obj of objects) {
      if (obj.type !== 'ITEM') continue;
      const itemVariations = obj.itemData?.variations || [];
      for (const variation of itemVariations) {
        variations.push({
          variationId: variation.id,
          itemName: obj.itemData?.name ?? null,
          variationName: variation.itemVariationData?.name ?? null,
          sku: variation.itemVariationData?.sku ?? null,
        });
      }
    }
  } while (cursor);

  return variations;
};

export const getCatalogVariations = async () => {
  try {
    return await syncCatalogVariations();
  } catch (error) {
    logger.error({ err: error }, 'Failed to pull catalog variations from Square');
    throw error;
  }
};
