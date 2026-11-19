import express from 'express'
import {
  getCategories, getCategory, getAllCategoriesAdmin, uploadCategoryImage, removeCategoryImage,
  createCategory, updateCategory, deleteCategory
} from '../controllers/categoryController.js'
import { protect } from '../middleware/authMiddleware.js'
import { admin } from '../middleware/adminMiddleware.js'
import { withPublicCache } from '../middleware/cacheControlMiddleware.js'
import { upload } from '../middleware/uploadMiddleware.js'

const router = express.Router()

router.get('/', withPublicCache(300, 600), getCategories)
router.get('/admin/all', protect, admin, getAllCategoriesAdmin)
router.get('/:slug', withPublicCache(300, 600), getCategory)
router.post('/', protect, admin, createCategory)
router.put('/:id', protect, admin, updateCategory)
router.delete('/:id', protect, admin, deleteCategory)
router.post('/:id/image', protect, admin, upload.single('image'), uploadCategoryImage)
router.delete('/:id/image', protect, admin, removeCategoryImage)

export default router