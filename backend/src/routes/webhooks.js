import { Router } from 'express';
import { handleSquareWebhook } from '../controllers/webhookController.js';

const router = Router();

router.post('/square', handleSquareWebhook);

export default router;
