import { z } from 'zod'

import { getPool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { generateId } from '../utils/id.js'

// Items controller
// - listItems: read items joined with their category names
// - createItem: validate input, generate an ID, insert, and return the new row
// - updateItem: validate which fields changed and update only those columns
// - deleteItem: remove by primary key

const pool = getPool()

const statusEnum = ['AVAILABLE', 'LOW', 'OUT_OF_STOCK']
const itemTypes = ['MATERIAL', 'UTENSIL', 'OTHER']
const allowedUnits = ['each', 'lb', 'kg', 'case', 'bag', 'box', 'pack', 'gallon', 'liter']

// Accept a date in YYYY-MM-DD format
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

const optionalDate = z
  .union([dateString, z.literal('').transform(() => null), z.null().transform(() => null)])
  .optional()
  .transform(value => (value === undefined ? undefined : value))

// Expiration date can be blank in the UI. We convert '' to null so MySQL stores it cleanly.
const expirationDateSchema = z
  .union([dateString, z.literal('').transform(() => null), z.null()])
  .optional()

const unitSchema = z
  .string()
  .min(1)
  .transform(value => value.trim().toLowerCase())
  .refine(value => allowedUnits.includes(value), {
    message: `Unit must be one of: ${allowedUnits.join(', ')}`
  })

const statusSchema = z.preprocess(
  value => {
    if (typeof value === 'string') {
      const trimmed = value.trim().toUpperCase()
      return trimmed || undefined
    }
    return value
  },
  z.enum(statusEnum).default('AVAILABLE')
)

const itemTypeSchema = z.preprocess(
  value => {
    if (typeof value === 'string') {
      const trimmed = value.trim().toUpperCase()
      return trimmed || undefined
    }
    return value
  },
  z.enum(itemTypes).default('MATERIAL')
)

const itemSchema = z.object({
  itemName: z.string().min(1).max(120),
  categoryId: z.string().min(1),
  quantityInStock: z.coerce.number().int().nonnegative(),
  unit: unitSchema,
  unitCost: z.coerce.number().nonnegative(),
  purchaseDate: optionalDate,
  shelfLifeDays: z.coerce.number().int().nonnegative().optional(),
  expirationDate: expirationDateSchema,
  status: statusSchema,
  itemType: itemTypeSchema,
  parLevel: z.coerce.number().int().nonnegative().optional(),
  reorderPoint: z.coerce.number().int().nonnegative().optional()
})

const usageLogSchema = z.object({
  usedQuantity: z.coerce.number().positive(),
  usageDate: dateString.optional(),
  notes: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform(value => (value === undefined || value === '' ? undefined : value))
})

const paramsSchema = z.object({
  id: z.string().min(1)
})

export const listItems = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT i.Item_ID AS itemId,
            i.Item_Name AS itemName,
            i.Category_ID AS categoryId,
            c.Category_Name AS categoryName,
            i.Quantity_in_Stock AS quantityInStock,
            i.Unit AS unit,
            i.Unit_Cost AS unitCost,
            i.Purchase_Date AS purchaseDate,
            i.Shelf_Life_Days AS shelfLifeDays,
            i.Expiration_Date AS expirationDate,
            i.Status AS status,
            i.Item_Type AS itemType,
            i.Par_Level AS parLevel,
            i.Reorder_Point AS reorderPoint,
            i.Low_Stock_Threshold AS lowStockThreshold,
            i.Expiring_Soon_Days AS expiringSoonDays
       FROM Item i
       JOIN Category c ON c.Category_ID = i.Category_ID
      WHERE i.Is_Deleted = 0
      ORDER BY i.Item_Name ASC`
  )
  res.json(rows)
})

export const createItem = asyncHandler(async (req, res) => {
  const payload = itemSchema.parse(req.body)
  const itemId = generateId('ITM_', 20)

  await pool.query(
    `INSERT INTO Item
      (Item_ID, Item_Name, Category_ID, Quantity_in_Stock, Unit, Unit_Cost, Purchase_Date, Low_Stock_Threshold, Expiring_Soon_Days, Shelf_Life_Days, Expiration_Date, Status, Item_Type, Par_Level, Reorder_Point)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      itemId,
      payload.itemName,
      payload.categoryId,
      payload.quantityInStock,
      payload.unit,
      payload.unitCost,
      payload.purchaseDate || null,
      payload.lowStockThreshold ?? null,
      payload.expiringSoonDays ?? null,
      payload.shelfLifeDays,
      payload.expirationDate || null,
      payload.status,
      payload.itemType,
      payload.parLevel ?? 0,
      payload.reorderPoint ?? 0
    ]
  )

  const [rows] = await pool.query(
    `SELECT i.Item_ID AS itemId,
            i.Item_Name AS itemName,
            i.Category_ID AS categoryId,
            c.Category_Name AS categoryName,
            i.Quantity_in_Stock AS quantityInStock,
            i.Unit AS unit,
            i.Unit_Cost AS unitCost,
            i.Purchase_Date AS purchaseDate,
            i.Shelf_Life_Days AS shelfLifeDays,
            i.Expiration_Date AS expirationDate,
            i.Status AS status,
            i.Item_Type AS itemType,
            i.Par_Level AS parLevel,
            i.Reorder_Point AS reorderPoint,
            i.Low_Stock_Threshold AS lowStockThreshold,
            i.Expiring_Soon_Days AS expiringSoonDays
       FROM Item i
       JOIN Category c ON c.Category_ID = i.Category_ID
      WHERE i.Item_ID = ? AND i.Is_Deleted = 0`,
    [itemId]
  )

  res.status(201).json(rows[0])
})

export const updateItem = asyncHandler(async (req, res) => {
  const { id } = paramsSchema.parse(req.params)
  const payload = itemSchema.partial().parse(req.body)

  const fields = []
  const values = []

  const mapping = {
    itemName: 'Item_Name',
    categoryId: 'Category_ID',
    quantityInStock: 'Quantity_in_Stock',
    unit: 'Unit',
    unitCost: 'Unit_Cost',
    purchaseDate: 'Purchase_Date',
    shelfLifeDays: 'Shelf_Life_Days',
    expirationDate: 'Expiration_Date',
    status: 'Status',
    itemType: 'Item_Type',
    parLevel: 'Par_Level',
    reorderPoint: 'Reorder_Point',
    lowStockThreshold: 'Low_Stock_Threshold',
    expiringSoonDays: 'Expiring_Soon_Days'
  }

  Object.entries(payload).forEach(([key, value]) => {
    fields.push(`${mapping[key]} = ?`)
    values.push(value === '' ? null : value)
  })

  if (!fields.length) {
    throw new HttpError(400, 'No fields provided for update')
  }

  values.push(id)

  const [result] = await pool.query(
    `UPDATE Item
        SET ${fields.join(', ')}
      WHERE Item_ID = ?
        AND Is_Deleted = 0`,
    values
  )

  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Item not found')
  }

  const [rows] = await pool.query(
    `SELECT i.Item_ID AS itemId,
            i.Item_Name AS itemName,
            i.Category_ID AS categoryId,
            c.Category_Name AS categoryName,
            i.Quantity_in_Stock AS quantityInStock,
            i.Unit AS unit,
            i.Unit_Cost AS unitCost,
            i.Purchase_Date AS purchaseDate,
            i.Shelf_Life_Days AS shelfLifeDays,
            i.Expiration_Date AS expirationDate,
            i.Status AS status,
            i.Item_Type AS itemType,
            i.Par_Level AS parLevel,
            i.Reorder_Point AS reorderPoint,
            i.Low_Stock_Threshold AS lowStockThreshold,
            i.Expiring_Soon_Days AS expiringSoonDays
       FROM Item i
       JOIN Category c ON c.Category_ID = i.Category_ID
      WHERE i.Item_ID = ? AND i.Is_Deleted = 0`,
    [id]
  )

  res.json(rows[0])
})

export const logItemUsage = asyncHandler(async (req, res) => {
  const { id } = paramsSchema.parse(req.params)
  const payload = usageLogSchema.parse(req.body)

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const [items] = await connection.query(
      `SELECT Item_ID AS itemId,
              Quantity_in_Stock AS quantityInStock
         FROM Item
        WHERE Item_ID = ?
          AND Is_Deleted = 0
        FOR UPDATE`,
      [id]
    )

    if (!items.length) {
      throw new HttpError(404, 'Item not found')
    }

    const currentQuantity = Number(items[0].quantityInStock ?? 0)
    const usedQuantity = Number(payload.usedQuantity)
    const nextQuantity = Math.max(currentQuantity - usedQuantity, 0)
    const usageDate = payload.usageDate ?? new Date().toISOString().slice(0, 10)

    await connection.query(
      `INSERT INTO Inventory_Usage (Item_ID, Used_Quantity, Usage_Date, Notes)
       VALUES (?, ?, ?, ?)`,
      [id, usedQuantity, usageDate, payload.notes ?? null]
    )

    await connection.query(
      `UPDATE Item
          SET Quantity_in_Stock = ?, Updated_At = NOW()
        WHERE Item_ID = ?`,
      [nextQuantity, id]
    )

    const [rows] = await connection.query(
      `SELECT i.Item_ID AS itemId,
              i.Item_Name AS itemName,
              i.Category_ID AS categoryId,
              c.Category_Name AS categoryName,
              i.Quantity_in_Stock AS quantityInStock,
              i.Unit AS unit,
              i.Unit_Cost AS unitCost,
            i.Purchase_Date AS purchaseDate,
              i.Shelf_Life_Days AS shelfLifeDays,
              i.Expiration_Date AS expirationDate,
              i.Status AS status,
              i.Item_Type AS itemType,
              i.Par_Level AS parLevel,
              i.Reorder_Point AS reorderPoint
         FROM Item i
         JOIN Category c ON c.Category_ID = i.Category_ID
        WHERE i.Item_ID = ?`,
      [id]
    )

    await connection.commit()

    res.json({
      message: 'Usage logged successfully',
      item: rows[0],
      usedQuantity,
      usageDate
    })
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
})

export const deleteItem = asyncHandler(async (req, res) => {
  const { id } = paramsSchema.parse(req.params)
  const [result] = await pool.query(
    `UPDATE Item
        SET Is_Deleted = 1,
            Deleted_At = NOW(),
            Updated_At = NOW()
      WHERE Item_ID = ?
        AND Is_Deleted = 0`,
    [id]
  )
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Item not found')
  }
  res.status(204).send()
})

export const listDeletedItems = asyncHandler(async (req, res) => {
  await pool.query(
    `DELETE FROM Item
      WHERE Is_Deleted = 1
        AND Deleted_At IS NOT NULL
        AND Deleted_At < DATE_SUB(NOW(), INTERVAL 7 DAY)`
  )

  const [rows] = await pool.query(
    `SELECT i.Item_ID AS itemId,
            i.Item_Name AS itemName,
            i.Category_ID AS categoryId,
            c.Category_Name AS categoryName,
            i.Quantity_in_Stock AS quantityInStock,
            i.Unit AS unit,
            i.Unit_Cost AS unitCost,
            i.Purchase_Date AS purchaseDate,
            i.Shelf_Life_Days AS shelfLifeDays,
            i.Expiration_Date AS expirationDate,
            i.Status AS status,
            i.Item_Type AS itemType,
            i.Par_Level AS parLevel,
            i.Reorder_Point AS reorderPoint,
            i.Low_Stock_Threshold AS lowStockThreshold,
            i.Expiring_Soon_Days AS expiringSoonDays,
            i.Deleted_At AS deletedAt
       FROM Item i
       JOIN Category c ON c.Category_ID = i.Category_ID
      WHERE i.Is_Deleted = 1
      ORDER BY i.Deleted_At DESC`
  )

  res.json(rows)
})

export const restoreItem = asyncHandler(async (req, res) => {
  const { id } = paramsSchema.parse(req.params)
  const [result] = await pool.query(
    `UPDATE Item
        SET Is_Deleted = 0,
            Deleted_At = NULL,
            Updated_At = NOW()
      WHERE Item_ID = ?
        AND Is_Deleted = 1`,
    [id]
  )

  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Deleted item not found')
  }

  const [rows] = await pool.query(
    `SELECT i.Item_ID AS itemId,
            i.Item_Name AS itemName,
            i.Category_ID AS categoryId,
            c.Category_Name AS categoryName,
            i.Quantity_in_Stock AS quantityInStock,
            i.Unit AS unit,
            i.Unit_Cost AS unitCost,
            i.Purchase_Date AS purchaseDate,
            i.Shelf_Life_Days AS shelfLifeDays,
            i.Expiration_Date AS expirationDate,
            i.Status AS status,
            i.Item_Type AS itemType,
            i.Par_Level AS parLevel,
            i.Reorder_Point AS reorderPoint,
            i.Low_Stock_Threshold AS lowStockThreshold,
            i.Expiring_Soon_Days AS expiringSoonDays
       FROM Item i
       JOIN Category c ON c.Category_ID = i.Category_ID
      WHERE i.Item_ID = ?`,
    [id]
  )

  res.json(rows[0])
})

export const permanentlyDeleteItem = asyncHandler(async (req, res) => {
  const { id } = paramsSchema.parse(req.params)

  const [result] = await pool.query(
    `DELETE FROM Item
      WHERE Item_ID = ?
        AND Is_Deleted = 1`,
    [id]
  )

  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Deleted item not found')
  }

  res.status(204).send()
})
