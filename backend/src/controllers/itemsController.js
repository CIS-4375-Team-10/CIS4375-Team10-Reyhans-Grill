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

// Accept a date in YYYY-MM-DD format
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

// Expiration date can be blank in the UI. We convert '' to null so MySQL stores it cleanly.
const expirationDateSchema = z
  .union([dateString, z.literal('').transform(() => null), z.null()])
  .optional()

const itemSchema = z.object({
  itemName: z.string().min(1).max(120),
  categoryId: z.string().min(1),
  quantityInStock: z.coerce.number().int().nonnegative(),
  unitCost: z.coerce.number().nonnegative(),
  shelfLifeDays: z.coerce.number().int().nonnegative(),
  expirationDate: expirationDateSchema,
  status: z.enum(statusEnum).default('AVAILABLE'),
  itemType: z.enum(itemTypes).default('MATERIAL'),
  parLevel: z.coerce.number().int().nonnegative().optional(),
  reorderPoint: z.coerce.number().int().nonnegative().optional()
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
            i.Unit_Cost AS unitCost,
            i.Shelf_Life_Days AS shelfLifeDays,
            i.Expiration_Date AS expirationDate,
            i.Status AS status,
            i.Item_Type AS itemType,
            i.Par_Level AS parLevel,
            i.Reorder_Point AS reorderPoint
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
      (Item_ID, Item_Name, Category_ID, Quantity_in_Stock, Unit_Cost, Shelf_Life_Days, Expiration_Date, Status, Item_Type, Par_Level, Reorder_Point)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      itemId,
      payload.itemName,
      payload.categoryId,
      payload.quantityInStock,
      payload.unitCost,
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
            i.Unit_Cost AS unitCost,
            i.Shelf_Life_Days AS shelfLifeDays,
            i.Expiration_Date AS expirationDate,
            i.Status AS status,
            i.Item_Type AS itemType,
            i.Par_Level AS parLevel,
            i.Reorder_Point AS reorderPoint
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
    unitCost: 'Unit_Cost',
    shelfLifeDays: 'Shelf_Life_Days',
    expirationDate: 'Expiration_Date',
    status: 'Status',
    itemType: 'Item_Type',
    parLevel: 'Par_Level',
    reorderPoint: 'Reorder_Point'
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
            i.Unit_Cost AS unitCost,
            i.Shelf_Life_Days AS shelfLifeDays,
            i.Expiration_Date AS expirationDate,
            i.Status AS status,
            i.Item_Type AS itemType,
            i.Par_Level AS parLevel,
            i.Reorder_Point AS reorderPoint
       FROM Item i
       JOIN Category c ON c.Category_ID = i.Category_ID
      WHERE i.Item_ID = ? AND i.Is_Deleted = 0`,
    [id]
  )

  res.json(rows[0])
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
            i.Unit_Cost AS unitCost,
            i.Shelf_Life_Days AS shelfLifeDays,
            i.Expiration_Date AS expirationDate,
            i.Status AS status,
            i.Item_Type AS itemType,
            i.Par_Level AS parLevel,
            i.Reorder_Point AS reorderPoint,
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
            i.Unit_Cost AS unitCost,
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

  res.json(rows[0])
})
