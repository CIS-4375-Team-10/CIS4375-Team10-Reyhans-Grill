import { z } from 'zod'

import { getPool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { generateId } from '../utils/id.js'

const pool = getPool()

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

const purchaseSchema = z.object({
  itemId: z.string().min(1),
  userId: z.string().min(1),
  quantityPurchased: z.coerce.number().int().positive(),
  purchaseDate: dateString,
  totalCost: z.coerce.number().nonnegative()
})

export const listPurchases = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.Purchase_ID AS purchaseId,
            p.Item_ID AS itemId,
            i.Item_Name AS itemName,
            p.User_ID AS userId,
            u.Username AS username,
            p.Quantity_Purchased AS quantityPurchased,
            p.Purchase_Date AS purchaseDate,
            p.Total_Cost AS totalCost
       FROM Purchase p
       JOIN Item i ON i.Item_ID = p.Item_ID
       JOIN \`user\` u ON u.User_ID = p.User_ID
      ORDER BY p.Purchase_Date DESC`
  )
  res.json(rows)
})

export const createPurchase = asyncHandler(async (req, res) => {
  const payload = purchaseSchema.parse(req.body)
  const purchaseId = generateId('PUR_', 24)

  await pool.query(
    `INSERT INTO Purchase (Purchase_ID, Item_ID, User_ID, Quantity_Purchased, Purchase_Date, Total_Cost)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      purchaseId,
      payload.itemId,
      payload.userId,
      payload.quantityPurchased,
      payload.purchaseDate,
      payload.totalCost
    ]
  )

  const [rows] = await pool.query(
    `SELECT p.Purchase_ID AS purchaseId,
            p.Item_ID AS itemId,
            i.Item_Name AS itemName,
            p.User_ID AS userId,
            u.Username AS username,
            p.Quantity_Purchased AS quantityPurchased,
            p.Purchase_Date AS purchaseDate,
            p.Total_Cost AS totalCost
       FROM Purchase p
       JOIN Item i ON i.Item_ID = p.Item_ID
       JOIN \`user\` u ON u.User_ID = p.User_ID
      WHERE p.Purchase_ID = ?`,
    [purchaseId]
  )

  res.status(201).json(rows[0])
})
