// Authorizes sessions
import { getPool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { ensureSessionTable } from '../services/sessionService.js'

const pool = getPool()
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

const extractSessionToken = req => {
  const headerToken = req.headers['x-session-token']
  if (headerToken) {
    return headerToken
  }
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  return undefined
}

export const sessionAuth = asyncHandler(async (req, res, next) => {
  if (req.path === '/health') {
    return next()
  }
  await ensureSessionTable()

  const sessionToken = extractSessionToken(req)
  if (!sessionToken) {
    throw new HttpError(401, 'Authentication required')
  }

  const [sessions] = await pool.query(
    `SELECT Session_ID AS sessionId,
            User_ID AS userId,
            Last_Activity_At AS lastActivityAt
       FROM user_sessions
      WHERE Session_Token = ?`,
    [sessionToken]
  )

  if (!sessions.length) {
    throw new HttpError(401, 'Invalid session token')
  }

  const session = sessions[0]
  const lastActivity = new Date(session.lastActivityAt)
  const now = Date.now()

  if (now - lastActivity.getTime() > FIFTEEN_MINUTES_MS) {
    await pool.query(`DELETE FROM user_sessions WHERE Session_ID = ?`, [session.sessionId])
    throw new HttpError(401, 'Session expired due to inactivity')
  }

  await pool.query(`UPDATE user_sessions SET Last_Activity_At = NOW() WHERE Session_ID = ?`, [
    session.sessionId
  ])

  req.user = { userId: session.userId }
  req.sessionToken = sessionToken

  next()
})
