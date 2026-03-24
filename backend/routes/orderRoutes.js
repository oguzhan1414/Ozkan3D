import express from 'express'
import {
  createOrder, getMyOrders, getOrder,
  getOrders, updateOrderStatus, updateTracking,
  getInvoicePDF, updateOrderToPaid, checkPurchase, cancelOrder
} from '../controllers/orderController.js'
import { protect } from '../middleware/authMiddleware.js'
import { admin } from '../middleware/adminMiddleware.js'

const router = express.Router()

router.post('/', protect, createOrder)
router.get('/mine', protect, getMyOrders)
router.get('/check-purchase/:productId', protect, checkPurchase)
router.get('/', protect, admin, getOrders)
router.get('/:id', protect, getOrder)
router.put('/:id/status', protect, admin, updateOrderStatus)
router.put('/:id/track', protect, admin, updateTracking)
router.put('/:id/cancel', protect, cancelOrder)
router.get('/:id/pdf', protect, admin, getInvoicePDF)
router.put('/:id/pay', protect, updateOrderToPaid)

export default router