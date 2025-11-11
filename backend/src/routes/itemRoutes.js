import { Router } from 'express'

import {
  createItem,
  deleteItem,
  listDeletedItems,
  listItems,
  restoreItem,
  updateItem
} from '../controllers/itemsController.js'

const router = Router()

router.get('/', listItems)
router.get('/deleted', listDeletedItems)
router.post('/', createItem)
router.put('/:id', updateItem)
router.patch('/:id/restore', restoreItem)
router.delete('/:id', deleteItem)

export default router
