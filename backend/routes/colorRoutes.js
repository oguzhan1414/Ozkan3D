import express from 'express'
import { getColors, createColor, updateColor, deleteColor } from '../controllers/colorController.js'
import { protect } from '../middleware/authMiddleware.js'
import { admin } from '../middleware/adminMiddleware.js'
import { withPublicCache } from '../middleware/cacheControlMiddleware.js'

const router = express.Router()

router.get('/', withPublicCache(300, 600), getColors)
router.post('/', protect, admin, createColor)
router.put('/:id', protect, admin, updateColor)
router.delete('/:id', protect, admin, deleteColor)

export default router
