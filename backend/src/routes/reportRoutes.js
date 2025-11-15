import { Router } from 'express'
import { listReports, createReport, getMonthlyExpenses } from '../controllers/reportsController.js'

const router = Router()

router.get('/', listReports)
router.post('/', createReport)

// adding charts
router.get('/charts/expenses-monthly', getMonthlyExpenses)


export default router
