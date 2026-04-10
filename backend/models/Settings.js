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
  localShippingCost: { type: Number, default: 89 },
  nearShippingCost: { type: Number, default: 109 },
  standardShippingCost: { type: Number, default: 139 },
  farShippingCost: { type: Number, default: 179 },
  expressShippingSurcharge: { type: Number, default: 35 },
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
  emailFrom: { type: String, default: 'Ozkan3D <ozkan3d.design@gmail.com>' },
  emailSender: { type: String, default: 'ozkan3d.design@gmail.com' },

  // Anasayfa slider
  heroSlides: {
    type: [{
      imageUrl: { type: String, default: '' },
      altText: { type: String, default: '' },
      isActive: { type: Boolean, default: true },
      sortOrder: { type: Number, default: 0 },
    }],
    default: [],
  },
}, { timestamps: true })

export default mongoose.model('Settings', settingsSchema)