import { Client, Environment } from 'square';
import config from '../config/env.js';
import logger from '../config/logger.js';

const environment =
  config.square.environment === 'production'
    ? Environment.Production
    : Environment.Sandbox;

const client = new Client({
  accessToken: config.square.accessToken,
  environment,
  userAgentDetail: 'reyhans-grill-inventory/1.0.0',
});

logger.info(
  {
    environment: config.square.environment,
    locationId: config.square.locationId,
  },
  'Square client initialized',
);

export const squareClient = client;
export const ordersApi = client.ordersApi;
export const paymentsApi = client.paymentsApi;
export const refundsApi = client.refundsApi;
export const catalogApi = client.catalogApi;

export default client;
