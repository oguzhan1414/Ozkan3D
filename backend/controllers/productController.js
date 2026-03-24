import Product from '../models/Product.js'
import { createSlug } from '../utils/createSlug.js'
import { uploadImage, deleteImage, getPublicId } from '../utils/imageUpload.js'

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
  if (!req.body.sku) req.body.sku = undefined;
  const slug = await createSlug(req.body.name)
  const product = await Product.create({ ...req.body, slug })
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

  if (req.body.name && req.body.name !== product.name) {
    req.body.slug = await createSlug(req.body.name)
  }

  product = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  )

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
  console.log('File:', req.file)
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

  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/products/${req.file.filename}`
  console.log('Image URL:', imageUrl)

  product.images.push(imageUrl)
  await product.save()

  res.status(200).json({ success: true, data: product.images })
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
  await product.save()

  res.status(200).json({ success: true, data: product.images })
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