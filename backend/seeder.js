import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from './models/User.js'

dotenv.config()

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('MongoDB bağlandı')

    // Var mı kontrol et
    const existing = await User.findOne({ email: 'admin@ozkan3d.design' })
    if (existing) {
      existing.role = 'admin'
      await existing.save()
      console.log('✅ Mevcut kullanıcı admin yapıldı!')
    } else {
      await User.create({
        firstName: 'Oğuz',
        lastName: 'Özkan',
        email: 'admin@ozkan3d.design',
        password: 'Admin1234',
        phone: '05321234567',
        role: 'admin',
      })
      console.log('✅ Admin hesabı oluşturuldu!')
      console.log('📧 Email: admin@ozkan3d.design')
      console.log('🔑 Şifre: Admin1234')
    }

    process.exit()
  } catch (error) {
    console.error('❌ Hata:', error)
    process.exit(1)
  }
}

createAdmin()