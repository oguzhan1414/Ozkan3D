import express from 'express'
import {
  getCategories, getCategory,
  createCategory, updateCategory, deleteCategory
} from '../controllers/categoryController.js'
import { protect } from '../middleware/authMiddleware.js'
import { admin } from '../middleware/adminMiddleware.js'

const router = express.Router()

router.get('/', getCategories)
router.get('/:slug', getCategory)
router.post('/', protect, admin, createCategory)
router.put('/:id', protect, admin, updateCategory)
router.delete('/:id', protect, admin, deleteCategory)

export default router