import { z } from 'zod'

import { getPool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { generateId } from '../utils/id.js'

const pool = getPool()

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

const reportSchema = z.object({
  reportDate: dateString,
  totalSpent: z.coerce.number().nonnegative(),
  totalUsedItems: z.coerce.number().int().nonnegative(),
  userId: z.string().min(1)
})

export const listReports = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT r.Report_ID AS reportId,
            r.Report_Date AS reportDate,
            r.Total_Spent AS totalSpent,
            r.Total_Used_Items AS totalUsedItems,
            r.User_ID AS userId,
            u.Username
       FROM Report r
       JOIN \`user\` u ON u.User_ID = r.User_ID
      ORDER BY r.Report_Date DESC`
  )
  res.json(rows)
})

export const createReport = asyncHandler(async (req, res) => {
  const payload = reportSchema.parse(req.body)
  const reportId = generateId('RPT_', 24)

  await pool.query(
    `INSERT INTO Report (Report_ID, Report_Date, Total_Spent, Total_Used_Items, User_ID)
     VALUES (?, ?, ?, ?, ?)`,
    [reportId, payload.reportDate, payload.totalSpent, payload.totalUsedItems, payload.userId]
  )

  const [rows] = await pool.query(
    `SELECT r.Report_ID AS reportId,
            r.Report_Date AS reportDate,
            r.Total_Spent AS totalSpent,
            r.Total_Used_Items AS totalUsedItems,
            r.User_ID AS userId,
            u.Username
       FROM Report r
       JOIN \`user\` u ON u.User_ID = r.User_ID
      WHERE r.Report_ID = ?`,
    [reportId]
  )

  res.status(201).json(rows[0])
})
