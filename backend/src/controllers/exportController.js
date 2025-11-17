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

const toCurrencyNumber = value => Number(value ?? 0)

const mapManualExpenseForExport = row => ({
  expenseId: row.expenseId,
  expenseDate: row.expenseDate,
  paymentType: row.paymentType,
  paidTo: row.paidTo,
  description: row.description ?? '',
  amount: toCurrencyNumber(row.amount),
  source: 'manual'
})

const mapInventoryPurchaseForExport = row => ({
  expenseId: row.purchaseId,
  expenseDate: row.purchaseDate,
  paymentType: row.paymentType ?? 'Inventory',
  paidTo: row.vendorName ?? row.itemName ?? 'Inventory Supplier',
  description: row.description ?? `Inventory restock - ${row.itemName ?? ''}`.trim(),
  amount: toCurrencyNumber(row.totalCost),
  source: 'inventory'
})

const mapInventoryItemForExport = (row, fallbackDate) => {
  const quantity = Number(row.quantityInStock ?? 0)
  const unitCost = Number(row.unitCost ?? 0)
  const amount = Number((quantity * unitCost).toFixed(2))
  if ((!row.purchaseDate && !fallbackDate) || amount <= 0) {
    return null
  }
  return {
    expenseId: `ITEM_${row.itemId}`,
    expenseDate: row.purchaseDate ?? fallbackDate,
    paymentType: 'Inventory',
    paidTo: row.itemName ?? 'Inventory Item',
    description: row.categoryName
      ? `Inventory purchase (${row.categoryName})`
      : 'Inventory purchase',
    amount,
    source: 'inventory'
  }
}

const getBucketKey = (period, dateStringValue) => {
  if (!dateStringValue) return ''
  if (period === 'day') {
    return dateStringValue
  }
  if (period === 'month') {
    return dateStringValue.slice(0, 7)
  }

  const date = new Date(`${dateStringValue}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    return dateStringValue
  }

  const day = date.getUTCDay() || 7
  const thursday = new Date(date)
  thursday.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7)

  return `${thursday.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
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

  const expensePromise = pool.query(
    `SELECT Expense_ID AS expenseId,
            Expense_Date AS expenseDate,
            Payment_Type AS paymentType,
            Paid_To AS paidTo,
            Description AS description,
            Amount AS amount
       FROM Expense
      WHERE Expense_Date BETWEEN ? AND ?
      ORDER BY Expense_Date ASC, Expense_ID ASC`,
    [startDate, endDate]
  )

  const inventoryPurchasesPromise = pool.query(
    `SELECT p.Purchase_ID AS purchaseId,
            p.Purchase_Date AS purchaseDate,
            p.Total_Cost AS totalCost,
            i.Item_Name AS itemName,
            NULL AS vendorName,
            NULL AS paymentType,
            NULL AS description
       FROM Purchase p
       JOIN Item i ON i.Item_ID = p.Item_ID
      WHERE p.Purchase_Date BETWEEN ? AND ?
      ORDER BY p.Purchase_Date ASC, p.Purchase_ID ASC`,
    [startDate, endDate]
  )

  const inventoryFromItemsPromise = pool.query(
    `SELECT i.Item_ID AS itemId,
            i.Item_Name AS itemName,
            i.Purchase_Date AS purchaseDate,
            i.Unit_Cost AS unitCost,
            i.Quantity_in_Stock AS quantityInStock,
            c.Category_Name AS categoryName,
            DATE_FORMAT(i.Created_At, '%Y-%m-%d') AS createdDate
       FROM Item i
  LEFT JOIN Purchase p
         ON p.Item_ID = i.Item_ID
        AND p.Purchase_Date = i.Purchase_Date
  LEFT JOIN Category c ON c.Category_ID = i.Category_ID
      WHERE i.Is_Deleted = 0
        AND i.Purchase_Date IS NOT NULL
        AND i.Purchase_Date BETWEEN ? AND ?
        AND p.Purchase_ID IS NULL
      ORDER BY i.Purchase_Date ASC, i.Item_ID ASC`,
    [startDate, endDate]
  )

  const [[expenses], [inventoryPurchases], [inventoryItems]] = await Promise.all([
    expensePromise,
    inventoryPurchasesPromise,
    inventoryFromItemsPromise
  ])

  const manualExpenseRows = expenses.map(mapManualExpenseForExport)
  const inventoryExpenseRows = [
    ...inventoryPurchases.map(mapInventoryPurchaseForExport),
    ...inventoryItems
      .map(row => mapInventoryItemForExport(row, row.createdDate ?? startDate))
      .filter(Boolean)
  ]

  const combinedExpenses = [...manualExpenseRows, ...inventoryExpenseRows].sort((a, b) => {
    if (a.expenseDate === b.expenseDate) {
      return (a.expenseId ?? 0) < (b.expenseId ?? 0) ? -1 : 1
    }
    return a.expenseDate < b.expenseDate ? -1 : 1
  })

  const summaryMap = new Map()
  combinedExpenses.forEach(row => {
    const date = row.expenseDate
    const bucketKey = getBucketKey(period, date)
    if (!bucketKey) return
    let bucket = summaryMap.get(bucketKey)
    if (!bucket) {
      bucket = {
        bucketKey,
        rangeStart: date,
        rangeEnd: date,
        totalSpent: 0,
        entryCount: 0
      }
      summaryMap.set(bucketKey, bucket)
    }
    if (date < bucket.rangeStart) bucket.rangeStart = date
    if (date > bucket.rangeEnd) bucket.rangeEnd = date
    bucket.totalSpent += row.amount
    bucket.entryCount += 1
  })

  const summaryRows = Array.from(summaryMap.values()).sort((a, b) =>
    a.rangeStart.localeCompare(b.rangeStart)
  )

  const workbook = new ExcelJS.Workbook()
  const summarySheet = workbook.addWorksheet('Expense Summary')
  summarySheet.columns = [
    { header: 'Period', key: 'periodLabel' },
    { header: 'Range Start', key: 'rangeStart' },
    { header: 'Range End', key: 'rangeEnd' },
    { header: 'Total Spent', key: 'totalSpent', style: { numFmt: '$#,##0.00' } },
    { header: 'Entry Count', key: 'entryCount', style: { numFmt: '#,##0' } }
  ]

  let totals = { spent: 0, entries: 0 }
  summaryRows.forEach(row => {
    const spent = Number(row.totalSpent ?? 0)
    const entries = Number(row.entryCount ?? 0)
    totals.spent += spent
    totals.entries += entries
    summarySheet.addRow({
      periodLabel: formatLabel(period, row.rangeStart, row.rangeEnd),
      rangeStart: row.rangeStart,
      rangeEnd: row.rangeEnd,
      totalSpent: spent,
      entryCount: entries
    })
  })

  if (summaryRows.length) {
    summarySheet.addRow({})
  }
  summarySheet.addRow({
    periodLabel: 'Totals',
    totalSpent: totals.spent,
    entryCount: totals.entries
  })

  summarySheet.autoFilter = 'A1:E1'
  applyHeaderStyles(summarySheet)
  autoSizeColumns(summarySheet)

  const detailSheet = workbook.addWorksheet('Report Entries')
  detailSheet.columns = [
    { header: 'Date', key: 'expenseDate' },
    { header: 'Source', key: 'source' },
    { header: 'Payment Type', key: 'paymentType' },
    { header: 'Paid To', key: 'paidTo' },
    { header: 'Description', key: 'description' },
    { header: 'Amount', key: 'amount', style: { numFmt: '$#,##0.00' } }
  ]

  combinedExpenses.forEach(row => {
    detailSheet.addRow({
      expenseDate: formatDate(row.expenseDate),
      source: row.source,
      paymentType: row.paymentType,
      paidTo: row.paidTo,
      description: row.description,
      amount: Number(row.amount ?? 0)
    })
  })

  detailSheet.autoFilter = 'A1:F1'
  applyHeaderStyles(detailSheet)
  autoSizeColumns(detailSheet)

  const filename = `Expense_Report_${startDate}_to_${endDate}_${period}_${safeTimestamp()}.xlsx`
  await sendWorkbook(res, workbook, filename)
})
