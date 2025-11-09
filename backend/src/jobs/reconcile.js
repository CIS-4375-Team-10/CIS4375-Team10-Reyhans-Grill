import cron from 'node-cron';
import config from '../config/env.js';
import logger from '../config/logger.js';
import { reconcilePreviousDay } from '../services/reconciliationService.js';

export const scheduleReconciliationJob = () => {
  const schedule = config.cron.reconcileSchedule || '30 3 * * *';

  const task = cron.schedule(
    schedule,
    async () => {
      try {
        await reconcilePreviousDay();
      } catch (error) {
        logger.error({ err: error }, 'Nightly reconciliation failed');
      }
    },
    {
      scheduled: true,
      timezone: 'UTC',
    },
  );

  logger.info({ schedule }, 'Nightly reconciliation job scheduled');
  return task;
};

export const runReconciliationNow = async () => reconcilePreviousDay();
