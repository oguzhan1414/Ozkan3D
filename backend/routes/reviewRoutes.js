import express from 'express'
import {
  getProductReviews, getReviews,
  createReview, updateReviewStatus, deleteReview
} from '../controllers/reviewController.js'
import { protect } from '../middleware/authMiddleware.js'
import { admin } from '../middleware/adminMiddleware.js'
import { getMyReviews } from '../controllers/reviewController.js'
const router = express.Router()

router.get('/product/:productId', getProductReviews)
router.get('/', protect, admin, getReviews)
router.post('/', protect, createReview)
router.put('/:id/status', protect, admin, updateReviewStatus)
router.delete('/:id', protect, admin, deleteReview)
router.get('/my', protect, getMyReviews)
export default router