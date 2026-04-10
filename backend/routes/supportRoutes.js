import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { supportUpload } from '../middleware/supportUploadMiddleware.js'
import { createSupportRequest, getMySupportRequests } from '../controllers/supportController.js'

const router = express.Router()

router.get('/mine', protect, getMySupportRequests)
router.post('/', protect, supportUpload.single('attachment'), createSupportRequest)

export default router
