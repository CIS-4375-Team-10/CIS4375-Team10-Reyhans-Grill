import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import { env } from './config/env.js'
import apiRouter from './routes/index.js'
import authRoutes from './routes/authRoutes.js'
import { sessionAuth } from './middleware/sessionAuth.js'
import { HttpError } from './utils/httpError.js'

// Create a single Express app instance used by the server
export const app = express()

// Allow the local dev frontend by default, plus anything provided via FRONTEND_ORIGIN
const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173']
const configuredOrigins = env.frontendOrigin
  ? env.frontendOrigin.split(',').map(origin => origin.trim())
  : []
const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins])

// CORS controls which browser origins can call this API
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin / curl (no origin) and any whitelisted origin
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`))
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token'],
    maxAge: 86400
  })
)

// Common security 
app.use(helmet())
app.use(morgan(env.isProduction ? 'combined' : 'dev'))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false }))

// Public auth routes
app.use('/api/auth', authRoutes)

// All other routes require an active session with 15m idle timeout enforcement
app.use('/api', sessionAuth, apiRouter)

// 404 handler for unmatched routes
app.use((req, res, next) => {
  next(new HttpError(404, `Route ${req.originalUrl} not found`))
})

// Central error handler so all errors return consistent JSON
app.use((err, req, res, next) => {
  const statusCode = err.statusCode ?? 500
  if (!env.isProduction) {
    console.error(err)
  }

  res.status(statusCode).json({
    message: err.message ?? 'Internal Server Error',
    details: err.details ?? undefined
  })
})
