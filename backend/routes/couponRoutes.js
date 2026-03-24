import express from 'express'
import {
  getCoupons, createCoupon,
  updateCoupon, deleteCoupon, validateCoupon
} from '../controllers/couponController.js'
import { protect } from '../middleware/authMiddleware.js'
import { admin } from '../middleware/adminMiddleware.js'

const router = express.Router()

// validate — giriş yapmadan da kullanılabilir
router.post('/validate', validateCoupon)

router.get('/', protect, admin, getCoupons)
router.post('/', protect, admin, createCoupon)
router.put('/:id', protect, admin, updateCoupon)
router.delete('/:id', protect, admin, deleteCoupon)

export default router