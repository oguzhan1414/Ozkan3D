import Product from '../models/Product.js'
import User from '../models/User.js'
import { createSlug } from '../utils/createSlug.js'
import { uploadImage, deleteImage, getPublicId } from '../utils/imageUpload.js'
import { sendPriceDropEmail } from '../utils/sendEmail.js'

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

// @desc    Tüm ürünleri getir
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
  const {
    keyword, category, subcategory, material,
    minPrice, maxPrice, badge, featured,
    sort, page = 1, limit = 12
  } = req.query

  const query = { isActive: true }

  // Filtreleme
  if (keyword) {
    query.$text = { $search: keyword }
  }

  if (category) query.category = category
  if (subcategory) query.subcategory = subcategory
  if (badge) {
    query.badge = { $in: badge.split(',') }
  }
  if (featured) query.featured = featured === 'true'

  if (material) {
    query.material = { $in: material.split(',') }
  }

  if (minPrice || maxPrice) {
    query.price = {}
    if (minPrice) query.price.$gte = Number(minPrice)
    if (maxPrice) query.price.$lte = Number(maxPrice)
  }

  // Sıralama
  let sortOption = { createdAt: -1 }
  if (sort === 'price-asc') sortOption = { price: 1 }
  if (sort === 'price-desc') sortOption = { price: -1 }
  if (sort === 'rating') sortOption = { rating: -1 }
  if (sort === 'popular') sortOption = { reviewCount: -1 }
  if (sort === 'name-asc') sortOption = { name: 1 }
  if (sort === 'name-desc') sortOption = { name: -1 }

  // Sayfalama
  const pageNum = Number(page)
  const limitNum = Number(limit)
  const skip = (pageNum - 1) * limitNum

  const total = await Product.countDocuments(query)
  const products = await Product.find(query)
    .sort(sortOption)
    .skip(skip)
    .limit(limitNum)

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    pages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data: products,
  })
}

// @desc    Tek ürün getir
// @route   GET /api/products/:slug
// @access  Public
export const getProduct = async (req, res) => {
  const product = await Product.findOne({
    slug: req.params.slug,
    isActive: true,
  })

  if (!product) {
    res.status(404)
    throw new Error('Ürün bulunamadı.')
  }

  res.status(200).json({ success: true, data: product })
}

// @desc    Ürün oluştur
// @route   POST /api/products
// @access  Admin
export const createProduct = async (req, res) => {
  let payload = normalizeDescriptionPayload(req.body)
  payload = applyMediaPayload(payload)

  if (!payload.sku) payload.sku = undefined

  const slug = await createSlug(payload.name)
  const product = await Product.create({ ...payload, slug })
  res.status(201).json({ success: true, data: product })
}

// @desc    Ürün güncelle
// @route   PUT /api/products/:id
// @access  Admin
export const updateProduct = async (req, res) => {
  let product = await Product.findById(req.params.id)

  if (!product) {
    res.status(404)
    throw new Error('Ürün bulunamadı.')
  }

  let payload = normalizeDescriptionPayload(req.body)
  payload = applyMediaPayload(payload, product)

  const priceDropped = payload.price && Number(payload.price) < product.price
  const oldPrice = product.price

  if (payload.name && payload.name !== product.name) {
    payload.slug = await createSlug(payload.name)
  }

  product = await Product.findByIdAndUpdate(
    req.params.id,
    payload,
    { new: true, runValidators: true }
  )

  if (priceDropped) {
    try {
      const usersWithFavorite = await User.find({ favorites: product._id });
      for (const u of usersWithFavorite) {
        await sendPriceDropEmail(u, product, oldPrice).catch(err => console.log('Mail error:', err))
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
  const product = await Product.findById(req.params.id)

  if (!product) {
    res.status(404)
    throw new Error('Ürün bulunamadı.')
  }

  // Cloudinary'den resimleri sil
  for (const imageUrl of product.images) {
    try {
      const publicId = getPublicId(imageUrl)
      await deleteImage(publicId)
    } catch (err) {
      console.log('Resim silinemedi:', err.message)
    }
  }

  await product.deleteOne()
  res.status(200).json({ success: true, message: 'Ürün silindi.' })
}

// @desc    Ürün resmi yükle
// @route   POST /api/products/:id/image
// @access  Admin
export const uploadProductImage = async (req, res) => {
  console.log('📸 Upload isteği geldi')
  console.log('Params:', req.params)
  console.log('File name:', req.file?.originalname)
  console.log('Body:', req.body)

  const product = await Product.findById(req.params.id)

  if (!product) {
    res.status(404)
    throw new Error('Ürün bulunamadı.')
  }

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
  console.log('Image URL:', imageUrl)

  product.images.push(imageUrl)
  product.imageVariants = [
    ...(Array.isArray(product.imageVariants) ? product.imageVariants : []),
    { url: imageUrl, color: mappedColor },
  ]

  if (mappedColor) {
    const knownColors = new Set(uniqueColors(product.colors))
    if (!knownColors.has(mappedColor)) {
      product.colors = [...knownColors, mappedColor]
    }
  }

  await product.save()

  res.status(200).json({
    success: true,
    data: {
      images: product.images,
      imageVariants: product.imageVariants,
    },
  })
}
// @desc    Ürün resmi sil
// @route   DELETE /api/products/:id/image
// @access  Admin
export const deleteProductImage = async (req, res) => {
  const product = await Product.findById(req.params.id)

  if (!product) {
    res.status(404)
    throw new Error('Ürün bulunamadı.')
  }

  const { imageUrl } = req.body

  try {
    const publicId = getPublicId(imageUrl)
    await deleteImage(publicId)
  } catch (err) {
    console.log('Cloudinary silme hatası:', err.message)
  }

  product.images = product.images.filter(img => img !== imageUrl)
  if (Array.isArray(product.imageVariants)) {
    product.imageVariants = product.imageVariants.filter((img) => img.url !== imageUrl)
  }
  await product.save()

  res.status(200).json({
    success: true,
    data: {
      images: product.images,
      imageVariants: product.imageVariants,
    },
  })
}

// @desc    Öne çıkan ürünleri getir
// @route   GET /api/products/featured
// @access  Public
export const getFeaturedProducts = async (req, res) => {
  const products = await Product.find({ featured: true, isActive: true })
    .limit(8)
    .sort({ createdAt: -1 })

  res.status(200).json({ success: true, data: products })
}

// @desc    Stok güncelle
// @route   PUT /api/products/:id/stock
// @access  Admin
export const updateStock = async (req, res) => {
  const { stock } = req.body

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { stock },
    { new: true }
  )

  if (!product) {
    res.status(404)
    throw new Error('Ürün bulunamadı.')
  }

  res.status(200).json({ success: true, data: product })
}