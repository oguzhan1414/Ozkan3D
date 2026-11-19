import express from 'express'
import { getReport, exportOrdersCsv } from '../controllers/reportController.js'
import { protect } from '../middleware/authMiddleware.js'
import { admin } from '../middleware/adminMiddleware.js'

const router = express.Router()

router.get('/', protect, admin, getReport)
router.get('/orders.csv', protect, admin, exportOrdersCsv)

export default router
