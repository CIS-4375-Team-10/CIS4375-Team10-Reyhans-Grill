import mysql from 'mysql2/promise';
import config from './env.js';
import logger from './logger.js';

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
  timezone: 'Z',
});

pool.on('connection', async (connection) => {
  try {
    await connection.query("SET time_zone = '+00:00'");
  } catch (error) {
    logger.warn(
      { err: error },
      'Failed to enforce UTC timezone on new MySQL connection',
    );
  }
});

pool.on('error', (err) => {
  logger.error({ err }, 'MySQL pool error');
});

export const query = (sql, params) => pool.execute(sql, params);

export const withTransaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getConnection = () => pool.getConnection();

export const closePool = async () => pool.end();

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

export default {
  query,
  withTransaction,
  getConnection,
  pool,
};
