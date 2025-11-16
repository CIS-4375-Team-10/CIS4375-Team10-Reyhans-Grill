import { Router } from 'express'

import { createUsage, listUsage } from '../controllers/usageController.js'

const router = Router()

router.get('/', listUsage)
router.post('/', createUsage)

export default router
