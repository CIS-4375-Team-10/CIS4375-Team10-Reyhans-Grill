import { Client, Environment } from 'square';

const {
  SQUARE_ACCESS_TOKEN,
  SQUARE_ENVIRONMENT = 'sandbox',
  SQUARE_LOCATION_ID,
} = process.env;

if (!SQUARE_ACCESS_TOKEN) {
  console.warn(
    'SQUARE_ACCESS_TOKEN is not set. Square API calls will fail until it is provided.',
  );
}

export const squareClient = new Client({
  accessToken: SQUARE_ACCESS_TOKEN,
  environment:
    SQUARE_ENVIRONMENT === 'production'
      ? Environment.Production
      : Environment.Sandbox,
});

export const squareLocationId = SQUARE_LOCATION_ID;
