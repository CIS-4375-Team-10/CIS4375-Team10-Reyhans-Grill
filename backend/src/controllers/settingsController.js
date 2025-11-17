import { z } from 'zod'

import { asyncHandler } from '../utils/asyncHandler.js'
import { getInventorySettings, updateInventorySettings } from '../services/settingsService.js'

const settingsSchema = z.object({
  lowStockThreshold: z.coerce.number().int().positive(),
  expiringSoonDays: z.coerce.number().int().positive()
})

export const getInventorySettingsController = asyncHandler(async (req, res) => {
  const settings = await getInventorySettings()
  res.json(settings)
})

export const updateInventorySettingsController = asyncHandler(async (req, res) => {
  const payload = settingsSchema.parse(req.body)
  const updated = await updateInventorySettings(payload)
  res.json(updated)
})
