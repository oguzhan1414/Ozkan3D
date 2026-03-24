import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Kupon kodu zorunludur'],
    unique: true,
    uppercase: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['percent', 'fixed', 'shipping'],
    required: true,
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  minOrder: {
    type: Number,
    default: 0,
  },
  maxUse: {
    type: Number,
    default: 0, // 0 = sınırsız
  },
  used: {
    type: Number,
    default: 0,
  },
  startDate: { type: Date },
  endDate: { type: Date },
  status: {
    type: String,
    enum: ['Aktif', 'Pasif'],
    default: 'Aktif',
  },
  description: { type: String },
}, { timestamps: true })

// Kupon geçerli mi?
couponSchema.methods.isValid = function (orderTotal) {
  const now = new Date()

  if (this.status !== 'Aktif') return { valid: false, message: 'Kupon aktif değil.' }
  if (this.startDate && now < this.startDate) return { valid: false, message: 'Kupon henüz aktif değil.' }
  if (this.endDate && now > this.endDate) return { valid: false, message: 'Kuponun süresi dolmuş.' }
  if (this.maxUse > 0 && this.used >= this.maxUse) return { valid: false, message: 'Kupon kullanım limiti dolmuş.' }
  if (orderTotal < this.minOrder) return { valid: false, message: `Bu kupon için minimum sipariş tutarı ${this.minOrder}₺` }

  return { valid: true }
}

// İndirim hesapla
couponSchema.methods.calcDiscount = function (orderTotal) {
  if (this.type === 'percent') return (orderTotal * this.value) / 100
  if (this.type === 'fixed') return Math.min(this.value, orderTotal)
  if (this.type === 'shipping') return 0 // kargo ücretsiz
  return 0
}

export default mongoose.model('Coupon', couponSchema)