import { getPool } from '../db/pool.js'

const pool = getPool()
const DEFAULT_SETTINGS = {
  lowStockThreshold: 10,
  expiringSoonDays: 7
}

const ensureSettingsRow = async () => {
  const [rows] = await pool.query('SELECT Setting_ID FROM Inventory_Settings LIMIT 1')
  if (!rows.length) {
    await pool.query(
      `INSERT INTO Inventory_Settings (Setting_ID, Low_Stock_Threshold, Expiring_Soon_Days)
       VALUES (1, ?, ?)` ,
      [DEFAULT_SETTINGS.lowStockThreshold, DEFAULT_SETTINGS.expiringSoonDays]
    )
  }
}

export const getInventorySettings = async () => {
  await ensureSettingsRow()
  const [rows] = await pool.query(
    `SELECT Low_Stock_Threshold AS lowStockThreshold,
            Expiring_Soon_Days AS expiringSoonDays
       FROM Inventory_Settings
      LIMIT 1`
  )
  if (!rows.length) {
    return { ...DEFAULT_SETTINGS }
  }
  return {
    lowStockThreshold: Number(rows[0].lowStockThreshold),
    expiringSoonDays: Number(rows[0].expiringSoonDays)
  }
}

export const updateInventorySettings = async ({ lowStockThreshold, expiringSoonDays }) => {
  await ensureSettingsRow()
  await pool.query(
    `UPDATE Inventory_Settings
        SET Low_Stock_Threshold = ?,
            Expiring_Soon_Days = ?,
            Updated_At = NOW()
      LIMIT 1` ,
    [lowStockThreshold, expiringSoonDays]
  )
  return getInventorySettings()
}
