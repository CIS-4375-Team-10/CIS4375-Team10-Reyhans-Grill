import ExcelJS from 'exceljs'
import { z } from 'zod'

import { getPool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { getInventorySettings } from '../services/settingsService.js'

const pool = getPool()

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

const numericFilter = z
  .coerce.number()
  .int()
  .positive()
  .max(100000)

const lowStockQuerySchema = z.object({
  threshold: numericFilter.optional()
})

const expiringQuerySchema = z.object({
  expiringInDays: numericFilter.max(365).optional()
})

const expenseExportSchema = z.object({
  startDate: dateString,
  endDate: dateString,
  period: z.enum(['day', 'week', 'month']).default('day')
})

const bucketExpressions = {
  day: 'DATE(r.Report_Date)',
  week: 'YEARWEEK(r.Report_Date, 3)',
  month: "DATE_FORMAT(r.Report_Date, '%Y-%m')"
}

const formatLabel = (period, start, end) => {
  if (period === 'day') {
    return start
  }
  if (period === 'month') {
    return start?.slice(0, 7) ?? ''
  }
  return `${start} - ${end}`
}

const safeTimestamp = () => {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
}

const sanitizeFilename = name => name.replace(/[^a-zA-Z0-9_\-.]/g, '_')

const sendWorkbook = async (res, workbook, filename) => {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(filename)}"`)
  const buffer = await workbook.xlsx.writeBuffer()
  res.send(Buffer.from(buffer))
}

const formatDate = value => (value ? String(value).slice(0, 10) : '')

const autoSizeColumns = worksheet => {
  worksheet.columns?.forEach(column => {
    let maxLength = 10
    if (typeof column.header === 'string') {
      maxLength = column.header.length
    }
    column.eachCell?.({ includeEmpty: true }, cell => {
      const cellValue = cell.value
      const text =
        cellValue == null
          ? ''
          : typeof cellValue === 'object' && cellValue.text
            ? cellValue.text
            : cellValue.toString()
      maxLength = Math.max(maxLength, text.length)
    })
    column.width = Math.min(maxLength + 2, 50)
  })
}

const applyHeaderStyles = worksheet => {
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]
}

export const exportFullInventory = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT i.Item_ID AS itemId,
            i.Item_Name AS itemName,
            c.Category_Name AS categoryName,
            i.Quantity_in_Stock AS quantityInStock,
            i.Unit AS unit,
            i.Unit_Cost AS unitCost,
            i.Purchase_Date AS purchaseDate,
            i.Expiration_Date AS expirationDate,
            i.Status AS status,
            i.Item_Type AS itemType,
            i.Low_Stock_Threshold AS lowStockThreshold,
            i.Expiring_Soon_Days AS expiringSoonDays,
            i.Par_Level AS parLevel,
            i.Reorder_Point AS reorderPoint
       FROM Item i
       JOIN Category c ON c.Category_ID = i.Category_ID
      WHERE i.Is_Deleted = 0
      ORDER BY c.Category_Name ASC, i.Item_Name ASC`
  )

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Inventory')
  worksheet.columns = [
    { header: 'Item Name', key: 'itemName' },
    { header: 'Category', key: 'categoryName' },
    { header: 'Qty In Stock', key: 'quantityInStock', style: { numFmt: '#,##0' } },
    { header: 'Unit', key: 'unit' },
    { header: 'Unit Cost', key: 'unitCost', style: { numFmt: '$#,##0.00' } },
    { header: 'Inventory Value', key: 'inventoryValue', style: { numFmt: '$#,##0.00' } },
    { header: 'Purchase Date', key: 'purchaseDate' },
    { header: 'Expiration Date', key: 'expirationDate' },
    { header: 'Status', key: 'status' },
    { header: 'Item Type', key: 'itemType' },
    { header: 'Low Stock Threshold', key: 'lowStockThreshold' },
    { header: 'Expiring Soon (days)', key: 'expiringSoonDays' },
    { header: 'Par Level', key: 'parLevel' },
    { header: 'Reorder Point', key: 'reorderPoint' }
  ]

  rows.forEach(row => {
    const quantity = Number(row.quantityInStock ?? 0)
    const unitCost = Number(row.unitCost ?? 0)
    worksheet.addRow({
      itemName: row.itemName,
      categoryName: row.categoryName,
      quantityInStock: quantity,
      unit: row.unit,
      unitCost,
      inventoryValue: Number((quantity * unitCost).toFixed(2)),
      purchaseDate: formatDate(row.purchaseDate),
      expirationDate: formatDate(row.expirationDate),
      status: row.status,
      itemType: row.itemType,
      lowStockThreshold: row.lowStockThreshold ?? '',
      expiringSoonDays: row.expiringSoonDays ?? '',
      parLevel: row.parLevel ?? '',
      reorderPoint: row.reorderPoint ?? ''
    })
  })

  worksheet.autoFilter = 'A1:N1'
  applyHeaderStyles(worksheet)
  autoSizeColumns(worksheet)

  const filename = `Full_Inventory_${safeTimestamp()}.xlsx`
  await sendWorkbook(res, workbook, filename)
})

export const exportLowStockInventory = asyncHandler(async (req, res) => {
  const settings = await getInventorySettings()
  const { threshold } = lowStockQuerySchema.parse(req.query)
  const thresholdToUse = threshold ?? settings.lowStockThreshold

  const [rows] = await pool.query(
    `SELECT i.Item_Name AS itemName,
            c.Category_Name AS categoryName,
            i.Quantity_in_Stock AS quantityInStock,
            i.Unit AS unit,
            i.Unit_Cost AS unitCost,
            COALESCE(i.Low_Stock_Threshold, ?) AS thresholdUsed,
            CASE WHEN i.Low_Stock_Threshold IS NULL THEN 'Global' ELSE 'Custom' END AS thresholdType
       FROM Item i
       JOIN Category c ON c.Category_ID = i.Category_ID
      WHERE i.Is_Deleted = 0
        AND i.Quantity_in_Stock <= COALESCE(i.Low_Stock_Threshold, ?)
      ORDER BY i.Quantity_in_Stock ASC, i.Item_Name ASC`,
    [thresholdToUse, thresholdToUse]
  )

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Low Stock')
  worksheet.columns = [
    { header: 'Item Name', key: 'itemName' },
    { header: 'Category', key: 'categoryName' },
    { header: 'Quantity', key: 'quantityInStock', style: { numFmt: '#,##0' } },
    { header: 'Unit', key: 'unit' },
    { header: 'Unit Cost', key: 'unitCost', style: { numFmt: '$#,##0.00' } },
    { header: 'Threshold Used', key: 'thresholdUsed' },
    { header: 'Threshold Type', key: 'thresholdType' }
  ]

  rows.forEach(row => {
    worksheet.addRow({
      itemName: row.itemName,
      categoryName: row.categoryName,
      quantityInStock: Number(row.quantityInStock ?? 0),
      unit: row.unit,
      unitCost: Number(row.unitCost ?? 0),
      thresholdUsed: Number(row.thresholdUsed ?? thresholdToUse),
      thresholdType: row.thresholdType
    })
  })

  worksheet.autoFilter = 'A1:G1'
  applyHeaderStyles(worksheet)
  autoSizeColumns(worksheet)

  const suffix = threshold ? `custom-${threshold}` : `default-${thresholdToUse}`
  const filename = `Low_Stock_${suffix}_${safeTimestamp()}.xlsx`
  await sendWorkbook(res, workbook, filename)
})

export const exportExpiringInventory = asyncHandler(async (req, res) => {
  const settings = await getInventorySettings()
  const { expiringInDays } = expiringQuerySchema.parse(req.query)
  const windowDays = expiringInDays ?? settings.expiringSoonDays

  const [rows] = await pool.query(
    `SELECT i.Item_Name AS itemName,
            c.Category_Name AS categoryName,
            i.Quantity_in_Stock AS quantityInStock,
            i.Unit AS unit,
            i.Purchase_Date AS purchaseDate,
            i.Expiration_Date AS expirationDate,
            DATEDIFF(i.Expiration_Date, CURDATE()) AS daysRemaining,
            COALESCE(i.Expiring_Soon_Days, ?) AS windowDays
       FROM Item i
       JOIN Category c ON c.Category_ID = i.Category_ID
      WHERE i.Is_Deleted = 0
        AND i.Expiration_Date IS NOT NULL
        AND i.Expiration_Date BETWEEN CURDATE()
            AND DATE_ADD(CURDATE(), INTERVAL COALESCE(i.Expiring_Soon_Days, ?) DAY)
      ORDER BY i.Expiration_Date ASC`,
    [windowDays, windowDays]
  )

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Expiring Soon')
  worksheet.columns = [
    { header: 'Item Name', key: 'itemName' },
    { header: 'Category', key: 'categoryName' },
    { header: 'Quantity', key: 'quantityInStock', style: { numFmt: '#,##0' } },
    { header: 'Unit', key: 'unit' },
    { header: 'Purchase Date', key: 'purchaseDate' },
    { header: 'Expiration Date', key: 'expirationDate' },
    { header: 'Days Remaining', key: 'daysRemaining' },
    { header: 'Window (days)', key: 'windowDays' }
  ]

  rows.forEach(row => {
    worksheet.addRow({
      itemName: row.itemName,
      categoryName: row.categoryName,
      quantityInStock: Number(row.quantityInStock ?? 0),
      unit: row.unit,
      purchaseDate: formatDate(row.purchaseDate),
      expirationDate: formatDate(row.expirationDate),
      daysRemaining: row.daysRemaining,
      windowDays: row.windowDays ?? windowDays
    })
  })

  worksheet.autoFilter = 'A1:H1'
  applyHeaderStyles(worksheet)
  autoSizeColumns(worksheet)

  const suffix = expiringInDays ? `custom-${expiringInDays}` : `default-${windowDays}`
  const filename = `Expiring_Soon_${suffix}_${safeTimestamp()}.xlsx`
  await sendWorkbook(res, workbook, filename)
})

export const exportExpenseReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, period } = expenseExportSchema.parse(req.query)

  if (startDate > endDate) {
    throw new HttpError(400, 'Start date must be before end date')
  }

  const [summaryRows] = await pool.query(
    `SELECT ${bucketExpressions[period]} AS bucket,
            DATE_FORMAT(MIN(r.Report_Date), '%Y-%m-%d') AS rangeStart,
            DATE_FORMAT(MAX(r.Report_Date), '%Y-%m-%d') AS rangeEnd,
            SUM(r.Total_Spent) AS totalSpent,
            SUM(r.Total_Used_Items) AS totalUsedItems
       FROM Report r
      WHERE r.Report_Date BETWEEN ? AND ?
      GROUP BY bucket
      ORDER BY bucket`,
    [startDate, endDate]
  )

  const [detailRows] = await pool.query(
    `SELECT r.Report_Date AS reportDate,
            r.Total_Spent AS totalSpent,
            r.Total_Used_Items AS totalUsedItems,
            u.Username AS username
       FROM Report r
       JOIN \`user\` u ON u.User_ID = r.User_ID
      WHERE r.Report_Date BETWEEN ? AND ?
      ORDER BY r.Report_Date ASC`,
    [startDate, endDate]
  )

  const workbook = new ExcelJS.Workbook()
  const summarySheet = workbook.addWorksheet('Expense Summary')
  summarySheet.columns = [
    { header: 'Period', key: 'periodLabel' },
    { header: 'Range Start', key: 'rangeStart' },
    { header: 'Range End', key: 'rangeEnd' },
    { header: 'Total Spent', key: 'totalSpent', style: { numFmt: '$#,##0.00' } },
    { header: 'Total Used Items', key: 'totalUsedItems', style: { numFmt: '#,##0' } }
  ]

  let totals = { spent: 0, used: 0 }
  summaryRows.forEach(row => {
    const spent = Number(row.totalSpent ?? 0)
    const used = Number(row.totalUsedItems ?? 0)
    totals.spent += spent
    totals.used += used
    summarySheet.addRow({
      periodLabel: formatLabel(period, row.rangeStart, row.rangeEnd),
      rangeStart: row.rangeStart,
      rangeEnd: row.rangeEnd,
      totalSpent: spent,
      totalUsedItems: used
    })
  })

  if (summaryRows.length) {
    summarySheet.addRow({})
  }
  summarySheet.addRow({
    periodLabel: 'Totals',
    totalSpent: totals.spent,
    totalUsedItems: totals.used
  })

  summarySheet.autoFilter = 'A1:E1'
  applyHeaderStyles(summarySheet)
  autoSizeColumns(summarySheet)

  const detailSheet = workbook.addWorksheet('Report Entries')
  detailSheet.columns = [
    { header: 'Report Date', key: 'reportDate' },
    { header: 'Total Spent', key: 'totalSpent', style: { numFmt: '$#,##0.00' } },
    { header: 'Total Used Items', key: 'totalUsedItems', style: { numFmt: '#,##0' } },
    { header: 'Entered By', key: 'username' }
  ]

  detailRows.forEach(row => {
    detailSheet.addRow({
      reportDate: formatDate(row.reportDate),
      totalSpent: Number(row.totalSpent ?? 0),
      totalUsedItems: Number(row.totalUsedItems ?? 0),
      username: row.username
    })
  })

  detailSheet.autoFilter = 'A1:D1'
  applyHeaderStyles(detailSheet)
  autoSizeColumns(detailSheet)

  const filename = `Expense_Report_${startDate}_to_${endDate}_${period}_${safeTimestamp()}.xlsx`
  await sendWorkbook(res, workbook, filename)
})
