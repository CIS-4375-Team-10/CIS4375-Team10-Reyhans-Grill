import ExcelJS from 'exceljs'
import { z } from 'zod'

import { getPool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'

const pool = getPool()

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

const trackerQuerySchema = z.object({
  from: dateString.optional(),
  to: dateString.optional()
})

const expenseIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
})

const electronicIncomeSchema = z.object({
  incomeDate: dateString,
  channel: z.string().trim().min(1),
  amount: z.coerce.number().nonnegative(),
  notes: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform(value => (value === undefined || value === '' ? null : value))
})

const cashIncomeSchema = z.object({
  incomeDate: dateString,
  amount: z.coerce.number().nonnegative(),
  notes: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform(value => (value === undefined || value === '' ? null : value))
})

const expenseSchema = z.object({
  expenseDate: dateString,
  paymentType: z.string().trim().min(1),
  paidTo: z.string().trim().min(1),
  description: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform(value => (value === undefined || value === '' ? null : value)),
  amount: z.coerce.number().nonnegative()
})

const formatDate = date => date.toISOString().slice(0, 10)

const defaultRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    from: formatDate(start),
    to: formatDate(end)
  }
}

const normalizeRange = ({ from, to }) => {
  const fallback = defaultRange()
  const range = {
    from: from ?? fallback.from,
    to: to ?? fallback.to
  }

  if (range.from > range.to) {
    throw new HttpError(400, 'Start date must be before end date')
  }

  return range
}

const toCurrencyNumber = value => Number(value ?? 0)

const mapManualExpense = row => ({
  expenseId: row.expenseId,
  expenseDate: row.expenseDate,
  paymentType: row.paymentType,
  paidTo: row.paidTo,
  description: row.description ?? '',
  amount: toCurrencyNumber(row.amount),
  source: 'manual'
})

const mapInventoryPurchase = row => ({
  expenseId: row.purchaseId,
  expenseDate: row.purchaseDate,
  paymentType: row.paymentType ?? 'CHASE',
  paidTo: row.vendorName ?? row.itemName ?? 'Inventory Supplier',
  description: row.description ?? `Inventory restock - ${row.itemName ?? ''}`.trim(),
  amount: toCurrencyNumber(row.totalCost),
  source: 'inventory'
})

const mapInventoryItem = (row, fallbackDate) => {
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

export const getExpenseTrackerSnapshot = asyncHandler(async (req, res) => {
  const parsed = trackerQuerySchema.parse(req.query)
  const range = normalizeRange(parsed)

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
    [range.from, range.to]
  )

  const cashPromise = pool.query(
    `SELECT Cash_ID AS cashIncomeId,
            Income_Date AS incomeDate,
            Amount AS amount,
            Notes AS notes
       FROM Cash_Income
      WHERE Income_Date BETWEEN ? AND ?
      ORDER BY Income_Date ASC, Cash_ID ASC`,
    [range.from, range.to]
  )

  const electronicPromise = pool.query(
    `SELECT Electronic_ID AS electronicIncomeId,
            Income_Date AS incomeDate,
            Channel AS paymentType,
            Amount AS amount,
            Notes AS notes
       FROM Electronic_Income
      WHERE Income_Date BETWEEN ? AND ?
      ORDER BY Income_Date ASC, Electronic_ID ASC`,
    [range.from, range.to]
  )

  const inventoryPromise = pool.query(
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
    [range.from, range.to]
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
    [range.from, range.to]
  )

  const [[expenses], [cash], [electronic], [inventoryPurchases], [inventoryItems]] = await Promise.all([
    expensePromise,
    cashPromise,
    electronicPromise,
    inventoryPromise,
    inventoryFromItemsPromise
  ])

  const manualExpenseRows = expenses.map(mapManualExpense)
  const inventoryExpenseRows = [
    ...inventoryPurchases.map(mapInventoryPurchase),
    ...inventoryItems
      .map(row => mapInventoryItem(row, row.createdDate ?? range.from))
      .filter(Boolean)
  ]

  const combinedExpenses = [...manualExpenseRows, ...inventoryExpenseRows].sort((a, b) => {
    if (a.expenseDate === b.expenseDate) {
      return (a.expenseId ?? 0) < (b.expenseId ?? 0) ? -1 : 1
    }
    return a.expenseDate < b.expenseDate ? -1 : 1
  })

  const manualTotal = manualExpenseRows.reduce((sum, row) => sum + row.amount, 0)
  const inventoryTotal = inventoryExpenseRows.reduce((sum, row) => sum + row.amount, 0)
  const expenseTotal = manualTotal + inventoryTotal
  const cashTotal = cash.reduce((sum, row) => sum + toCurrencyNumber(row.amount), 0)
  const electronicTotal = electronic.reduce(
    (sum, row) => sum + toCurrencyNumber(row.amount),
    0
  )

  res.json({
    range,
    expenses: {
      total: expenseTotal,
      inventoryTotal,
      otherTotal: manualTotal,
      rows: combinedExpenses
    },
    cashIncome: {
      total: cashTotal,
      rows: cash.map(row => ({
        cashIncomeId: row.cashIncomeId,
        incomeDate: row.incomeDate,
        amount: toCurrencyNumber(row.amount),
        notes: row.notes ?? ''
      }))
    },
    electronicIncome: {
      total: electronicTotal,
      rows: electronic.map(row => ({
        electronicIncomeId: row.electronicIncomeId,
        incomeDate: row.incomeDate,
        paymentType: row.paymentType,
        amount: toCurrencyNumber(row.amount),
        notes: row.notes ?? ''
      }))
    },
    netIncome: cashTotal + electronicTotal - expenseTotal
  })
})

const singleRow = rows => rows[0]

export const createElectronicIncome = asyncHandler(async (req, res) => {
  const payload = electronicIncomeSchema.parse(req.body)
  const [result] = await pool.query(
    `INSERT INTO Electronic_Income (Income_Date, Channel, Amount, Notes)
     VALUES (?, ?, ?, ?)`,
    [payload.incomeDate, payload.channel, payload.amount, payload.notes ?? null]
  )

  const [rows] = await pool.query(
    `SELECT Electronic_ID AS electronicIncomeId,
            Income_Date AS incomeDate,
            Channel AS paymentType,
            Amount AS amount,
            Notes AS notes
       FROM Electronic_Income
      WHERE Electronic_ID = ?`,
    [result.insertId]
  )

  res.status(201).json(singleRow(rows))
})

export const createCashIncome = asyncHandler(async (req, res) => {
  const payload = cashIncomeSchema.parse(req.body)
  const [result] = await pool.query(
    `INSERT INTO Cash_Income (Income_Date, Amount, Notes)
     VALUES (?, ?, ?)`,
    [payload.incomeDate, payload.amount, payload.notes ?? null]
  )

  const [rows] = await pool.query(
    `SELECT Cash_ID AS cashIncomeId,
            Income_Date AS incomeDate,
            Amount AS amount,
            Notes AS notes
       FROM Cash_Income
      WHERE Cash_ID = ?`,
    [result.insertId]
  )

  res.status(201).json(singleRow(rows))
})

export const updateElectronicIncome = asyncHandler(async (req, res) => {
  const { id } = expenseIdParamSchema.parse(req.params)
  const payload = electronicIncomeSchema.partial().parse(req.body)
  const entries = Object.entries(payload)
  if (!entries.length) {
    throw new HttpError(400, 'No fields provided for update')
  }

  const mapping = {
    incomeDate: 'Income_Date',
    channel: 'Channel',
    amount: 'Amount',
    notes: 'Notes'
  }

  const fields = []
  const values = []
  entries.forEach(([key, value]) => {
    fields.push(`${mapping[key]} = ?`)
    values.push(value === '' ? null : value)
  })
  values.push(id)

  const [result] = await pool.query(
    `UPDATE Electronic_Income
        SET ${fields.join(', ')}, Updated_At = NOW()
      WHERE Electronic_ID = ?`,
    values
  )

  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Electronic income not found')
  }

  const [rows] = await pool.query(
    `SELECT Electronic_ID AS electronicIncomeId,
            Income_Date AS incomeDate,
            Channel AS paymentType,
            Amount AS amount,
            Notes AS notes
       FROM Electronic_Income
      WHERE Electronic_ID = ?`,
    [id]
  )

  res.json(rows[0])
})

export const deleteElectronicIncome = asyncHandler(async (req, res) => {
  const { id } = expenseIdParamSchema.parse(req.params)
  const [result] = await pool.query(`DELETE FROM Electronic_Income WHERE Electronic_ID = ?`, [id])
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Electronic income not found')
  }
  res.status(204).send()
})

export const updateCashIncome = asyncHandler(async (req, res) => {
  const { id } = expenseIdParamSchema.parse(req.params)
  const payload = cashIncomeSchema.partial().parse(req.body)
  const entries = Object.entries(payload)
  if (!entries.length) {
    throw new HttpError(400, 'No fields provided for update')
  }

  const mapping = {
    incomeDate: 'Income_Date',
    amount: 'Amount',
    notes: 'Notes'
  }

  const fields = []
  const values = []
  entries.forEach(([key, value]) => {
    fields.push(`${mapping[key]} = ?`)
    values.push(value === '' ? null : value)
  })
  values.push(id)

  const [result] = await pool.query(
    `UPDATE Cash_Income
        SET ${fields.join(', ')}, Updated_At = NOW()
      WHERE Cash_ID = ?`,
    values
  )

  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Cash income not found')
  }

  const [rows] = await pool.query(
    `SELECT Cash_ID AS cashIncomeId,
            Income_Date AS incomeDate,
            Amount AS amount,
            Notes AS notes
       FROM Cash_Income
      WHERE Cash_ID = ?`,
    [id]
  )

  res.json(rows[0])
})

export const deleteCashIncome = asyncHandler(async (req, res) => {
  const { id } = expenseIdParamSchema.parse(req.params)
  const [result] = await pool.query(`DELETE FROM Cash_Income WHERE Cash_ID = ?`, [id])
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Cash income not found')
  }
  res.status(204).send()
})

export const createExpenseEntry = asyncHandler(async (req, res) => {
  const payload = expenseSchema.parse(req.body)
  const [result] = await pool.query(
    `INSERT INTO Expense (Expense_Date, Payment_Type, Paid_To, Description, Amount)
     VALUES (?, ?, ?, ?, ?)`,
    [payload.expenseDate, payload.paymentType, payload.paidTo, payload.description ?? null, payload.amount]
  )

  const [rows] = await pool.query(
    `SELECT Expense_ID AS expenseId,
            Expense_Date AS expenseDate,
            Payment_Type AS paymentType,
            Paid_To AS paidTo,
            Description AS description,
            Amount AS amount
       FROM Expense
      WHERE Expense_ID = ?`,
    [result.insertId]
  )

  res.status(201).json(singleRow(rows))
})

const normalizeDateValue = raw => {
  if (raw == null) return null
  if (raw instanceof Date) {
    return formatDate(raw)
  }
  if (typeof raw === 'number' && !Number.isNaN(raw)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const date = new Date(excelEpoch.getTime() + raw * 24 * 60 * 60 * 1000)
    if (!Number.isNaN(date.getTime())) {
      return formatDate(date)
    }
  }
  const str = String(raw).trim()
  if (!str) return null
  const parsed = new Date(str)
  if (!Number.isNaN(parsed.getTime())) {
    return formatDate(parsed)
  }
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (match) {
    const [, month, day, yearRaw] = match
    const year = Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw)
    return `${year.toString().padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return null
}

const toNumber = raw => {
  if (raw == null || raw === '') return null
  const num = Number(raw)
  return Number.isNaN(num) ? null : num
}

const importParsers = {
  expenses: worksheet => {
    const headers = mapHeaders(worksheet.getRow(1))
    const dateIdx = headers.date ?? 1
    const paymentTypeIdx = headers.paymentType ?? 2
    const paidToIdx = headers.paidTo ?? 3
    const descriptionIdx = headers.description ?? 4
    const amountIdx = headers.amount ?? 5
    const rows = []
    worksheet.eachRow((row, idx) => {
      if (idx === 1) return
      const expenseDate = normalizeDateValue(row.getCell(dateIdx)?.value)
      const amount = toNumber(row.getCell(amountIdx)?.value)
      if (!expenseDate || amount == null) {
        return
      }
      rows.push({
        expenseDate,
        paymentType: cellText(row.getCell(paymentTypeIdx)),
        paidTo: cellText(row.getCell(paidToIdx)),
        description: cellText(row.getCell(descriptionIdx)),
        amount
      })
    })
    return rows
  },
  cash: worksheet => {
    const headers = mapHeaders(worksheet.getRow(1))
    const dateIdx = headers.date ?? 1
    const amountIdx = headers.amount ?? 2
    const notesIdx = headers.notes ?? 3
    const rows = []
    worksheet.eachRow((row, idx) => {
      if (idx === 1) return
      const incomeDate = normalizeDateValue(row.getCell(dateIdx)?.value)
      const amount = toNumber(row.getCell(amountIdx)?.value)
      if (!incomeDate || amount == null) {
        return
      }
      rows.push({
        incomeDate,
        amount,
        notes: cellText(row.getCell(notesIdx))
      })
    })
    return rows
  },
  electronic: worksheet => {
    const headers = mapHeaders(worksheet.getRow(1))
    const dateIdx = headers.date ?? 1
    const paymentTypeIdx = headers.paymentType ?? 2
    const amountIdx = headers.amount ?? 3
    const notesIdx = headers.notes ?? 4
    const rows = []
    worksheet.eachRow((row, idx) => {
      if (idx === 1) return
      const incomeDate = normalizeDateValue(row.getCell(dateIdx)?.value)
      const amount = toNumber(row.getCell(amountIdx)?.value)
      if (!incomeDate || amount == null) {
        return
      }
      rows.push({
        incomeDate,
        channel: cellText(row.getCell(paymentTypeIdx)) || 'Unknown',
        amount,
        notes: cellText(row.getCell(notesIdx))
      })
    })
    return rows
  }
}

const cellText = cell => {
  if (!cell) return ''
  if (typeof cell.text === 'string' && cell.text.trim() !== '') {
    return cell.text.trim()
  }
  if (cell.value == null) return ''
  if (cell.value instanceof Date) {
    return formatDate(cell.value)
  }
  if (typeof cell.value === 'object' && cell.value.text) {
    return String(cell.value.text).trim()
  }
  return String(cell.value).trim()
}

const mapHeaders = headerRow => {
  const map = {}
  const source = headerRow?.values ?? []
  const normalized = source.map(value =>
    typeof value === 'string' ? value.trim().toLowerCase() : ''
  )
  const findHeader = names => {
    const idx = normalized.findIndex(val => names.includes(val))
    return idx === -1 ? undefined : idx
  }

  map.date = findHeader(['date'])
  map.amount = findHeader(['amount', 'amount paid'])
  map.paymentType = findHeader(['payment type', 'channel', 'payment'])
  map.paidTo = findHeader(['paid to', 'payee'])
  map.description = findHeader(['description', 'notes', 'memo'])
  map.notes = findHeader(['notes', 'description', 'memo'])

  return map
}

export const importFinanceEntries = asyncHandler(async (req, res) => {
  const type = String(req.body?.type ?? '').trim().toLowerCase()
  if (!['expenses', 'cash', 'electronic'].includes(type)) {
    throw new HttpError(400, 'type must be one of expenses, cash, or electronic')
  }
  if (!req.file?.buffer) {
    throw new HttpError(400, 'Upload an Excel file named "file"')
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(req.file.buffer)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new HttpError(400, 'No worksheet found in uploaded file')
  }

  const parser = importParsers[type]
  const entries = parser(worksheet).filter(entry => Boolean(entry))

  if (!entries.length) {
    throw new HttpError(400, 'No valid rows found to import')
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    if (type === 'expenses') {
      for (const entry of entries) {
        await connection.query(
          `INSERT INTO Expense (Expense_Date, Payment_Type, Paid_To, Description, Amount)
           VALUES (?, ?, ?, ?, ?)`,
          [
            entry.expenseDate,
            entry.paymentType || 'Unspecified',
            entry.paidTo || 'Unspecified',
            entry.description || null,
            entry.amount
          ]
        )
      }
    } else if (type === 'cash') {
      for (const entry of entries) {
        await connection.query(
          `INSERT INTO Cash_Income (Income_Date, Amount, Notes)
           VALUES (?, ?, ?)`,
          [entry.incomeDate, entry.amount, entry.notes || null]
        )
      }
    } else {
      for (const entry of entries) {
        await connection.query(
          `INSERT INTO Electronic_Income (Income_Date, Channel, Amount, Notes)
           VALUES (?, ?, ?, ?)`,
          [entry.incomeDate, entry.channel || 'Unspecified', entry.amount, entry.notes || null]
        )
      }
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  res.status(201).json({
    type,
    imported: entries.length
  })
})

export const updateExpenseEntry = asyncHandler(async (req, res) => {
  const { id } = expenseIdParamSchema.parse(req.params)
  const payload = expenseSchema.partial().parse(req.body)

  const entries = Object.entries(payload)
  if (!entries.length) {
    throw new HttpError(400, 'No fields provided for update')
  }

  const mapping = {
    expenseDate: 'Expense_Date',
    paymentType: 'Payment_Type',
    paidTo: 'Paid_To',
    description: 'Description',
    amount: 'Amount'
  }

  const fields = []
  const values = []
  entries.forEach(([key, value]) => {
    fields.push(`${mapping[key]} = ?`)
    values.push(value === '' ? null : value)
  })
  values.push(id)

  const [result] = await pool.query(
    `UPDATE Expense
        SET ${fields.join(', ')}, Updated_At = NOW()
      WHERE Expense_ID = ?`,
    values
  )

  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Expense not found')
  }

  const [rows] = await pool.query(
    `SELECT Expense_ID AS expenseId,
            Expense_Date AS expenseDate,
            Payment_Type AS paymentType,
            Paid_To AS paidTo,
            Description AS description,
            Amount AS amount
       FROM Expense
      WHERE Expense_ID = ?`,
    [id]
  )

  res.json(rows[0])
})

export const deleteExpenseEntry = asyncHandler(async (req, res) => {
  const { id } = expenseIdParamSchema.parse(req.params)
  const [result] = await pool.query(`DELETE FROM Expense WHERE Expense_ID = ?`, [id])
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Expense not found')
  }
  res.status(204).send()
})
