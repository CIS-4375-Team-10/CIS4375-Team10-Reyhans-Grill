import { z } from 'zod'

import { getPool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { generateId } from '../utils/id.js'

const pool = getPool()

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

const usageSchema = z.object({
  itemId: z.string().min(1),
  userId: z.string().min(1),
  quantityUsed: z.coerce.number().int().positive(),
  dateUsed: dateString
})

export const listUsage = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.Usage_ID AS usageId,
            u.Item_ID AS itemId,
            i.Item_Name AS itemName,
            u.User_ID AS userId,
            usr.Username AS username,
            u.Quantity_Used AS quantityUsed,
            u.Date_Used AS dateUsed
       FROM \`usage\` u
       JOIN Item i ON i.Item_ID = u.Item_ID
       JOIN \`user\` usr ON usr.User_ID = u.User_ID
      ORDER BY u.Date_Used DESC`
  )
  res.json(rows)
})

export const createUsage = asyncHandler(async (req, res) => {
  const payload = usageSchema.parse(req.body)
  const usageId = generateId('USG_', 24)

  await pool.query(
    `INSERT INTO \`usage\` (Usage_ID, Item_ID, User_ID, Quantity_Used, Date_Used)
     VALUES (?, ?, ?, ?, ?)`,
    [usageId, payload.itemId, payload.userId, payload.quantityUsed, payload.dateUsed]
  )

  const [rows] = await pool.query(
    `SELECT u.Usage_ID AS usageId,
            u.Item_ID AS itemId,
            i.Item_Name AS itemName,
            u.User_ID AS userId,
            usr.Username AS username,
            u.Quantity_Used AS quantityUsed,
            u.Date_Used AS dateUsed
       FROM \`usage\` u
       JOIN Item i ON i.Item_ID = u.Item_ID
       JOIN \`user\` usr ON usr.User_ID = u.User_ID
      WHERE u.Usage_ID = ?`,
    [usageId]
  )

  res.status(201).json(rows[0])
})
