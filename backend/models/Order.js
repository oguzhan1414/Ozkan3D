import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: { type: String, required: true },
  image: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  material: { type: String },
  color: { type: String },
})

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderNo: {
    type: String,
    unique: true,
  },
  items: [orderItemSchema],
  shippingAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, required: true },
    address: { type: String, required: true },
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'transfer'],
    required: true,
  },
  // Siparişin aşama geçmişi (Örn: Müşteri siparişi ne zaman verdi, biz ne zaman basıma aldık)
  statusHistory: [{
    status: { type: String },
    date: { type: Date, default: Date.now },
    note: { type: String } // Opsiyonel: "Baskı başarısız oldu, baştan başlandı" gibi
  }],
  paymentResult: {
    id: String,
    status: String,
    paidAt: Date,
  },
  shippingCost: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  totalPrice: { type: Number, required: true },
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
  },
  couponCode: { type: String },
  status: {
    type: String,
    enum: ['Bekliyor', 'Basımda', 'Hazırlanıyor', 'Kargoda', 'Teslim Edildi', 'İptal'],
    default: 'Bekliyor',
  },
  totalCost: { type: Number, default: 0 },
  trackingNo: { type: String },
  carrier: { type: String },
  customerNote: { type: String },
  adminNote: { type: String },
  isPaid: { type: Boolean, default: false },
  paidAt: { type: Date },
  isDelivered: { type: Boolean, default: false },
  deliveredAt: { type: Date },
}, { timestamps: true })

export default mongoose.model('Order', orderSchema)