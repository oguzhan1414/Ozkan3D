import express from 'express'
import {
  getProducts, getProduct, createProduct,
  updateProduct, deleteProduct, uploadProductImage,
  deleteProductImage, getFeaturedProducts, updateStock
} from '../controllers/productController.js'
import { protect } from '../middleware/authMiddleware.js'
import { admin } from '../middleware/adminMiddleware.js'
import { upload } from '../middleware/uploadMiddleware.js'
import { withPublicCache } from '../middleware/cacheControlMiddleware.js'

const router = express.Router()

router.get('/', withPublicCache(45, 90), getProducts)
router.get('/featured', withPublicCache(120, 180), getFeaturedProducts)
router.get('/:slug', withPublicCache(180, 300), getProduct)
router.post('/', protect, admin, createProduct)
router.put('/:id', protect, admin, updateProduct)
router.delete('/:id', protect, admin, deleteProduct)
router.post('/:id/image', protect, admin, upload.single('image'), uploadProductImage)
router.delete('/:id/image', protect, admin, deleteProductImage)
router.put('/:id/stock', protect, admin, updateStock)

export default router