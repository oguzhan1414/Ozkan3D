import express from 'express'
import {
  getProducts, getProduct, createProduct,
  updateProduct, deleteProduct, uploadProductImage,
  deleteProductImage, getFeaturedProducts, updateStock
} from '../controllers/productController.js'
import { protect } from '../middleware/authMiddleware.js'
import { admin } from '../middleware/adminMiddleware.js'
import { upload } from '../middleware/uploadMiddleware.js'

const router = express.Router()

router.get('/', getProducts)
router.get('/featured', getFeaturedProducts)
router.get('/:slug', getProduct)
router.post('/', protect, admin, createProduct)
router.put('/:id', protect, admin, updateProduct)
router.delete('/:id', protect, admin, deleteProduct)
router.post('/:id/image', protect, admin, upload.single('image'), uploadProductImage)
router.delete('/:id/image', protect, admin, deleteProductImage)
router.put('/:id/stock', protect, admin, updateStock)

export default router