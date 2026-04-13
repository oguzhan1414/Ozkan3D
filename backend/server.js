import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import connectDB from './config/db.js'
import { errorHandler, notFound } from './middleware/errorMiddleware.js'
import { limiter } from './middleware/rateLimiter.js'

import authRoutes from './routes/authRoutes.js'
import productRoutes from './routes/productRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import userRoutes from './routes/userRoutes.js'
import couponRoutes from './routes/couponRoutes.js'
import reviewRoutes from './routes/reviewRoutes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import cartRoutes from './routes/cartRoutes.js'
import settingsRoutes from './routes/settingsRoutes.js'
import contactRoutes from './routes/contactRoutes.js'
import supportRoutes from './routes/supportRoutes.js'
import homeRoutes from './routes/homeRoutes.js'
dotenv.config()
connectDB()

// __dirname ES Module için
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// uploads klasörü yoksa oluştur
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}
const productsDir = path.join(__dirname, 'uploads/products')
if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true })
}
const supportDir = path.join(__dirname, 'uploads/support')
if (!fs.existsSync(supportDir)) {
  fs.mkdirSync(supportDir, { recursive: true })
}

const app = express()
const httpServer = createServer(app)

const normalizeOrigin = (origin = '') => origin.trim().replace(/\/+$/, '').toLowerCase()
const normalizeOriginWithoutWww = (origin = '') => normalizeOrigin(origin).replace('://www.', '://')
const parseUrlSafe = (value = '') => {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

const defaultFrontendOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://ozkan3-d.vercel.app',
  'https://www.ozkan3-d.vercel.app',
  'https://ozkan3d.com.tr',
  'https://www.ozkan3d.com.tr',
]

const rawClientOrigins = process.env.CLIENT_URLS || process.env.CLIENT_URL || ''
const configuredOrigins = rawClientOrigins
  .split(/[\n,;]+/)
  .map((origin) => origin.trim().replace(/^['"]+|['"]+$/g, ''))
  .filter(Boolean)

const normalizedAllowedOrigins = Array.from(
  new Set([...defaultFrontendOrigins, ...configuredOrigins].map(normalizeOrigin))
)

const allowAllOrigins = normalizedAllowedOrigins.includes('*')
console.log(`🌐 CORS izinli originler: ${normalizedAllowedOrigins.join(', ')}`)

const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === 'true'
const isVercelOrigin = (origin = '') => /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)

const isOriginAllowed = (origin) => {
  if (!origin) return true
  if (allowAllOrigins) return true

  const normalizedOrigin = normalizeOrigin(origin)
  const normalizedOriginNoWww = normalizeOriginWithoutWww(normalizedOrigin)
  const originUrl = parseUrlSafe(normalizedOrigin)

  if (normalizedAllowedOrigins.includes(normalizedOrigin)) return true

  if (
    normalizedAllowedOrigins.some(
      (allowedOrigin) => normalizeOriginWithoutWww(allowedOrigin) === normalizedOriginNoWww
    )
  ) {
    return true
  }

  if (allowVercelPreviews && isVercelOrigin(normalizedOrigin)) return true

  // Allow entries like "ozkan3-d.vercel.app" in CLIENT_URL(S) (without protocol).
  if (originUrl) {
    const originHost = originUrl.host.toLowerCase()
    for (const configuredOrigin of normalizedAllowedOrigins) {
      const noProto = configuredOrigin.replace(/^https?:\/\//, '')
      const hostOnly = noProto.replace(/^www\./, '')

      if (!configuredOrigin.startsWith('http://') && !configuredOrigin.startsWith('https://')) {
        if (originHost === hostOnly || originHost === `www.${hostOnly}`) {
          return true
        }

        if (hostOnly.startsWith('*.')) {
          const wildcardSuffix = hostOnly.slice(1) // keep leading dot
          if (originHost.endsWith(wildcardSuffix)) {
            return true
          }
        }
      }
    }
  }

  return false
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true)
      return
    }
    const corsError = new Error(`CORS engellendi: ${origin}`)
    corsError.statusCode = 403
    callback(corsError)
  },
  credentials: true,
}

// Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: corsOptions.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

export { io }

io.on('connection', (socket) => {
  console.log(`🔌 Socket bağlandı: ${socket.id}`)
  socket.on('joinAdmin', () => {
    socket.join('admin')
    console.log(`👑 Admin odasına katıldı: ${socket.id}`)
  })
  socket.on('joinUser', (userId) => {
    socket.join(`user_${userId}`)
    console.log(`👤 Kullanıcı odasına katıldı: ${userId}`)
  })
  socket.on('disconnect', () => {
    console.log(`🔌 Socket ayrıldı: ${socket.id}`)
  })
})

// Middleware
app.set('trust proxy', 1)

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: false,
}))
app.use(cors(corsOptions))
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

// ✅ Static uploads — API limiter'dan ÖNCE
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api', limiter)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/users', userRoutes)
app.use('/api/coupons', couponRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/payment', paymentRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/support', supportRoutes)
app.use('/api/home', homeRoutes)
app.get('/api/health', (req, res) => {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  }

  const dbStateCode = mongoose.connection.readyState
  const dbState = stateMap[dbStateCode] || 'unknown'

  res.json({
    status: dbStateCode === 1 ? 'OK' : 'DEGRADED',
    message: 'Ozkan3D API çalışıyor 🚀',
    dbState,
  })
})

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda çalışıyor — ${process.env.NODE_ENV}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})

