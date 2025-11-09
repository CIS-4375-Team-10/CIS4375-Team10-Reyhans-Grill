import { query } from '../config/db.js';
import logger from '../config/logger.js';
import { verifySignature } from '../square/webhooks.js';
import {
  decrementForSale,
  incrementForRefund,
} from '../services/inventoryService.js';
import {
  getOrder,
  getPayment,
  getRefund,
} from '../services/orderService.js';

const getEventId = (payload) =>
  payload?.event_id || payload?.id || payload?.eventId;

const getEventType = (payload) => payload?.type;

const insertWebhookEventIfMissing = async (eventId, eventType) => {
  const [rows] = await query(
    `
      SELECT id, status
      FROM webhook_event
      WHERE event_id = ?
    `,
    [eventId],
  );

  if (rows.length) {
    return rows[0];
  }

  await query(
    `
      INSERT INTO webhook_event (event_id, type, status)
      VALUES (?, ?, 'RECEIVED')
    `,
    [eventId, eventType],
  );

  return { status: 'RECEIVED' };
};

const updateWebhookStatus = async (eventId, status, error = null) => {
  await query(
    `
      UPDATE webhook_event
      SET status = ?,
          processed_at = CURRENT_TIMESTAMP,
          error = ?
      WHERE event_id = ?
    `,
    [status, error, eventId],
  );
};

const parseOrderIdFromPayment = (payment) =>
  payment?.orderId || payment?.order_id;

const ensureOrder = async ({ payment, orderId }) => {
  const resolvedOrderId = orderId || parseOrderIdFromPayment(payment);
  if (!resolvedOrderId) {
    throw new Error('Unable to resolve Square order id from payment');
  }
  return getOrder(resolvedOrderId);
};

const resolvePayment = async (payload) => {
  if (payload?.data?.object?.payment) {
    return payload.data.object.payment;
  }

  if (payload?.data?.object?.paymentId) {
    return getPayment(payload.data.object.paymentId);
  }

  if (payload?.data?.object?.payment_id) {
    return getPayment(payload.data.object.payment_id);
  }

  return null;
};

const resolveRefund = async (payload) => {
  if (payload?.data?.object?.refund) {
    return payload.data.object.refund;
  }

  if (payload?.data?.object?.refundId) {
    return getRefund(payload.data.object.refundId);
  }

  if (payload?.data?.object?.refund_id) {
    return getRefund(payload.data.object.refund_id);
  }

  return null;
};

const toDateOrNow = (value) => (value ? new Date(value) : new Date());

const handlePaymentUpdated = async (eventId, payload) => {
  const payment = await resolvePayment(payload);
  if (!payment) {
    throw new Error('Webhook payload missing payment data');
  }

  const paymentStatus = (payment.status || '').toUpperCase();
  if (paymentStatus !== 'COMPLETED') {
    await updateWebhookStatus(eventId, 'SKIPPED');
    return { skipped: true };
  }

  const order = await ensureOrder({
    payment,
    orderId: payload?.data?.object?.payment?.orderId,
  });

  const occurredAt =
    order?.closedAt ||
    order?.closed_at ||
    payment.updatedAt ||
    payment.updated_at ||
    payment.createdAt ||
    payment.created_at;

  await decrementForSale(
    {
      squareEventId: eventId,
      squarePaymentId: payment.id,
      squareOrderId: order?.id,
      occurredAt: toDateOrNow(occurredAt),
    },
    order,
  );

  await updateWebhookStatus(eventId, 'PROCESSED');
  return { processed: true };
};

const handleRefundUpdated = async (eventId, payload) => {
  const refund = await resolveRefund(payload);
  if (!refund) {
    throw new Error('Webhook payload missing refund data');
  }

  const refundStatus = (refund.status || '').toUpperCase();
  if (refundStatus !== 'COMPLETED') {
    await updateWebhookStatus(eventId, 'SKIPPED');
    return { skipped: true };
  }

  const paymentId = refund.paymentId || refund.payment_id;
  const payment = paymentId ? await getPayment(paymentId) : await resolvePayment(payload);
  const orderId =
    refund.orderId ||
    refund.order_id ||
    parseOrderIdFromPayment(payment);

  const order = orderId ? await getOrder(orderId) : null;

  if (!order) {
    throw new Error('Unable to load order for refund event');
  }

  const occurredAt =
    refund.processedAt ||
    refund.processed_at ||
    refund.updatedAt ||
    refund.updated_at ||
    payment?.updatedAt ||
    payment?.updated_at;

  await incrementForRefund(
    {
      squareEventId: eventId,
      squarePaymentId: payment?.id ?? null,
      squareRefundId: refund.id,
      squareOrderId: order?.id ?? null,
      occurredAt: toDateOrNow(occurredAt),
    },
    order,
  );

  await updateWebhookStatus(eventId, 'PROCESSED');
  return { processed: true };
};

export const handleSquareWebhook = async (req, res) => {
  const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
  const signature =
    req.headers['x-square-hmacsha256-signature'] ||
    req.headers['X-Square-Hmacsha256-Signature'];

  if (!verifySignature(rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const event = req.body;
  const eventId = getEventId(event);
  const eventType = getEventType(event);

  if (!eventId || !eventType) {
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }

  const existing = await insertWebhookEventIfMissing(eventId, eventType);
  if (['PROCESSED', 'SKIPPED'].includes(existing.status)) {
    return res.json({ ok: true, duplicate: true });
  }

  try {
    if (eventType === 'payment.updated') {
      await handlePaymentUpdated(eventId, event);
    } else if (eventType === 'refund.updated') {
      await handleRefundUpdated(eventId, event);
    } else {
      await updateWebhookStatus(eventId, 'SKIPPED');
      return res.json({ ok: true, skipped: true });
    }

    return res.json({ ok: true });
  } catch (error) {
    logger.error(
      { err: error, eventId, eventType },
      'Failed to process Square webhook',
    );
    await updateWebhookStatus(eventId, 'ERROR', error.message);
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
};
