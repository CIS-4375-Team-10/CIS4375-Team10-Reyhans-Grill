import { Router } from 'express'

import {
  getInventorySettingsController,
  updateInventorySettingsController
} from '../controllers/settingsController.js'

const router = Router()

router.get('/inventory', getInventorySettingsController)
router.put('/inventory', updateInventorySettingsController)

export default router
