import { z } from 'zod'

import { getPool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'

const pool = getPool()

const toMySqlDateTime = date => date.toISOString().slice(0, 19).replace('T', ' ')

const createUsageSchema = z.object({
  materialId: z.string().min(1),
  quantityUsed: z.coerce.number().positive(),
  usageDate: z
    .string()
    .optional()
    .transform(value => (value && value.trim() !== '' ? value : undefined)),
  reason: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform(value => (value === undefined || value === '' ? null : value))
})

const querySchema = z.object({
  fromDate: z
    .string()
    .optional()
    .transform(value => (value && value.trim() !== '' ? value : undefined)),
  toDate: z
    .string()
    .optional()
    .transform(value => (value && value.trim() !== '' ? value : undefined))
})

export const createMaterialUsage = asyncHandler(async (req, res) => {
  const payload = createUsageSchema.parse(req.body)

  const usageDateObj = payload.usageDate ? new Date(payload.usageDate) : new Date()
  if (Number.isNaN(usageDateObj.getTime())) {
    throw new HttpError(400, 'Invalid usage date')
  }
  const usageDate = toMySqlDateTime(usageDateObj)

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const [materials] = await connection.query(
      `SELECT Item_ID AS itemId,
              Item_Name AS itemName,
              Quantity_in_Stock AS quantityInStock,
              Unit
         FROM Item
        WHERE Item_ID = ?
          AND Is_Deleted = 0
        FOR UPDATE`,
      [payload.materialId]
    )

    if (!materials.length) {
      throw new HttpError(404, 'Material not found')
    }

    const currentQuantity = Number(materials[0].quantityInStock ?? 0)
    const quantityUsed = Number(payload.quantityUsed)

    if (quantityUsed > currentQuantity) {
      throw new HttpError(400, 'Usage exceeds available quantity')
    }

    const nextQuantity = Number((currentQuantity - quantityUsed).toFixed(2))

    const [insertResult] = await connection.query(
      `INSERT INTO Material_Usage (Item_ID, Usage_Date, Quantity_Used, Reason)
       VALUES (?, ?, ?, ?)`,
      [payload.materialId, usageDate, quantityUsed, payload.reason]
    )

    await connection.query(
      `UPDATE Item
          SET Quantity_in_Stock = ?, Updated_At = NOW()
        WHERE Item_ID = ?`,
      [nextQuantity, payload.materialId]
    )

    await connection.commit()

    const [rows] = await pool.query(
      `SELECT mu.Usage_ID AS usageId,
              mu.Usage_Date AS usageDate,
              mu.Quantity_Used AS quantityUsed,
              mu.Reason AS reason,
              i.Item_ID AS materialId,
              i.Item_Name AS materialName,
              i.Unit AS unit
         FROM Material_Usage mu
         JOIN Item i ON i.Item_ID = mu.Item_ID
        WHERE mu.Usage_ID = ?`,
      [insertResult.insertId]
    )

    res.status(201).json(rows[0])
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
})

export const listMaterialUsage = asyncHandler(async (req, res) => {
  const filters = querySchema.parse(req.query)
  const clauses = []
  const params = []

  if (filters.fromDate) {
    clauses.push('mu.Usage_Date >= ?')
    params.push(filters.fromDate)
  }
  if (filters.toDate) {
    clauses.push('mu.Usage_Date <= ?')
    params.push(filters.toDate)
  }

  const whereClause = clauses.length
    ? `WHERE ${clauses.join(' AND ')}`
    : 'WHERE mu.Usage_Date >= DATE_SUB(NOW(), INTERVAL 30 DAY)'

  const [rows] = await pool.query(
    `SELECT mu.Usage_ID AS usageId,
            mu.Usage_Date AS usageDate,
            mu.Quantity_Used AS quantityUsed,
            mu.Reason AS reason,
            i.Item_ID AS materialId,
            i.Item_Name AS materialName,
            i.Unit AS unit
       FROM Material_Usage mu
       JOIN Item i ON i.Item_ID = mu.Item_ID
      ${whereClause}
      ORDER BY mu.Usage_Date DESC
      LIMIT 200`,
    params
  )

  res.json(rows)
})
