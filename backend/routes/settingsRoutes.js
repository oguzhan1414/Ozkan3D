import express from 'express'
import {
  getSettings, updateSettings, uploadHeroImage
} from '../controllers/settingsController.js'
import { protect } from '../middleware/authMiddleware.js'
import { admin } from '../middleware/adminMiddleware.js'
import { heroUpload } from '../middleware/heroUploadMiddleware.js'

const router = express.Router()

router.get('/', getSettings)
router.put('/', protect, admin, updateSettings)
router.post('/hero-image', protect, admin, heroUpload.single('image'), uploadHeroImage)

export default router