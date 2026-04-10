import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
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

const rawClientOrigins = process.env.CLIENT_URLS || process.env.CLIENT_URL || ''
const allowedOrigins = rawClientOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const normalizedAllowedOrigins = allowedOrigins.length > 0 ? allowedOrigins : ['http://localhost:5173']

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || normalizedAllowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    callback(new Error(`CORS engellendi: ${origin}`))
  },
  credentials: true,
}

// Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: normalizedAllowedOrigins,
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
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Ozkan3D API çalışıyor 🚀' })
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

