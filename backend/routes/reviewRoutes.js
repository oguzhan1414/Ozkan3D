import express from 'express'
import {
  getProductReviews, getReviews, getPublicReviews,
  createReview, updateReviewStatus, deleteReview
} from '../controllers/reviewController.js'
import { protect } from '../middleware/authMiddleware.js'
import { admin } from '../middleware/adminMiddleware.js'
import { getMyReviews } from '../controllers/reviewController.js'
import { withPublicCache } from '../middleware/cacheControlMiddleware.js'
const router = express.Router()

router.get('/product/:productId', withPublicCache(120, 240), getProductReviews)
router.get('/public', withPublicCache(120, 240), getPublicReviews)
router.get('/', protect, admin, getReviews)
router.post('/', protect, createReview)
router.put('/:id/status', protect, admin, updateReviewStatus)
router.delete('/:id', protect, admin, deleteReview)
router.get('/my', protect, getMyReviews)
export default router