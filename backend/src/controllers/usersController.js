import { z } from 'zod'
import bcrypt from 'bcryptjs'

import { getPool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { generateId } from '../utils/id.js'

const pool = getPool()

const userSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(255)
})

export const listUsers = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT User_ID AS userId,
            Username AS username
       FROM \`user\`
      ORDER BY Username ASC`
  )
  res.json(rows)
})

export const createUser = asyncHandler(async (req, res) => {
  const payload = userSchema.parse(req.body)
  const userId = generateId('USR_', 12)
  const hashed = await bcrypt.hash(payload.password, 12)

  await pool.query(
    `INSERT INTO user (User_ID, Username, Password)
     VALUES (?, ?, ?)`,
    [userId, payload.username, hashed]
  )

  res.status(201).json({ userId, username: payload.username })
})
