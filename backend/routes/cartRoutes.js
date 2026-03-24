import express from 'express'
import {
  getCart, addToCart, updateCartItem,
  removeCartItem, clearCart
} from '../controllers/cartController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, getCart)
router.post('/', protect, addToCart)
router.put('/:itemId', protect, updateCartItem)
router.delete('/:itemId', protect, removeCartItem)
router.delete('/', protect, clearCart)

export default router