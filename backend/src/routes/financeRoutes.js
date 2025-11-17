import { Router } from 'express'
import multer from 'multer'

import {
  createCashIncome,
  createElectronicIncome,
  createExpenseEntry,
  getExpenseTrackerSnapshot,
  importFinanceEntries
} from '../controllers/financeController.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
})

router.get('/tracker', getExpenseTrackerSnapshot)
router.post('/electronic-income', createElectronicIncome)
router.post('/cash-income', createCashIncome)
router.post('/expenses', createExpenseEntry)
router.post('/import', upload.single('file'), importFinanceEntries)

export default router
