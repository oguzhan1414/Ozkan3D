import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { admin } from '../middleware/adminMiddleware.js'
import { supportUpload } from '../middleware/supportUploadMiddleware.js'
import {
  createSupportRequest, getMySupportRequests,
  getSupportRequestsAdmin, getSupportAttachment, updateSupportRequest,
} from '../controllers/supportController.js'

const router = express.Router()

router.get('/mine', protect, getMySupportRequests)
router.post('/', protect, supportUpload.single('attachment'), createSupportRequest)

// Admin
router.get('/admin', protect, admin, getSupportRequestsAdmin)
router.get('/admin/:id/attachment', protect, admin, getSupportAttachment)
router.put('/admin/:id', protect, admin, updateSupportRequest)

export default router
