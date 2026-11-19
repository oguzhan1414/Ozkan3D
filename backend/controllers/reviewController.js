import { supabase } from '../config/supabase.js'
import { must, toApi, toApiList, isUuid } from '../utils/db.js'
import { hasPurchasedProduct } from '../services/orderService.js'

// Ürün puanı (rating / reviewCount) Postgres trigger'ı ile otomatik güncellenir.

const REVIEW_STATUSES = ['pending', 'approved', 'rejected']

// @desc    Ürün yorumlarını getir
// @route   GET /api/reviews/product/:productId
// @access  Public
export const getProductReviews = async (req, res) => {
  const rows = isUuid(req.params.productId)
    ? must(
        await supabase
          .from('reviews')
          .select('*, user:users(id, first_name, last_name)')
          .eq('product_id', req.params.productId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
      )
    : []

  res.status(200).json({ success: true, count: rows.length, data: toApiList(rows, ['user']) })
}

// @desc    Tüm yorumları getir
// @route   GET /api/reviews
// @access  Admin
export const getReviews = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query

  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(200, Math.max(1, Number(limit) || 20))
  const from = (pageNum - 1) * limitNum

  let query = supabase
    .from('reviews')
    .select(
      '*, user:users(id, first_name, last_name, email), product:products(id, name, images)',
      { count: 'exact' }
    )
  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, from + limitNum - 1)
  must({ data, error })

  const total = count || 0
  res.status(200).json({
    success: true,
    count: data.length,
    total,
    pages: Math.ceil(total / limitNum),
    data: toApiList(data, ['user', 'product']),
  })
}

// @desc    Sadece onaylı yorumları getir (Anasayfa için)
// @route   GET /api/reviews/public
// @access  Public
export const getPublicReviews = async (req, res) => {
  const limitNum = Math.min(20, Math.max(1, Number(req.query.limit) || 6))

  const rows = must(
    await supabase
      .from('reviews')
      .select('*, user:users(id, first_name, last_name), product:products(id, name, images, slug)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limitNum)
  )

  res.status(200).json({ success: true, count: rows.length, data: toApiList(rows, ['user', 'product']) })
}

// @desc    Yorum oluştur
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res) => {
  const { productId, comment } = req.body
  const rating = Math.round(Number(req.body.rating))

  const product = isUuid(productId)
    ? must(await supabase.from('products').select('id').eq('id', productId).maybeSingle())
    : null
  if (!product) {
    res.status(404)
    throw new Error('Ürün bulunamadı.')
  }

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    res.status(400)
    throw new Error('Puan zorunludur')
  }

  if (!comment || !String(comment).trim()) {
    res.status(400)
    throw new Error('Yorum zorunludur')
  }

  if (String(comment).length > 500) {
    res.status(400)
    throw new Error('Yorum 500 karakterden uzun olamaz')
  }

  // Daha önce yorum yapmış mı?
  const already = must(
    await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', req.user._id)
      .eq('product_id', productId)
      .maybeSingle()
  )

  if (already) {
    res.status(400)
    throw new Error('Bu ürün için zaten yorum yaptınız.')
  }

  // Satın almış ve siparişi onaylanmış/kargolanmış/teslim edilmiş mi?
  const purchase = await hasPurchasedProduct(req.user._id, productId)

  if (!purchase) {
    res.status(403)
    throw new Error('Bu ürünü değerlendirebilmek için satın almış olmanız gerekmektedir.')
  }

  const row = must(
    await supabase
      .from('reviews')
      .insert({
        user_id: req.user._id,
        product_id: productId,
        order_id: purchase.id,
        rating,
        comment: String(comment).trim(),
        is_verified: true,
      })
      .select('*')
      .single()
  )

  res.status(201).json({ success: true, data: toApi(row) })
}

// @desc    Yorum durumu güncelle
// @route   PUT /api/reviews/:id/status
// @access  Admin
export const updateReviewStatus = async (req, res) => {
  const { status } = req.body

  if (!REVIEW_STATUSES.includes(status)) {
    res.status(400)
    throw new Error('Geçersiz yorum durumu.')
  }

  const row = isUuid(req.params.id)
    ? must(await supabase.from('reviews').update({ status }).eq('id', req.params.id).select('*').maybeSingle())
    : null

  if (!row) {
    res.status(404)
    throw new Error('Yorum bulunamadı.')
  }

  res.status(200).json({ success: true, data: toApi(row) })
}

// @desc    Yorum sil
// @route   DELETE /api/reviews/:id
// @access  Admin
export const deleteReview = async (req, res) => {
  const deleted = isUuid(req.params.id)
    ? must(await supabase.from('reviews').delete().eq('id', req.params.id).select('id'))
    : []

  if (deleted.length === 0) {
    res.status(404)
    throw new Error('Yorum bulunamadı.')
  }

  res.status(200).json({ success: true, message: 'Yorum silindi.' })
}

// @desc    Kullanıcının kendi yorumları
// @route   GET /api/reviews/my
// @access  Private
export const getMyReviews = async (req, res) => {
  const rows = must(
    await supabase
      .from('reviews')
      .select('*, product:products(id, name, images, slug)')
      .eq('user_id', req.user._id)
      .order('created_at', { ascending: false })
  )

  res.status(200).json({ success: true, count: rows.length, data: toApiList(rows, ['product']) })
}
