import Cart from '../models/Cart.js'
import Product from '../models/Product.js'

// @desc    Sepeti getir
// @route   GET /api/cart
// @access  Private
export const getCart = async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id })
    .populate('items.product', 'name images price slug isActive')

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] })
  }

  // Aktif olmayan ürünleri filtrele
  cart.items = cart.items.filter(item =>
    item.product && item.product.isActive !== false
  )

  res.status(200).json({ success: true, data: cart })
}

// @desc    Sepete ürün ekle
// @route   POST /api/cart
// @access  Private
export const addToCart = async (req, res) => {
  const { productId, quantity = 1, material, color, name, image, price } = req.body

  const product = await Product.findById(productId)
  if (!product) {
    res.status(404)
    throw new Error('Ürün bulunamadı.')
  }

  if (product.stock < quantity) {
    res.status(400)
    throw new Error(`Yeterli stok yok. Mevcut: ${product.stock}`)
  }

  let cart = await Cart.findOne({ user: req.user._id })
  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] })
  }

  // Aynı ürün, malzeme ve renk varsa adet artır
  const existingIndex = cart.items.findIndex(i =>
    i.product.toString() === productId &&
    i.material === material &&
    i.color === color
  )

  if (existingIndex > -1) {
    cart.items[existingIndex].quantity += quantity
  } else {
    cart.items.push({
      product: productId,
      name: name || product.name,
      image: image || product.images?.[0] || '',
      price: price || product.price,
      quantity,
      material,
      color,
    })
  }

  // Expire güncelle
  cart.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await cart.save()

  res.status(200).json({ success: true, data: cart })
}

// @desc    Sepet ürün adedini güncelle
// @route   PUT /api/cart/:itemId
// @access  Private
export const updateCartItem = async (req, res) => {
  const { quantity } = req.body

  const cart = await Cart.findOne({ user: req.user._id })
  if (!cart) {
    res.status(404)
    throw new Error('Sepet bulunamadı.')
  }

  const item = cart.items.id(req.params.itemId)
  if (!item) {
    res.status(404)
    throw new Error('Ürün bulunamadı.')
  }

  if (quantity < 1) {
    cart.items.pull(req.params.itemId)
  } else {
    item.quantity = quantity
  }

  await cart.save()
  res.status(200).json({ success: true, data: cart })
}

// @desc    Sepetten ürün sil
// @route   DELETE /api/cart/:itemId
// @access  Private
export const removeCartItem = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id })
  if (!cart) {
    res.status(404)
    throw new Error('Sepet bulunamadı.')
  }

  cart.items.pull(req.params.itemId)
  await cart.save()

  res.status(200).json({ success: true, data: cart })
}

// @desc    Sepeti temizle
// @route   DELETE /api/cart
// @access  Private
export const clearCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id })
  if (cart) {
    cart.items = []
    await cart.save()
  }

  res.status(200).json({ success: true, message: 'Sepet temizlendi.' })
}