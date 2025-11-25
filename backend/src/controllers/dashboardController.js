import { getPool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getInventorySettings } from '../services/settingsService.js'
import { getExpenseRowsForRange } from './financeController.js'

const pool = getPool()

const utensilCategoryIds = ['CAT_COOK', 'CAT_SERVE', 'CAT_BAKE', 'CAT_CUT', 'CAT_STORE']
const formatDate = date => date.toISOString().slice(0, 10)

const lastSevenDayRange = () => {
  // Include the current (in-progress) day plus the prior 6 days
  const today = new Date()
  const end = new Date(today)

  const start = new Date(end)
  start.setDate(start.getDate() - 6)

  return {
    from: formatDate(start),
    to: formatDate(end)
  }
}

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const settings = await getInventorySettings()
  const threshold = Number(req.query.lowStock ?? settings.lowStockThreshold)
  // Expiring soon window is driven by the saved setting unless a query override is provided.
  const horizonDays = Number(req.query.expiringInDays ?? settings.expiringSoonDays)
  const expenseRange = lastSevenDayRange()

  const [[itemStats]] = await pool.query(
    `SELECT COUNT(*) AS totalItems,
            IFNULL(SUM(Quantity_in_Stock), 0) AS totalQuantity
       FROM Item
      WHERE Is_Deleted = 0`
  )

  const [lowStockRows] = await pool.query(
    `SELECT i.Item_ID AS itemId,
            i.Item_Name AS itemName,
            i.Quantity_in_Stock AS quantityInStock,
            i.Unit AS unit,
            c.Category_Name AS categoryName,
            COALESCE(i.Low_Stock_Threshold, ?) AS thresholdUsed
       FROM Item i
       JOIN Category c ON c.Category_ID = i.Category_ID
      WHERE i.Is_Deleted = 0
        AND i.Quantity_in_Stock <= COALESCE(i.Low_Stock_Threshold, ?)
      ORDER BY i.Quantity_in_Stock ASC, i.Item_Name ASC
      LIMIT 10`,
    [threshold, threshold]
  )

  const [lowStockCutlery] = await pool.query(
    `SELECT i.Item_ID AS itemId,
            i.Item_Name AS itemName,
            i.Quantity_in_Stock AS quantityInStock,
            i.Unit AS unit
       FROM Item i
      WHERE i.Is_Deleted = 0
        AND i.Category_ID = 'CAT_CUT'
        AND i.Quantity_in_Stock <= COALESCE(i.Low_Stock_Threshold, ?)
      ORDER BY i.Quantity_in_Stock ASC, i.Item_Name ASC`,
    [threshold]
  )

  const [lowStockServing] = await pool.query(
    `SELECT i.Item_ID AS itemId,
            i.Item_Name AS itemName,
            i.Quantity_in_Stock AS quantityInStock,
            i.Unit AS unit
       FROM Item i
      WHERE i.Is_Deleted = 0
        AND i.Category_ID = 'CAT_SERVE'
        AND i.Quantity_in_Stock <= COALESCE(i.Low_Stock_Threshold, ?)
      ORDER BY i.Quantity_in_Stock ASC, i.Item_Name ASC`,
    [threshold]
  )

  const windowExpr = `
    CASE
      WHEN i.Expiring_Soon_Days IS NOT NULL THEN i.Expiring_Soon_Days
      ELSE ?
    END
  `

  const [expiringRows] = await pool.query(
    `SELECT i.Item_ID AS itemId,
            i.Item_Name AS itemName,
            i.Quantity_in_Stock AS quantityInStock,
            i.Unit AS unit,
            i.Purchase_Date AS purchaseDate,
            i.Expiration_Date AS expirationDate,
            ${windowExpr} AS expiringWindowDays
       FROM Item i
      WHERE i.Is_Deleted = 0
        AND i.Expiration_Date IS NOT NULL
        AND i.Expiration_Date BETWEEN CURDATE()
            AND DATE_ADD(CURDATE(), INTERVAL ${windowExpr} DAY)
      ORDER BY i.Expiration_Date ASC`,
    [horizonDays, horizonDays]
  )

  const utensilPlaceholders = utensilCategoryIds.map(() => '?').join(', ')

  const materialQuantityQuery = `
    SELECT IFNULL(SUM(Quantity_in_Stock), 0) AS materialsQuantity
      FROM Item
     WHERE Is_Deleted = 0
       AND (
             UPPER(IFNULL(Item_Type, '')) = 'MATERIAL'
          OR (
                UPPER(IFNULL(Item_Type, '')) <> 'UTENSIL'
                AND (Category_ID IS NULL OR Category_ID NOT IN (${utensilPlaceholders}))
             )
         )
  `
  const [[materialStats]] = await pool.query(materialQuantityQuery, utensilCategoryIds)

  const utensilQuery = `
    SELECT IFNULL(SUM(Quantity_in_Stock), 0) AS utensilsQuantity
      FROM Item
     WHERE Is_Deleted = 0
       AND (
             UPPER(IFNULL(Item_Type, '')) = 'UTENSIL'
             OR Category_ID IN (${utensilPlaceholders})
           )
  `
  const [[utensilStats]] = await pool.query(utensilQuery, utensilCategoryIds)

  const expenseData = await getExpenseRowsForRange(expenseRange)

  const materialsQuantity = Number(materialStats.materialsQuantity) || 0
  const utensilsQuantity = Number(utensilStats.utensilsQuantity) || 0

  res.json({
    totalItems: Number(itemStats.totalItems) || 0,
    totalQuantity: Number(itemStats.totalQuantity) || 0,
    materialsQuantity,
    utensilsQuantity,
    lowStock: lowStockRows,
    expiringSoon: expiringRows,
    lowStockCutlery,
    lowStockServing,
    utensilsInUse: utensilsQuantity,
    recentSpend: expenseData.inventoryTotal,
    inventorySettings: settings
  })
})
