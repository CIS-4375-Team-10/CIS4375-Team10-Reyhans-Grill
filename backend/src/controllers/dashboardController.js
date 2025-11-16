import { getPool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const pool = getPool()

const utensilCategoryIds = ['CAT_COOK', 'CAT_SERVE', 'CAT_BAKE', 'CAT_CUT', 'CAT_STORE']

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const threshold = Number(req.query.lowStock ?? 10)
  const horizonDays = Number(req.query.expiringInDays ?? 7)

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
            c.Category_Name AS categoryName
       FROM Item i
       JOIN Category c ON c.Category_ID = i.Category_ID
      WHERE i.Is_Deleted = 0
        AND i.Quantity_in_Stock <= ?
      ORDER BY i.Quantity_in_Stock ASC, i.Item_Name ASC
      LIMIT 10`,
    [threshold]
  )

  const [lowStockCutlery] = await pool.query(
    `SELECT i.Item_ID AS itemId,
            i.Item_Name AS itemName,
            i.Quantity_in_Stock AS quantityInStock,
            i.Unit AS unit
       FROM Item i
      WHERE i.Is_Deleted = 0
        AND i.Category_ID = 'CAT_CUT'
        AND i.Quantity_in_Stock <= ?
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
        AND i.Quantity_in_Stock <= ?
      ORDER BY i.Quantity_in_Stock ASC, i.Item_Name ASC`,
    [threshold]
  )

  const [expiringRows] = await pool.query(
    `SELECT i.Item_ID AS itemId,
            i.Item_Name AS itemName,
            i.Quantity_in_Stock AS quantityInStock,
            i.Unit AS unit,
            i.Expiration_Date AS expirationDate
       FROM Item i
      WHERE i.Is_Deleted = 0
        AND i.Expiration_Date IS NOT NULL
        AND i.Expiration_Date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY i.Expiration_Date ASC`,
    [horizonDays]
  )

  const utensilPlaceholders = utensilCategoryIds.map(() => '?').join(', ')
  const utensilQuery = `
    SELECT IFNULL(SUM(Quantity_in_Stock), 0) AS utensilsInUse
      FROM Item
     WHERE Is_Deleted = 0
       AND Category_ID IN (${utensilPlaceholders})
  `
  const [[utensilStats]] = await pool.query(utensilQuery, utensilCategoryIds)

  const [[spendStats]] = await pool.query(
    `SELECT IFNULL(SUM(Unit_Cost * Quantity_in_Stock), 0) AS recentSpend
       FROM Item
      WHERE Is_Deleted = 0
        AND Created_At >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
  )

  res.json({
    totalItems: Number(itemStats.totalItems) || 0,
    totalQuantity: Number(itemStats.totalQuantity) || 0,
    lowStock: lowStockRows,
    expiringSoon: expiringRows,
    lowStockCutlery,
    lowStockServing,
    utensilsInUse: Number(utensilStats.utensilsInUse) || 0,
    recentSpend: Number(spendStats.recentSpend) || 0
  })
})
