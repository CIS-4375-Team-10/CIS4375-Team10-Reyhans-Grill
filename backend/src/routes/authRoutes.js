// These are routes, if you have any questions on API routing please post a comment or open a ticket on github issues ✌️
import { Router } from 'express'

import { login, logout } from '../controllers/authController.js'
import { sessionAuth } from '../middleware/sessionAuth.js'

const router = Router()

router.post('/login', login)
router.post('/logout', sessionAuth, logout)

export default router
