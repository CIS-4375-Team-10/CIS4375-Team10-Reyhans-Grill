import { Router } from 'express';
import {
  getInventory,
  getSquareLocations,
  syncInventoryFromSquare,
} from '../controllers/inventoryController.js';

const router = Router();

router.get('/', getInventory);
router.post('/square-sync', syncInventoryFromSquare);
router.get('/square/locations', getSquareLocations);

export default router;
