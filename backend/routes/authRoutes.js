import express from 'express'
import {
  register, login, logout, getMe,
  updateProfile, changePassword,
  forgotPassword, resetPassword,
  addAddress, deleteAddress
} from '../controllers/authController.js'
import { protect } from '../middleware/authMiddleware.js'
import { authLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()

router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.post('/logout', protect, logout)
router.get('/me', protect, getMe)
router.put('/profile', protect, updateProfile)
router.put('/change-password', protect, changePassword)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password/:token', resetPassword)
router.post('/address', protect, addAddress)
router.delete('/address/:addressId', protect, deleteAddress)

export default router