import { Router } from 'express'

import categoryRoutes from './categoryRoutes.js'
import itemRoutes from './itemRoutes.js'
import usageRoutes from './usageRoutes.js'
import purchaseRoutes from './purchaseRoutes.js'
import reportRoutes from './reportRoutes.js'
import userRoutes from './userRoutes.js'
import dashboardRoutes from './dashboardRoutes.js'
import settingsRoutes from './settingsRoutes.js'

const router = Router()

// health endpoint so we can quickly check the API is alive
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Feature routes
router.use('/categories', categoryRoutes)
router.use('/items', itemRoutes)
router.use('/usage', usageRoutes)
router.use('/purchases', purchaseRoutes)
router.use('/reports', reportRoutes)
router.use('/users', userRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/settings', settingsRoutes)

export default router
