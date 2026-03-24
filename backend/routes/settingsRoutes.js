import express from 'express'
import {
  getSettings, updateSettings
} from '../controllers/settingsController.js'
import { protect } from '../middleware/authMiddleware.js'
import { admin } from '../middleware/adminMiddleware.js'

const router = express.Router()

router.get('/', getSettings)
router.put('/', protect, admin, updateSettings)

export default router