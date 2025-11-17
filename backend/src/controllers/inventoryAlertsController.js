import { getPool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getInventorySettings } from '../services/settingsService.js'

const pool = getPool()

export const getInventoryAlerts = asyncHandler(async (req, res) => {
  const settings = await getInventorySettings()

  const [customLowStock] = await pool.query(
    `SELECT Item_ID AS itemId,
            Item_Name AS itemName,
            Quantity_in_Stock AS quantityInStock,
            Unit AS unit,
            Low_Stock_Threshold AS lowStockThreshold
       FROM Item
      WHERE Is_Deleted = 0
        AND Low_Stock_Threshold IS NOT NULL
      ORDER BY Item_Name ASC`
  )

  const [customExpiringSoon] = await pool.query(
    `SELECT Item_ID AS itemId,
            Item_Name AS itemName,
            Quantity_in_Stock AS quantityInStock,
            Unit AS unit,
            Expiration_Date AS expirationDate,
            Expiring_Soon_Days AS expiringSoonDays
       FROM Item
      WHERE Is_Deleted = 0
        AND Expiring_Soon_Days IS NOT NULL
      ORDER BY Item_Name ASC`
  )

  res.json({
    globalLowStockThreshold: settings.lowStockThreshold,
    globalExpiringSoonDays: settings.expiringSoonDays,
    materialsWithCustomLowStockThreshold: customLowStock,
    materialsWithCustomExpiringSoonDays: customExpiringSoon
  })
})
