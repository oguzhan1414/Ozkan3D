import mongoose from 'mongoose'

const settingsSchema = new mongoose.Schema({
  // Genel
  siteName: { type: String, default: 'Ozkan3D.design' },
  siteDesc: { type: String, default: 'Türkiye\'nin en yenilikçi 3D baskı mağazası' },
  currency: { type: String, default: 'TRY' },
  language: { type: String, default: 'tr' },
  timezone: { type: String, default: 'Europe/Istanbul' },
  logo: { type: String, default: '' },

  // Kargo
  freeShippingThreshold: { type: Number, default: 500 },
  standardShippingCost: { type: Number, default: 49 },
  expressShippingCost: { type: Number, default: 79 },
  carriers: { type: [String], default: ['Yurtiçi Kargo', 'MNG Kargo', 'Aras Kargo'] },

  // Bildirimler
  notifyNewOrder: { type: Boolean, default: true },
  notifyLowStock: { type: Boolean, default: true },
  notifyNewReview: { type: Boolean, default: true },
  notifyReturnRequest: { type: Boolean, default: true },
  notifyNewCustomer: { type: Boolean, default: false },
  emailNotif: { type: Boolean, default: true },
  browserNotif: { type: Boolean, default: true },
  lowStockThreshold: { type: Number, default: 10 },

  // Mail
  emailFrom: { type: String, default: 'Ozkan3D <noreply@ozkan3d.design>' },
  emailSender: { type: String, default: '' },
}, { timestamps: true })

export default mongoose.model('Settings', settingsSchema)