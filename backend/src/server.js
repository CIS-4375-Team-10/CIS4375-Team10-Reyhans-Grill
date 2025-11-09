import express from 'express';
import config from './config/env.js';
import logger, { httpLogger } from './config/logger.js';
import healthRouter from './routes/health.js';
import webhookRouter from './routes/webhooks.js';
import adminRouter from './routes/admin.js';
import { scheduleReconciliationJob } from './jobs/reconcile.js';

const app = express();

app.set('trust proxy', true);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = Buffer.from(buf);
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);

app.use('/healthz', healthRouter);
app.use('/webhooks', webhookRouter);
app.use('/admin', adminRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  logger.error({ err }, 'Unhandled error in request pipeline');
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, "Reyhan's Grill backend listening");
});

scheduleReconciliationJob();

export default server;
