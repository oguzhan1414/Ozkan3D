import mongoose from 'mongoose'
import { setServers } from 'node:dns'

// DNS çözümleme sorunları için Google ve Cloudflare DNS sunucularını ayarla
try {
  setServers(['1.1.1.1', '8.8.8.8']);
} catch (error) {
  console.log("DNS sunucuları ayarlanamadı, sistem varsayılanları kullanılıyor.");
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI)
    console.log(`✅ MongoDB Bağlandı: ${conn.connection.host}`)
  } catch (error) {
    console.error(`❌ MongoDB Bağlantı Hatası: ${error.message}`)
    process.exit(1)
  }
}

export default connectDB