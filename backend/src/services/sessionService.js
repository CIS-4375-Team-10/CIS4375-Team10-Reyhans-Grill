import { getPool } from '../db/pool.js'

const pool = getPool()
let ensured = false

const createSql = `
CREATE TABLE IF NOT EXISTS user_sessions (
  Session_ID BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  User_ID VARCHAR(20) NOT NULL,
  Session_Token CHAR(96) NOT NULL,
  Created_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Last_Activity_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (User_ID) REFERENCES user (User_ID)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  UNIQUE KEY uq_session_token (Session_Token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`

export const ensureSessionTable = async () => {
  if (ensured) return
  await pool.query(createSql)
  ensured = true
}
