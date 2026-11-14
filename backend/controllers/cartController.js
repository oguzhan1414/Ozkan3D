import { supabase } from '../config/supabase.js'
import { must, toApi, isUuid, newSubId } from '../utils/db.js'
import { populateItemProducts } from '../services/orderService.js'

const CART_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Kullanıcının sepetini getirir; yoksa veya süresi dolmuşsa boş sepet döner */
const getOrCreateCartRow = async (userId) => {
  const existing = must(await supabase.from('carts').select('*').eq('user_id', userId).maybeSingle())

  if (!existing) {
    return must(
      await supabase.from('carts').insert({ user_id: userId, items: [] }).select('*').single()
    )
  }

  // Mongo TTL index karşılığı: süresi dolan sepet boşaltılır
  if (new Date(existing.expires_at).getTime() < Date.now()) {
    return saveCart(existing.id, [])
  }
  return existing
}

const saveCart = async (cartId, items) =>
  must(
    await supabase
      .from('carts')
      .update({ items, expires_at: new Date(Date.now() + CART_TTL_MS).toISOString() })
      .eq('id', cartId)
      .select('*')
      .single()
  )

// @desc    Sepeti getir
// @route   GET /api/cart
// @access  Private
export const getCart = async (req, res) => {
  const cart = toApi(await getOrCreateCartRow(req.user._id))
  await populateItemProducts(cart, 'id, name, images, price, slug, is_active')

  // Silinmiş veya pasif ürünleri filtrele
  cart.items = cart.items.filter((item) => item.product && item.product.isActive !== false)

  res.status(200).json({ success: true, data: cart })
}

// @desc    Sepete ürün ekle
// @route   POST /api/cart
// @access  Private
export const addToCart = async (req, res) => {
  const { productId, material, color, name, image, price } = req.body
  const quantity = Math.max(1, Number(req.body.quantity) || 1)

  const product = isUuid(productId)
    ? must(await supabase.from('products').select('id, name, images, price, stock').eq('id', productId).maybeSingle())
    : null

  if (!product) {
    res.status(404)
    throw new Error('Ürün bulunamadı.')
  }

  if (product.stock < quantity) {
    res.status(400)
    throw new Error(`Yeterli stok yok. Mevcut: ${product.stock}`)
  }

  const cartRow = await getOrCreateCartRow(req.user._id)
  const items = [...(cartRow.items || [])]

  // Aynı ürün, malzeme ve renk varsa adet artır
  const existingIndex = items.findIndex(
    (i) => i.product === productId && i.material === material && i.color === color
  )

  if (existingIndex > -1) {
    items[existingIndex] = { ...items[existingIndex], quantity: items[existingIndex].quantity + quantity }
  } else {
    items.push({
      _id: newSubId(),
      product: productId,
      name: name || product.name,
      image: image || product.images?.[0] || '',
      price: price || Number(product.price),
      quantity,
      material,
      color,
    })
  }

  const cart = toApi(await saveCart(cartRow.id, items))
  res.status(200).json({ success: true, data: cart })
}

// @desc    Sepet ürün adedini güncelle
// @route   PUT /api/cart/:itemId
// @access  Private
export const updateCartItem = async (req, res) => {
  const quantity = Number(req.body.quantity)

  const cartRow = must(await supabase.from('carts').select('*').eq('user_id', req.user._id).maybeSingle())
  if (!cartRow) {
    res.status(404)
    throw new Error('Sepet bulunamadı.')
  }

  const items = cartRow.items || []
  if (!items.some((i) => i._id === req.params.itemId)) {
    res.status(404)
    throw new Error('Ürün bulunamadı.')
  }

  const nextItems = quantity < 1
    ? items.filter((i) => i._id !== req.params.itemId)
    : items.map((i) => (i._id === req.params.itemId ? { ...i, quantity } : i))

  const cart = toApi(await saveCart(cartRow.id, nextItems))
  res.status(200).json({ success: true, data: cart })
}

// @desc    Sepetten ürün sil
// @route   DELETE /api/cart/:itemId
// @access  Private
export const removeCartItem = async (req, res) => {
  const cartRow = must(await supabase.from('carts').select('*').eq('user_id', req.user._id).maybeSingle())
  if (!cartRow) {
    res.status(404)
    throw new Error('Sepet bulunamadı.')
  }

  const items = (cartRow.items || []).filter((i) => i._id !== req.params.itemId)
  const cart = toApi(await saveCart(cartRow.id, items))

  res.status(200).json({ success: true, data: cart })
}

// @desc    Sepeti temizle
// @route   DELETE /api/cart
// @access  Private
export const clearCart = async (req, res) => {
  must(await supabase.from('carts').update({ items: [] }).eq('user_id', req.user._id))
  res.status(200).json({ success: true, message: 'Sepet temizlendi.' })
}
