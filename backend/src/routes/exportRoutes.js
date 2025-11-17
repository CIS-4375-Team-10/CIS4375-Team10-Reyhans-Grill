import { Router } from 'express'

import {
  exportExpenseReport,
  exportExpiringInventory,
  exportFullInventory,
  exportLowStockInventory
} from '../controllers/exportController.js'

const router = Router()

router.get('/inventory/full', exportFullInventory)
router.get('/inventory/low-stock', exportLowStockInventory)
router.get('/inventory/expiring-soon', exportExpiringInventory)
router.get('/expenses', exportExpenseReport)

export default router

