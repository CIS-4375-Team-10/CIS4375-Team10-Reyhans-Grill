import { Router } from 'express'

import {
  createItem,
  deleteItem,
  listDeletedItems,
  listItems,
  logItemUsage,
  permanentlyDeleteItem,
  restoreItem,
  updateItem
} from '../controllers/itemsController.js'

const router = Router()

router.get('/', listItems)
router.get('/deleted', listDeletedItems)
router.post('/', createItem)
router.put('/:id', updateItem)
router.post('/:id/usage', logItemUsage)
router.patch('/:id/restore', restoreItem)
router.delete('/:id/purge', permanentlyDeleteItem)
router.delete('/:id', deleteItem)

export default router
