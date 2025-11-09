import { Router } from 'express';
import {
  getItems,
  createItemHandler,
  updateItemHandler,
  adjustItemHandler,
  getLowStockHandler,
  getLedgerHandler,
  getItemLedgerHandler,
  getRecipeHandler,
  upsertRecipeHandler,
  syncCatalogHandler,
  getCatalogEntriesHandler,
} from '../controllers/adminController.js';

const router = Router();

router.get('/items', getItems);
router.post('/items', createItemHandler);
router.patch('/items/:id', updateItemHandler);
router.post('/items/:id/adjust', adjustItemHandler);
router.get('/items/:id/ledger', getItemLedgerHandler);

router.get('/low-stock', getLowStockHandler);
router.get('/ledger', getLedgerHandler);

router.get('/recipes/:variation', getRecipeHandler);
router.post('/recipes', upsertRecipeHandler);

router.post('/catalog/sync', syncCatalogHandler);
router.get('/catalog', getCatalogEntriesHandler);

export default router;
