import Review from '../models/Review.js'
import Product from '../models/Product.js'
import Order from '../models/Order.js'

// @desc    Ürün yorumlarını getir
// @route   GET /api/reviews/product/:productId
// @access  Public
export const getProductReviews = async (req, res) => {
  const reviews = await Review.find({
    product: req.params.productId,
    status: 'approved',
  })
    .populate('user', 'firstName lastName')
    .sort({ createdAt: -1 })
    .lean()

  res.status(200).json({ success: true, count: reviews.length, data: reviews })
}

// @desc    Tüm yorumları getir
// @route   GET /api/reviews
// @access  Admin
export const getReviews = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query

  const query = {}
  if (status) query.status = status

  const pageNum = Number(page)
  const limitNum = Number(limit)
  const skip = (pageNum - 1) * limitNum

  const total = await Review.countDocuments(query)
  const reviews = await Review.find(query)
    .populate('user', 'firstName lastName email')
    .populate('product', 'name images')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)

  res.status(200).json({
    success: true,
    count: reviews.length,
    total,
    pages: Math.ceil(total / limitNum),
    data: reviews,
  })
}

// @desc    Sadece onaylı yorumları getir (Anasayfa için)
// @route   GET /api/reviews/public
// @access  Public
export const getPublicReviews = async (req, res) => {
  const { limit = 6 } = req.query
  const limitNum = Math.min(20, Math.max(1, Number(limit) || 6))

  const reviews = await Review.find({ status: 'approved' })
    .populate('user', 'firstName lastName')
    .populate('product', 'name images slug')
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .lean()

  res.status(200).json({
    success: true,
    count: reviews.length,
    data: reviews,
  })
}

// @desc    Yorum oluştur
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res) => {
  const { productId, rating, comment, orderId } = req.body

  // Ürün var mı?
  const product = await Product.findById(productId)
  if (!product) {
    res.status(404)
    throw new Error('Ürün bulunamadı.')
  }

  // Daha önce yorum yapmış mı?
  const alreadyReviewed = await Review.findOne({
    user: req.user._id,
    product: productId,
  })

  if (alreadyReviewed) {
    res.status(400)
    throw new Error('Bu ürün için zaten yorum yaptınız.')
  }

  // Satın almış ve siparişi onaylanmış/kargolanmış/teslim edilmiş mi?
  const hasPurchased = await Order.findOne({
    user: req.user._id,
    'items.product': productId,
    status: {
      $in: [
        'Onaylandı',
        'Basımda',
        'Hazırlanıyor',
        'Kargoya Verildi',
        'Kargoda',
        'Teslim Edildi',
      ],
    },
  })

  if (!hasPurchased) {
    res.status(403)
    throw new Error('Bu ürünü değerlendirebilmek için satın almış olmanız gerekmektedir.')
  }

  const review = await Review.create({
    user: req.user._id,
    product: productId,
    order: hasPurchased._id,
    rating,
    comment,
    isVerified: true,
  })

  res.status(201).json({ success: true, data: review })
}

// @desc    Yorum durumu güncelle
// @route   PUT /api/reviews/:id/status
// @access  Admin
export const updateReviewStatus = async (req, res) => {
  const { status } = req.body

  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  )

  if (!review) {
    res.status(404)
    throw new Error('Yorum bulunamadı.')
  }

  // Rating'i güncelle
  await Review.calcAverageRating(review.product)

  res.status(200).json({ success: true, data: review })
}

// @desc    Yorum sil
// @route   DELETE /api/reviews/:id
// @access  Admin
export const deleteReview = async (req, res) => {
  const review = await Review.findById(req.params.id)

  if (!review) {
    res.status(404)
    throw new Error('Yorum bulunamadı.')
  }

  await review.deleteOne()

  res.status(200).json({ success: true, message: 'Yorum silindi.' })
}

export const getMyReviews = async (req, res) => {
  const reviews = await Review.find({ user: req.user._id })
    .populate('product', 'name images')
    .sort({ createdAt: -1 })
    res.status(200).json({ success: true, count: reviews.length, data: reviews })
}