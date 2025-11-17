import { Router } from 'express'

import {
  createMaterialUsage,
  listMaterialUsage
} from '../controllers/materialUsageController.js'

const router = Router()

router.get('/', listMaterialUsage)
router.post('/', createMaterialUsage)

export default router
