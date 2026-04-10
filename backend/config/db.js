import mongoose from 'mongoose'

let listenersRegistered = false

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
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI tanımlı değil')
    }

    registerConnectionListeners()

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 20,
      minPoolSize: 2,
      family: 4,
    })

    console.log(`✅ MongoDB Bağlandı: ${conn.connection.host}/${conn.connection.name}`)
  } catch (error) {
    console.error(`❌ MongoDB Bağlantı Hatası: ${error.message}`)
    process.exit(1)
  }
}

export default connectDB