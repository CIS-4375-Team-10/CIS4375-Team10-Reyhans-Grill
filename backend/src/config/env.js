import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(8080),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(3306),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_NAME: Joi.string().required(),
  SQUARE_ACCESS_TOKEN: Joi.string().required(),
  SQUARE_ENV: Joi.string().valid('sandbox', 'production').default('sandbox'),
  SQUARE_LOCATION_ID: Joi.string().required(),
  SQUARE_WEBHOOK_SIGNATURE_KEY: Joi.string().required(),
  ALLOW_UNVERIFIED_WEBHOOKS: Joi.boolean()
    .truthy('true')
    .truthy('1')
    .truthy(1)
    .falsy('false')
    .falsy('0')
    .falsy(0)
    .default(false),
  CRON_RECONCILE_SCHEDULE: Joi.string()
    .pattern(/^[\d*\s]+$/)
    .default('30 3 * * *'),
  LOG_LEVEL: Joi.string().default('info'),
}).unknown(true);

const { value, error } = schema.validate(process.env, {
  abortEarly: false,
  convert: true,
});

if (error) {
  throw new Error(
    `Configuration validation failed: ${error.details
      .map((detail) => detail.message)
      .join(', ')}`,
  );
}

const config = {
  env: value.NODE_ENV,
  port: value.PORT,
  logLevel: value.LOG_LEVEL,
  allowUnverifiedWebhooks: value.ALLOW_UNVERIFIED_WEBHOOKS,
  cron: {
    reconcileSchedule: value.CRON_RECONCILE_SCHEDULE,
  },
  db: {
    host: value.DB_HOST,
    port: value.DB_PORT,
    user: value.DB_USER,
    password: value.DB_PASSWORD,
    name: value.DB_NAME,
  },
  square: {
    accessToken: value.SQUARE_ACCESS_TOKEN,
    environment: value.SQUARE_ENV,
    locationId: value.SQUARE_LOCATION_ID,
    signatureKey: value.SQUARE_WEBHOOK_SIGNATURE_KEY,
  },
};

export default config;
