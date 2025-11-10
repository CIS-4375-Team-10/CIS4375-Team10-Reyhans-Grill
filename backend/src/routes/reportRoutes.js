import { Router } from 'express'

import { createReport, listReports } from '../controllers/reportsController.js'

const router = Router()

router.get('/', listReports)
router.post('/', createReport)

export default router
