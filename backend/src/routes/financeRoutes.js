import { Router } from 'express'
import multer from 'multer'

import {
  createCashIncome,
  createElectronicIncome,
  createExpenseEntry,
  deleteCashIncome,
  deleteElectronicIncome,
  deleteExpenseEntry,
  getExpenseTrackerSnapshot,
  importFinanceEntries,
  updateCashIncome,
  updateElectronicIncome,
  updateExpenseEntry
} from '../controllers/financeController.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
})

router.get('/tracker', getExpenseTrackerSnapshot)
router.post('/electronic-income', createElectronicIncome)
router.put('/electronic-income/:id', updateElectronicIncome)
router.delete('/electronic-income/:id', deleteElectronicIncome)
router.post('/cash-income', createCashIncome)
router.put('/cash-income/:id', updateCashIncome)
router.delete('/cash-income/:id', deleteCashIncome)
router.post('/expenses', createExpenseEntry)
router.put('/expenses/:id', updateExpenseEntry)
router.delete('/expenses/:id', deleteExpenseEntry)
router.post('/import', upload.single('file'), importFinanceEntries)

export default router
