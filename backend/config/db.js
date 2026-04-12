import mongoose from 'mongoose'
import dns from 'node:dns'

let listenersRegistered = false
let reconnectTimer = null

const shouldUsePublicDns =
  process.env.NODE_ENV !== 'production' && process.env.MONGO_PUBLIC_DNS !== 'false'

const shouldTryDirectUriFallback = (errorMessage) => {
  if (!errorMessage) return false
  return /querySrv|ENOTFOUND|EAI_AGAIN|ECONNREFUSED/i.test(errorMessage)
}

const configureDevDns = () => {
  if (!shouldUsePublicDns) return

  try {
    dns.setServers(['8.8.8.8', '1.1.1.1'])
    console.log('🌐 Development DNS aktif: 8.8.8.8, 1.1.1.1')
  } catch (error) {
    console.warn(`⚠️ DNS sunucuları ayarlanamadı: ${error.message}`)
  }
}

const isStrictMongoMode = () =>
  process.env.MONGO_REQUIRED === 'true' || process.env.NODE_ENV === 'production'

const scheduleReconnect = () => {
  if (isStrictMongoMode() || reconnectTimer) return

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    console.log('🔁 MongoDB için yeniden bağlantı denemesi başlatılıyor...')
    connectDB()
  }, 10000)
}

const registerConnectionListeners = () => {
  if (listenersRegistered) return
  listenersRegistered = true

  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB bağlantısı aktif')
  })

  mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB bağlantısı yeniden kuruldu')
  })

  mongoose.connection.on('disconnected', () => {
    console.error('⚠️ MongoDB bağlantısı kesildi')
  })

  mongoose.connection.on('error', (err) => {
    console.error(`❌ MongoDB bağlantı hatası: ${err.message}`)
  })
}

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) return

    if (!process.env.MONGO_URI?.trim()) {
      throw new Error('MONGO_URI tanımlı değil')
    }

    registerConnectionListeners()

    configureDevDns()

    const mongoConnectOptions = {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 20,
      minPoolSize: 2,
      family: 4,
    }

    const primaryUri = process.env.MONGO_URI.trim()
    const directUriFallback = process.env.MONGO_URI_DIRECT?.trim()

    let conn

    try {
      conn = await mongoose.connect(primaryUri, mongoConnectOptions)
    } catch (error) {
      const canFallback =
        directUriFallback && shouldTryDirectUriFallback(error.message)

      if (!canFallback) {
        throw error
      }

      console.warn(
        '⚠️ SRV DNS çözümleme hatası algılandı, MONGO_URI_DIRECT ile tekrar deneniyor...'
      )
      conn = await mongoose.connect(directUriFallback, mongoConnectOptions)
    }

    console.log(`✅ MongoDB Bağlandı: ${conn.connection.host}/${conn.connection.name}`)
  } catch (error) {
    if (shouldTryDirectUriFallback(error.message) && !process.env.MONGO_URI_DIRECT) {
      console.error(
        '💡 İpucu: Local DNS SRV sorgusu engelleniyor olabilir. .env dosyasına MONGO_URI_DIRECT ekleyip tekrar deneyin.'
      )
    }

    console.error(`❌ MongoDB Bağlantı Hatası: ${error.message}`)

    if (isStrictMongoMode()) {
      process.exit(1)
    }

    console.warn('⚠️ Development modunda MongoDB olmadan devam ediliyor. API kısmi çalışabilir.')
    scheduleReconnect()
  }
}

export default connectDB