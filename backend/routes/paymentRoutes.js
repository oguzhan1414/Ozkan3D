import express from 'express'
import {
  createPayment, refundPayment, getPaymentDetail
} from '../controllers/paymentController.js'
import { protect } from '../middleware/authMiddleware.js'
import { admin } from '../middleware/adminMiddleware.js'

const router = express.Router()

router.post('/create', protect, createPayment)
router.post('/refund', protect, admin, refundPayment)
router.get('/:paymentId', protect, admin, getPaymentDetail)

export default router