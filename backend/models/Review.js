import mongoose from 'mongoose'
import Product from './Product.js'

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  rating: {
    type: Number,
    required: [true, 'Puan zorunludur'],
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: [true, 'Yorum zorunludur'],
    maxlength: [500, 'Yorum 500 karakterden uzun olamaz'],
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
}, { timestamps: true })

// Aynı kullanıcı aynı ürüne birden fazla yorum yapmasın
reviewSchema.index({ user: 1, product: 1 }, { unique: true })

// Yorum eklenince ürün ratingini güncelle
reviewSchema.statics.calcAverageRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId, status: 'approved' } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ])

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(stats[0].avgRating * 10) / 10,
      reviewCount: stats[0].count,
    })
  } else {
    await Product.findByIdAndUpdate(productId, { rating: 0, reviewCount: 0 })
  }
}

reviewSchema.post('save', function () {
  this.constructor.calcAverageRating(this.product)
})

reviewSchema.post('deleteOne', { document: true }, function () {
  this.constructor.calcAverageRating(this.product)
})

export default mongoose.model('Review', reviewSchema)