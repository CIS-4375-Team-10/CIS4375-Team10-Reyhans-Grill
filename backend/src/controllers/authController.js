import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

import { getPool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { ensureSessionTable } from '../services/sessionService.js'

const pool = getPool()

const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(3).max(255)
})

const generateSessionToken = () => crypto.randomBytes(48).toString('hex')

export const login = asyncHandler(async (req, res) => {
  await ensureSessionTable()
  const credentials = loginSchema.parse(req.body)

  const [users] = await pool.query(
    `SELECT User_ID AS userId,
            Username AS username,
            Password AS passwordHash
       FROM \`user\`
      WHERE Username = ?
      LIMIT 1`,
    [credentials.username]
  )

  if (!users.length) {
    throw new HttpError(401, 'Invalid username or password')
  }

  const user = users[0]
  const matches = await bcrypt.compare(credentials.password, user.passwordHash)
  if (!matches) {
    throw new HttpError(401, 'Invalid username or password')
  }

  const sessionToken = generateSessionToken()

  await pool.query(
    `INSERT INTO user_sessions (Session_Token, User_ID, Created_At, Last_Activity_At)
     VALUES (?, ?, NOW(), NOW())`,
    [sessionToken, user.userId]
  )

  res.json({
    sessionToken,
    userId: user.userId,
    username: user.username
  })
})

export const logout = asyncHandler(async (req, res) => {
  await ensureSessionTable()
  const token =
    req.sessionToken ||
    req.headers['x-session-token'] ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined)

  if (token) {
    await pool.query(`DELETE FROM user_sessions WHERE Session_Token = ?`, [token])
  }

  res.status(204).send()
})
