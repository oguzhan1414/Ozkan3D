import { supabase } from '../config/supabase.js'
import { must, toApiList } from '../utils/db.js'
import { getSettingsRow } from '../services/settingsService.js'

const clamp = (value, min, max, fallback) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, Math.floor(numeric)))
}

const cardColumns = [
  'id', 'name', 'slug', 'category', 'subcategory', 'price', 'old_price', 'stock',
  'images', 'image_variants', 'material', 'colors', 'badge', 'rating', 'review_count',
  'featured', 'is_active', 'created_at', 'made_to_order', 'option_groups',
].join(', ')

// @desc    Home bootstrap verisi
// @route   GET /api/home/bootstrap
// @access  Public
export const getHomeBootstrap = async (req, res) => {
  const productsLimit = clamp(req.query.productsLimit, 1, 30, 20)
  const featuredLimit = clamp(req.query.featuredLimit, 1, 12, 8)
  const reviewsLimit = clamp(req.query.reviewsLimit, 1, 12, 6)

  const [featured, products, settings, reviews, stats] = await Promise.all([
    supabase
      .from('products')
      .select(cardColumns)
      .eq('featured', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(featuredLimit),
    supabase
      .from('products')
      .select(cardColumns)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(productsLimit),
    getSettingsRow('hero_slides'),
    supabase
      .from('reviews')
      .select('*, user:users(id, first_name, last_name), product:products(id, name, images, slug)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(reviewsLimit),
    supabase.rpc('review_stats'),
  ])

  res.status(200).json({
    success: true,
    data: {
      featuredProducts: toApiList(must(featured)),
      products: toApiList(must(products)),
      settings: {
        heroSlides: settings?.hero_slides || [],
      },
      reviews: toApiList(must(reviews), ['user', 'product']),
      reviewStats: (() => {
        const row = must(stats)?.[0]
        return { average: Number(row?.average) || 0, total: Number(row?.total) || 0 }
      })(),
    },
  })
}
