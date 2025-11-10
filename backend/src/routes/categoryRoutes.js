import { Router } from 'express'

import {
  createCategory,
  deleteCategory,
  listCategories
} from '../controllers/categoriesController.js'

const router = Router()

router.get('/', listCategories)
router.post('/', createCategory)
router.delete('/:id', deleteCategory)

export default router
