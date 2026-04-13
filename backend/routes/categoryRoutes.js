import express from 'express'
import {
  getCategories, getCategory,
  createCategory, updateCategory, deleteCategory
} from '../controllers/categoryController.js'
import { protect } from '../middleware/authMiddleware.js'
import { admin } from '../middleware/adminMiddleware.js'
import { withPublicCache } from '../middleware/cacheControlMiddleware.js'

const router = express.Router()

router.get('/', withPublicCache(300, 600), getCategories)
router.get('/:slug', withPublicCache(300, 600), getCategory)
router.post('/', protect, admin, createCategory)
router.put('/:id', protect, admin, updateCategory)
router.delete('/:id', protect, admin, deleteCategory)

export default router