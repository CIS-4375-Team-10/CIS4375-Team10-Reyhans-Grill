import { Router } from 'express';
import config from '../config/env.js';
import { query } from '../config/db.js';

const router = Router();

router.get('/', async (_req, res) => {
  let dbStatus = 'up';

  try {
    await query('SELECT 1');
  } catch (error) {
    dbStatus = 'down';
  }

  const payload = {
    ok: dbStatus === 'up' ? true : false,
    db: dbStatus,
    square: config.square.accessToken ? 'configured' : 'missing',
  };

  res.status(dbStatus === 'up' ? 200 : 500).json(payload);
});

export default router;
