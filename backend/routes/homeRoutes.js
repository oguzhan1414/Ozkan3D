import express from 'express'
import { getHomeBootstrap } from '../controllers/homeController.js'
import { withPublicCache } from '../middleware/cacheControlMiddleware.js'

const router = express.Router()

router.get('/bootstrap', withPublicCache(45, 90), getHomeBootstrap)

export default router
