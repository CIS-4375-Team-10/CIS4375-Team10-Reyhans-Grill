import pool from '../config/db.js';
import {
  fetchInventoryCounts,
  listSquareLocations,
} from '../services/squareInventoryService.js';

export async function getInventory(req, res, next) {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        i.Item_ID,
        i.Item_Name,
        i.Category_ID,
        c.Category_Name,
        i.Quantity_In_Stock,
        i.Unit_Cost,
        i.Shelf_Life_Days,
        i.Expiration_Date,
        i.Status
      FROM Item i
      LEFT JOIN Category c ON c.Category_ID = i.Category_ID
      ORDER BY c.Category_Name, i.Item_Name;
    `,
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function syncInventoryFromSquare(req, res, next) {
  try {
    const { locationId } = req.body || {};
    const counts = await fetchInventoryCounts(locationId);

    if (!counts.length) {
      res.json({ updated: 0, message: 'No Square counts returned.' });
      return;
    }

    const connection = await pool.getConnection();
    let updated = 0;

    try {
      await connection.beginTransaction();

      for (const count of counts) {
        const catalogObjectId = count.catalogObjectId;
        const quantity = Number(count.quantity);

        if (!catalogObjectId || Number.isNaN(quantity)) continue;

        const [result] = await connection.execute(
          `
          UPDATE Item
          SET Quantity_In_Stock = ?
          WHERE Item_ID = ?
        `,
          [quantity, catalogObjectId],
        );

        updated += result.affectedRows;
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.json({
      updated,
      totalCounts: counts.length,
      note:
        'Item_ID must match Square catalog_object_id for the sync to update rows.',
    });
  } catch (error) {
    next(error);
  }
}

export async function getSquareLocations(req, res, next) {
  try {
    const locations = await listSquareLocations();
    res.json(locations);
  } catch (error) {
    next(error);
  }
}
