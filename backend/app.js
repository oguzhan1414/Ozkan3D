// Ortam değişkenleri, diğer modüller import edilmeden ÖNCE yüklenmeli
import './config/env.js'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { supabase } from './config/supabase.js'
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
import cronRoutes from './routes/cronRoutes.js'
import colorRoutes from './routes/colorRoutes.js'
import reportRoutes from './routes/reportRoutes.js'

const app = express()

// ------------------------------------------------------------------ CORS
// Vercel'de frontend ve API aynı domainde olduğu için CORS'a normalde gerek yok;
// lokal geliştirme (Vite :5173) ve ek domainler için açık tutuluyor.
const normalizeOrigin = (origin = '') => origin.trim().replace(/\/+$/, '').toLowerCase()
const stripWww = (origin = '') => normalizeOrigin(origin).replace('://www.', '://')

const defaultFrontendOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://ozkan3d.com.tr',
  'https://www.ozkan3d.com.tr',
]

const configuredOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(/[\n,;]+/)
  .map((origin) => origin.trim().replace(/^['"]+|['"]+$/g, ''))
  .filter(Boolean)

const allowedOrigins = new Set(
  [...defaultFrontendOrigins, ...configuredOrigins].map(stripWww)
)

// Vercel'in kendi verdiği domain (production + preview) her zaman izinli
for (const host of [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_BRANCH_URL]) {
  if (host) allowedOrigins.add(stripWww(`https://${host}`))
}

const isDevLocalhost = (origin) =>
  process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin)

const isOriginAllowed = (origin) => {
  if (!origin) return true
  if (allowedOrigins.has('*')) return true
  if (isDevLocalhost(origin)) return true
  return allowedOrigins.has(stripWww(origin))
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

// ------------------------------------------------------------ Middleware
app.set('trust proxy', 1)

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: false,
}))
app.use(cors(corsOptions))
app.use(compression())
app.use(express.json({ limit: '4mb' }))
app.use(express.urlencoded({ extended: true, limit: '4mb' }))
app.use(cookieParser())

app.use('/api', limiter)

// ---------------------------------------------------------------- Routes
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
app.use('/api/cron', cronRoutes)
app.use('/api/colors', colorRoutes)
app.use('/api/reports', reportRoutes)

app.get('/api/health', async (req, res) => {
  const { error } = await supabase.from('settings').select('id', { head: true, count: 'exact' })

  res.status(error ? 503 : 200).json({
    status: error ? 'DEGRADED' : 'OK',
    message: 'Ozkan3D API çalışıyor 🚀',
    dbState: error ? 'disconnected' : 'connected',
  })
})

app.use('/api', notFound)
app.use(errorHandler)

export default app
