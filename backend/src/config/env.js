import dotenv from 'dotenv'
import { z } from 'zod'

// Load variables from `.env` into process.env
// Example: DB_HOST=localhost becomes process.env.DB_HOST
dotenv.config()

// Zod gives error messages.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().optional(),
  DATABASE_URL: z.string().url().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().int().positive().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_POOL_SIZE: z.coerce.number().int().positive().default(10),
  DB_SSL: z
    .union([z.coerce.boolean(), z.string()])
    .optional()
    .transform(value => {
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') return value.toLowerCase() === 'true'
      return undefined
    })
})

// Validate the real environment variables against the schema
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // If something is missing/malformed, show the exact fields
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

const rawEnv = parsed.data

const hasDatabaseConfig =
  Boolean(rawEnv.DATABASE_URL) ||
  (rawEnv.DB_HOST && rawEnv.DB_USER && rawEnv.DB_NAME)

if (!hasDatabaseConfig) {
  throw new Error(
    'Database configuration missing. Provide DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD, DB_NAME.'
  )
}

// Normalize the final, typed config our app will use everywhere
export const env = {
  nodeEnv: rawEnv.NODE_ENV,
  isProduction: rawEnv.NODE_ENV === 'production',
  port: rawEnv.PORT,
  frontendOrigin: rawEnv.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  databaseUrl: rawEnv.DATABASE_URL,
  db: {
    host: rawEnv.DB_HOST,
    port: rawEnv.DB_PORT ?? 3306,
    user: rawEnv.DB_USER,
    password: rawEnv.DB_PASSWORD,
    name: rawEnv.DB_NAME,
    poolSize: rawEnv.DB_POOL_SIZE,
    ssl: rawEnv.DB_SSL ?? false
  }
}
