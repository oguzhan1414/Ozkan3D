// Lokal geliştirme sunucusu. Vercel'de bu dosya kullanılmaz; api/index.js app.js'i export eder.
import app from './app.js'

const PORT = process.env.PORT || 5000

const server = app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda çalışıyor — ${process.env.NODE_ENV || 'development'}`)
})

const shutdown = () => server.close(() => process.exit(0))
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
