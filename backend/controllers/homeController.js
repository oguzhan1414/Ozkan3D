import Product from '../models/Product.js'
import Settings from '../models/Settings.js'
import Review from '../models/Review.js'

const clamp = (value, min, max, fallback) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, Math.floor(numeric)))
}

const cardProjection = [
  'name',
  'slug',
  'category',
  'subcategory',
  'price',
  'oldPrice',
  'stock',
  'images',
  'imageVariants',
  'material',
  'colors',
  'badge',
  'rating',
  'reviewCount',
  'featured',
  'isActive',
  'createdAt',
].join(' ')

// @desc    Home bootstrap verisi
// @route   GET /api/home/bootstrap
// @access  Public
export const getHomeBootstrap = async (req, res) => {
  const productsLimit = clamp(req.query.productsLimit, 1, 30, 20)
  const featuredLimit = clamp(req.query.featuredLimit, 1, 12, 8)
  const reviewsLimit = clamp(req.query.reviewsLimit, 1, 12, 6)

  const [featuredProducts, products, settingsDoc, reviews] = await Promise.all([
    Product.find({ featured: true, isActive: true })
      .select(cardProjection)
      .sort({ createdAt: -1 })
      .limit(featuredLimit)
      .lean(),
    Product.find({ isActive: true })
      .select(cardProjection)
      .sort({ createdAt: -1 })
      .limit(productsLimit)
      .lean(),
    Settings.findOne().select('heroSlides').lean(),
    Review.find({ status: 'approved' })
      .populate('user', 'firstName lastName')
      .populate('product', 'name images slug')
      .sort({ createdAt: -1 })
      .limit(reviewsLimit)
      .lean(),
  ])

  res.status(200).json({
    success: true,
    data: {
      featuredProducts,
      products,
      settings: {
        heroSlides: settingsDoc?.heroSlides || [],
      },
      reviews,
    },
  })
}
