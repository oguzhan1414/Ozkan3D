import mongoose from 'mongoose'

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: String,
  image: String,
  price: Number,
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  material: String,
  color: String,
})

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  items: [cartItemSchema],
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
}, { timestamps: true })

cartSchema.virtual('totalPrice').get(function () {
  return this.items.reduce((total, item) => total + item.price * item.quantity, 0)
})

cartSchema.virtual('totalItems').get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0)
})

cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model('Cart', cartSchema)