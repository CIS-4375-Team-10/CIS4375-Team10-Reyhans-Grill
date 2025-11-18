// Basically how the backend talks to the database 
import mysql from 'mysql2/promise'
import { env } from '../config/env.js'

// We keep one MySQL connection pool for the whole app.
// A pool lets many requests share a small set of database connections
// instead of opening/closing a new connection for every request.
let pool

export const getPool = () => {
  if (!pool) {
    // Two configuration styles supported:
    // - DATABASE_URL (single URL)
    // - Separate host/user/password/name values
    pool = env.databaseUrl
      ? mysql.createPool({
          uri: env.databaseUrl,
          waitForConnections: true,
          connectionLimit: env.db.poolSize,
          namedPlaceholders: true
        })
      : mysql.createPool({
          host: env.db.host,
          port: env.db.port,
          user: env.db.user,
          password: env.db.password,
          database: env.db.name,
          waitForConnections: true,
          connectionLimit: env.db.poolSize,
          namedPlaceholders: true,
          ssl: env.db.ssl ? { rejectUnauthorized: false } : undefined
        })
  }

  return pool
}

export const closePool = async () => {
  if (pool) {
    await pool.end()
    pool = undefined
  }
}
