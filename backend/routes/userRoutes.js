import express from 'express'
import {
  getUsers, getUser, updateUser,
  deleteUser, getUserOrders, getDashboardStats,
  getFavorites, toggleFavorite
} from '../controllers/userController.js'
import { protect } from '../middleware/authMiddleware.js'
import { admin } from '../middleware/adminMiddleware.js'

const router = express.Router()

router.get('/stats', protect, admin, getDashboardStats)
router.get('/favorites', protect, getFavorites)
router.post('/favorites/:productId', protect, toggleFavorite)
router.get('/', protect, admin, getUsers)
router.get('/:id', protect, admin, getUser)
router.put('/:id', protect, admin, updateUser)
router.delete('/:id', protect, admin, deleteUser)
router.get('/:id/orders', protect, admin, getUserOrders)

export default router