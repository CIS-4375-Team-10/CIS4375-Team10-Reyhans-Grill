import crypto from 'crypto';
import config from '../config/env.js';
import logger from '../config/logger.js';

export const computeSignature = (rawBody, signatureKey) => {
  const hmac = crypto.createHmac('sha256', signatureKey);
  hmac.update(rawBody);
  return hmac.digest('base64');
};

export const verifySignature = (
  rawBody,
  signatureHeader,
  signatureKey = config.square.signatureKey,
) => {
  if (config.allowUnverifiedWebhooks) {
    logger.warn(
      'ALLOW_UNVERIFIED_WEBHOOKS enabled; skipping Square signature validation',
    );
    return true;
  }

  if (!signatureHeader) {
    logger.warn('Missing Square webhook signature header');
    return false;
  }

  try {
    const expectedSignature = computeSignature(rawBody, signatureKey);
    const provided = Buffer.from(signatureHeader);
    const expected = Buffer.from(expectedSignature);

    if (provided.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(provided, expected);
  } catch (error) {
    logger.error({ err: error }, 'Failed to verify Square webhook signature');
    return false;
  }
};
