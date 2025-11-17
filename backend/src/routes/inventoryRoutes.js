import { Router } from 'express'

import { getInventoryAlerts } from '../controllers/inventoryAlertsController.js'

const router = Router()

router.get('/alerts', getInventoryAlerts)

export default router
