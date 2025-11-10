import { app } from './app.js'
import { env } from './config/env.js'
import { getPool } from './db/pool.js'

// Bootstraps the API: verify DB is reachable, then start listening
const startServer = async () => {
  try {
    const pool = getPool()
    // Quick sanity check 
    await pool.query('SELECT 1')

    app.listen(env.port, () => {
      console.log(`API server running on http://localhost:${env.port}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error.message)
    process.exit(1)
  }
}

startServer()
