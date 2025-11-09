import pino from 'pino';
import pinoHttp from 'pino-http';
import config from './env.js';

const transport =
  config.env === 'production'
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: true,
          translateTime: 'SYS:standard',
        },
      };

const logger = pino({
  level: config.logLevel,
  transport,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers.x-square-hmacsha256-signature',
      'square.accessToken',
      'config.square.accessToken',
    ],
    censor: '[REDACTED]',
  },
});

export const httpLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === '/healthz',
  },
  customLogLevel: (_req, res, err) => {
    if (err) return 'error';
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});

export default logger;
