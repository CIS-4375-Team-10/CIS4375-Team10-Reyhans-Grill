import { Router } from 'express'
import {
  createReport,
  getCustomReportSummary,
  getMonthlyExpenses,
  listReports
} from '../controllers/reportsController.js'

const router = Router()

router.get('/', listReports)
router.post('/', createReport)

// adding charts
router.get('/charts/expenses-monthly', getMonthlyExpenses)
router.get('/summary', getCustomReportSummary)


export default router
