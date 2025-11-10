import { z } from 'zod'

import { getPool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { generateId } from '../utils/id.js'

const pool = getPool()

const categorySchema = z.object({
  categoryName: z.string().min(1, 'Category name is required').max(100)
})

export const listCategories = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT Category_ID AS categoryId,
            Category_Name AS categoryName
       FROM Category
      ORDER BY Category_Name ASC`
  )
  res.json(rows)
})

export const createCategory = asyncHandler(async (req, res) => {
  const payload = categorySchema.parse(req.body)
  const categoryId = generateId('CAT_', 12)

  await pool.query(
    `INSERT INTO Category (Category_ID, Category_Name)
     VALUES (?, ?)`,
    [categoryId, payload.categoryName]
  )

  res.status(201).json({ categoryId, categoryName: payload.categoryName })
})

export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(req.params)

  const [result] = await pool.query(`DELETE FROM Category WHERE Category_ID = ?`, [id])
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Category not found')
  }

  res.status(204).send()
})
