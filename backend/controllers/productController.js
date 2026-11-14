import { supabase } from '../config/supabase.js'
import { must, toApi, toApiList, toDb, isUuid, sanitizeSearch } from '../utils/db.js'
import { createSlug } from '../utils/createSlug.js'
import { uploadImage, deleteImage, getPublicId } from '../utils/imageUpload.js'
import { sendPriceDropEmail } from '../utils/sendEmail.js'
import { userToApi } from '../services/userService.js'

const normalizeDescriptionText = (value) => {
  if (typeof value !== 'string') return value

  const sanitized = value
    // Remove emoji/icon-like symbols that break visual consistency in cards.
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[•●◦▪▫►▶]/g, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return sanitized
}

const normalizeDescriptionPayload = (payload = {}) => {
  const normalized = { ...payload }

  if (typeof payload.description === 'string') {
    normalized.description = normalizeDescriptionText(payload.description)
  }

  if (typeof payload.shortDesc === 'string') {
    normalized.shortDesc = normalizeDescriptionText(payload.shortDesc)
  }

  return normalized
}

const normalizeHexColor = (value) => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(trimmed)) return trimmed
  if (/^#[0-9a-f]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
  }

  return null
}

const uniqueColors = (colors = []) => {
  const seen = new Set()
  const normalized = []

  for (const color of colors) {
    const safeColor = normalizeHexColor(color)
    if (!safeColor || seen.has(safeColor)) continue
    seen.add(safeColor)
    normalized.push(safeColor)
  }

  return normalized
}

const normalizeImageUrls = (images = []) => {
  if (!Array.isArray(images)) return []

  const seen = new Set()
  const urls = []

  for (const item of images) {
    if (typeof item !== 'string') continue
    const url = item.trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    urls.push(url)
  }

  return urls
}

const buildImageVariants = ({ imageVariants, images, colors }) => {
  const normalizedColors = uniqueColors(colors)
  const fallbackColor = normalizedColors[0] || null

  if (Array.isArray(imageVariants) && imageVariants.length > 0) {
    const seen = new Set()
    const normalized = []

    for (const item of imageVariants) {
      const rawUrl = typeof item?.url === 'string' ? item.url.trim() : ''
      if (!rawUrl || seen.has(rawUrl)) continue

      seen.add(rawUrl)
      normalized.push({
        url: rawUrl,
        color: normalizeHexColor(item?.color) || fallbackColor,
      })
    }

    return normalized
  }

  const normalizedImages = normalizeImageUrls(images)
  return normalizedImages.map((url, index) => ({
    url,
    color: normalizeHexColor(normalizedColors[index]) || fallbackColor,
  }))
}

const applyMediaPayload = (payload, baseProduct = null) => {
  const hasOwn = (field) => Object.prototype.hasOwnProperty.call(payload, field)
  const hasColorPayload = hasOwn('colors')
  const hasImagePayload = hasOwn('images') || hasOwn('imageVariants')

  if (!hasColorPayload && !hasImagePayload) {
    return payload
  }

  const nextPayload = { ...payload }

  const baseColors = hasColorPayload ? nextPayload.colors : baseProduct?.colors
  const normalizedColors = uniqueColors(baseColors)
  nextPayload.colors = normalizedColors

  if (hasImagePayload) {
    const imageVariants = buildImageVariants({
      imageVariants: nextPayload.imageVariants,
      images: nextPayload.images,
      colors: normalizedColors.length ? normalizedColors : baseProduct?.colors,
    })

    nextPayload.imageVariants = imageVariants
    nextPayload.images = imageVariants.map((item) => item.url)

    const colorsFromVariants = uniqueColors(imageVariants.map((item) => item.color))
    if (!normalizedColors.length && colorsFromVariants.length) {
      nextPayload.colors = colorsFromVariants
    }
  }

  return nextPayload
}

const PRODUCT_FIELDS = [
  'name', 'description', 'shortDesc', 'category', 'subcategory',
  'price', 'oldPrice', 'stock', 'sku', 'images', 'imageVariants',
  'material', 'colors', 'badge', 'featured', 'isActive',
  'weight', 'dimensions', 'printTime', 'difficulty',
  'metaTitle', 'metaDesc', 'tags',
]

const nullIfEmpty = (v) => (v === '' || v === undefined ? null : v)
const numOrNull = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const toTextArray = (v) => {
  if (Array.isArray(v)) return v.filter((x) => x != null && x !== '').map(String)
  if (typeof v === 'string') return v.split(',').map((x) => x.trim()).filter(Boolean)
  return []
}

/** API gövdesi -> products satırı (sadece izinli alanlar, tip temizliği) */
const buildProductFields = (payload) => {
  const f = toDb(payload, PRODUCT_FIELDS)

  if ('name' in f) f.name = String(f.name).trim()
  if ('price' in f) f.price = Number(f.price) || 0
  if ('stock' in f) f.stock = Math.max(0, Math.trunc(Number(f.stock) || 0))
  for (const key of ['old_price', 'weight', 'print_time']) if (key in f) f[key] = numOrNull(f[key])
  for (const key of ['sku', 'badge', 'subcategory', 'meta_title', 'meta_desc']) if (key in f) f[key] = nullIfEmpty(f[key])
  for (const key of ['images', 'material', 'colors', 'tags']) if (key in f) f[key] = toTextArray(f[key])
  if ('featured' in f) f.featured = Boolean(f.featured)
  if ('is_active' in f) f.is_active = Boolean(f.is_active)
  if ('difficulty' in f && !['Kolay', 'Orta', 'Zor'].includes(f.difficulty)) f.difficulty = 'Orta'

  return f
}

const findProductRow = async (id, columns = '*') => {
  if (!isUuid(id)) return null
  return must(await supabase.from('products').select(columns).eq('id', id).maybeSingle())
}

const requireProductRow = async (id, res, columns = '*') => {
  const row = await findProductRow(id, columns)
  if (!row) {
    res.status(404)
    throw new Error('Ürün bulunamadı.')
  }
  return row
}

export const productCardColumns = [
  'id', 'name', 'slug', 'description', 'short_desc', 'meta_title', 'meta_desc', 'tags',
  'category', 'subcategory', 'price', 'old_price', 'stock', 'images', 'image_variants',
  'material', 'colors', 'badge', 'rating', 'review_count', 'featured', 'is_active', 'created_at',
].join(', ')

const csv = (value) => String(value).split(',').map((item) => item.trim()).filter(Boolean)

const SORT_OPTIONS = {
  'price-asc': ['price', true],
  'price-desc': ['price', false],
  rating: ['rating', false],
  popular: ['review_count', false],
  'name-asc': ['name', true],
  'name-desc': ['name', false],
}

// @desc    Tüm ürünleri getir
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
  const {
    keyword, category, subcategory, material,
    minPrice, maxPrice, badge, featured,
    sort, page = 1, limit = 12,
  } = req.query

  let query = supabase
    .from('products')
    .select(productCardColumns, { count: 'exact' })
    .eq('is_active', true)

  const search = keyword ? sanitizeSearch(keyword) : ''
  if (search) {
    query = query.or(
      `name.ilike."*${search}*",description.ilike."*${search}*",search_vector.wfts(simple)."${search}"`
    )
  }

  if (category) query = query.in('category', csv(category))
  if (subcategory) query = query.in('subcategory', csv(subcategory))
  if (badge) query = query.in('badge', csv(badge))
  if (featured) query = query.eq('featured', featured === 'true')
  if (material) query = query.overlaps('material', csv(material))
  if (minPrice) query = query.gte('price', Number(minPrice))
  if (maxPrice) query = query.lte('price', Number(maxPrice))

  // Sıralama
  const [sortColumn, ascending] = SORT_OPTIONS[sort] || ['created_at', false]
  query = query.order(sortColumn, { ascending })
  if (sortColumn !== 'created_at') query = query.order('created_at', { ascending: false })

  // Sayfalama
  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(48, Math.max(1, Number(limit) || 12))
  const from = (pageNum - 1) * limitNum

  const { data, count, error } = await query.range(from, from + limitNum - 1)
  must({ data, error })

  const total = count || 0
  res.status(200).json({
    success: true,
    count: data.length,
    total,
    pages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data: toApiList(data),
  })
}

// @desc    Tek ürün getir
// @route   GET /api/products/:slug
// @access  Public
export const getProduct = async (req, res) => {
  const row = must(
    await supabase
      .from('products')
      .select('*')
      .eq('slug', String(req.params.slug).toLowerCase())
      .eq('is_active', true)
      .maybeSingle()
  )

  if (!row) {
    res.status(404)
    throw new Error('Ürün bulunamadı.')
  }

  res.status(200).json({ success: true, data: toApi(row) })
}

// @desc    Ürün oluştur
// @route   POST /api/products
// @access  Admin
export const createProduct = async (req, res) => {
  let payload = normalizeDescriptionPayload(req.body)
  payload = applyMediaPayload(payload)

  if (!payload.name || !String(payload.name).trim()) {
    res.status(400)
    throw new Error('Ürün adı zorunludur')
  }
  if (!payload.category) {
    res.status(400)
    throw new Error('Kategori zorunludur')
  }
  if (payload.price === undefined || payload.price === '' || Number(payload.price) < 0) {
    res.status(400)
    throw new Error('Fiyat zorunludur')
  }

  const fields = buildProductFields(payload)
  fields.slug = await createSlug(payload.name, 'products')

  const row = must(await supabase.from('products').insert(fields).select('*').single())
  res.status(201).json({ success: true, data: toApi(row) })
}

// @desc    Ürün güncelle
// @route   PUT /api/products/:id
// @access  Admin
export const updateProduct = async (req, res) => {
  const current = await requireProductRow(req.params.id, res)

  let payload = normalizeDescriptionPayload(req.body)
  payload = applyMediaPayload(payload, { colors: current.colors || [] })

  const oldPrice = Number(current.price)
  const priceDropped = payload.price && Number(payload.price) < oldPrice

  const fields = buildProductFields(payload)
  if (payload.name && payload.name !== current.name) {
    fields.slug = await createSlug(payload.name, 'products', current.id)
  }

  const row = Object.keys(fields).length
    ? must(await supabase.from('products').update(fields).eq('id', current.id).select('*').single())
    : current
  const product = toApi(row)

  if (priceDropped) {
    try {
      const fans = must(
        await supabase.from('users').select('*').contains('favorites', [current.id])
      )
      for (const u of fans) {
        await sendPriceDropEmail(userToApi(u), product, oldPrice).catch((err) => console.log('Mail error:', err))
      }
    } catch (err) {
      console.log('Fiyat düşüşü bildirim hatası:', err.message)
    }
  }

  res.status(200).json({ success: true, data: product })
}

// @desc    Ürün sil
// @route   DELETE /api/products/:id
// @access  Admin
export const deleteProduct = async (req, res) => {
  const product = await requireProductRow(req.params.id, res, 'id, images')

  // Storage'dan görselleri sil
  for (const imageUrl of product.images || []) {
    try {
      await deleteImage(getPublicId(imageUrl))
    } catch (err) {
      console.log('Resim silinemedi:', err.message)
    }
  }

  must(await supabase.from('products').delete().eq('id', product.id))
  res.status(200).json({ success: true, message: 'Ürün silindi.' })
}

// @desc    Ürün resmi yükle
// @route   POST /api/products/:id/image
// @access  Admin
export const uploadProductImage = async (req, res) => {
  const product = await requireProductRow(req.params.id, res, 'id, images, image_variants, colors')

  if (!req.file) {
    res.status(400)
    throw new Error('Lütfen bir resim yükleyin.')
  }

  if (!req.file.buffer) {
    res.status(500)
    throw new Error('Gorsel buffer bulunamadi. Yukleme ayari kontrol edilmeli.')
  }

  const uploadResult = await uploadImage(req.file.buffer, 'products')
  const imageUrl = uploadResult.secure_url
  const requestedColor = normalizeHexColor(req.body?.imageColor)
  const fallbackColor = normalizeHexColor(product.colors?.[0])
  const mappedColor = requestedColor || fallbackColor || null

  const fields = {
    images: [...(product.images || []), imageUrl],
    image_variants: [...(product.image_variants || []), { url: imageUrl, color: mappedColor }],
  }

  if (mappedColor) {
    const knownColors = new Set(uniqueColors(product.colors))
    if (!knownColors.has(mappedColor)) {
      fields.colors = [...knownColors, mappedColor]
    }
  }

  const row = must(
    await supabase.from('products').update(fields).eq('id', product.id).select('images, image_variants').single()
  )

  res.status(200).json({
    success: true,
    data: { images: row.images, imageVariants: row.image_variants },
  })
}

// @desc    Ürün resmi sil
// @route   DELETE /api/products/:id/image
// @access  Admin
export const deleteProductImage = async (req, res) => {
  const product = await requireProductRow(req.params.id, res, 'id, images, image_variants')
  const { imageUrl } = req.body

  try {
    await deleteImage(getPublicId(imageUrl))
  } catch (err) {
    console.log('Görsel silme hatası:', err.message)
  }

  const row = must(
    await supabase
      .from('products')
      .update({
        images: (product.images || []).filter((img) => img !== imageUrl),
        image_variants: (product.image_variants || []).filter((img) => img.url !== imageUrl),
      })
      .eq('id', product.id)
      .select('images, image_variants')
      .single()
  )

  res.status(200).json({
    success: true,
    data: { images: row.images, imageVariants: row.image_variants },
  })
}

// @desc    Öne çıkan ürünleri getir
// @route   GET /api/products/featured
// @access  Public
export const getFeaturedProducts = async (req, res) => {
  const rows = must(
    await supabase
      .from('products')
      .select(productCardColumns)
      .eq('featured', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(8)
  )

  res.status(200).json({ success: true, data: toApiList(rows) })
}

// @desc    Stok güncelle
// @route   PUT /api/products/:id/stock
// @access  Admin
export const updateStock = async (req, res) => {
  const stock = Math.max(0, Math.trunc(Number(req.body.stock) || 0))

  const row = isUuid(req.params.id)
    ? must(await supabase.from('products').update({ stock }).eq('id', req.params.id).select('*').maybeSingle())
    : null

  if (!row) {
    res.status(404)
    throw new Error('Ürün bulunamadı.')
  }

  res.status(200).json({ success: true, data: toApi(row) })
}
