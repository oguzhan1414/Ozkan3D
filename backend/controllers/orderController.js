import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Coupon from '../models/Coupon.js'
import { generateOrderNo } from '../utils/generateOrderNo.js'
import { sendOrderConfirmEmail, sendShippingEmail } from '../utils/sendEmail.js'
import { generateInvoicePDF } from '../utils/pdfGenerator.js'
import User from '../models/User.js'
import {io} from '../server.js'
import { calculateShippingQuote } from '../utils/shippingCalculator.js'
import Settings from '../models/Settings.js'

const SHIPPING_SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000
let shippingConfigCache = {
  value: null,
  expiresAt: 0,
}

const formatOrderDateForTR = (dateValue) => {
  if (!dateValue) return ''

  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateValue))
}

const rollbackCouponUsage = async (couponId) => {
  if (!couponId) return

  const coupon = await Coupon.findById(couponId)
  if (!coupon) return

  coupon.used = Math.max(0, (coupon.used || 0) - 1)
  await coupon.save()
}

const bulkAdjustStock = async (items = [], direction = 'decrease') => {
  if (!Array.isArray(items) || items.length === 0) return

  const sign = direction === 'increase' ? 1 : -1
  const ops = items
    .filter((item) => item?.product && Number(item.quantity) > 0)
    .map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { stock: sign * Number(item.quantity) } },
      },
    }))

  if (ops.length > 0) {
    await Product.bulkWrite(ops, { ordered: false })
  }
}

const getShippingConfigFromSettings = async () => {
  const now = Date.now()
  if (shippingConfigCache.value && shippingConfigCache.expiresAt > now) {
    return shippingConfigCache.value
  }

  const settings = await Settings.findOne().lean()

  const config = {
    baseCostByZone: {
      local: Number(settings?.localShippingCost ?? 89),
      near: Number(settings?.nearShippingCost ?? 109),
      standard: Number(settings?.standardShippingCost ?? 139),
      far: Number(settings?.farShippingCost ?? 179),
    },
    expressSurcharge: Number(settings?.expressShippingSurcharge ?? 35),
  }

  shippingConfigCache = {
    value: config,
    expiresAt: now + SHIPPING_SETTINGS_CACHE_TTL_MS,
  }

  return config
}

// @desc    Sipariş oluştur
// @route   POST /api/orders
// @access  Private

export const createOrder = async (req, res) => {
  const {
    items, shippingAddress, paymentMethod,
    shippingMethod, couponCode, customerNote
  } = req.body

  if (!items || items.length === 0) {
    res.status(400) 
    throw new Error('Sipariş öğeleri zorunludur.')
  }

  if (!shippingAddress?.fullName || !shippingAddress?.phone || !shippingAddress?.city || !shippingAddress?.district || !shippingAddress?.address) {
    res.status(400)
    throw new Error('Teslimat adresindeki zorunlu alanlar eksik.')
  }

  // Ürünleri DB'den doğrula ve fiyatları kontrol et
  let subtotal = 0
  const orderItems = []

  const productIds = [...new Set(items.map((item) => item?.product?.toString()).filter(Boolean))]
  if (productIds.length === 0) {
    res.status(400)
    throw new Error('Sipariş ürün bilgisi eksik.')
  }

  const products = await Product.find({ _id: { $in: productIds } })
    .select('_id name images price stock')
    .lean()

  const productMap = new Map(products.map((product) => [product._id.toString(), product]))

  for (const item of items) {
    const productId = item?.product?.toString()
    const quantity = Number(item?.quantity)

    if (!productId) {
      res.status(400)
      throw new Error('Ürün kimliği eksik.')
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      res.status(400)
      throw new Error('Ürün adedi 1 veya daha büyük olmalıdır.')
    }

    const product = productMap.get(productId)

    if (!product) {
      res.status(404)
      throw new Error(`Ürün bulunamadı: ${productId}`)
    }

    if (product.stock < quantity) {
      res.status(400)
      throw new Error(`${product.name} için yeterli stok yok. Mevcut stok: ${product.stock}`)
    }

    orderItems.push({
      product: product._id,
      name: product.name,
      image: product.images[0] || '',
      price: product.price,
      quantity,
      material: item.material,
      color: item.color,
    })

    subtotal += product.price * quantity
  }

  const selectedShippingMethod = shippingMethod === 'express' ? 'express' : 'standard'
  const shippingConfig = await getShippingConfigFromSettings()
  let shippingQuote = calculateShippingQuote({
    items: orderItems,
    shippingAddress,
    shippingMethod: selectedShippingMethod,
  }, shippingConfig)
  let shippingCost = shippingQuote.totalCost

  // Kupon
  let discount = 0
  let couponId = null
  let couponToUpdate = null

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() })

    if (coupon) {
      const { valid, message } = coupon.isValid(subtotal)
      if (!valid) {
        res.status(400)
        throw new Error(message)
      }

      discount = coupon.calcDiscount(subtotal)
      if (coupon.type === 'shipping') {
        shippingCost = 0
        shippingQuote = {
          ...shippingQuote,
          totalCost: 0,
          couponFreeShipping: true,
        }
      }
      couponId = coupon._id
      couponToUpdate = coupon
    }
  }

  const totalPrice = subtotal - discount + shippingCost
  const orderNo = await generateOrderNo()

  // Siparişi oluştur
  const order = await Order.create({
    user: req.user._id,
    orderNo,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    shippingMethod: selectedShippingMethod,
    shippingDetails: shippingQuote,
    subtotal,
    discount,
    shippingCost,
    totalPrice,
    coupon: couponId,
    couponCode,
    customerNote,
    statusHistory: [{ status: 'Bekliyor', note: 'Sipariş alındı' }],
  })

  // Stokları düş
  await bulkAdjustStock(orderItems, 'decrease')

  // Sipariş başarıyla oluşturulduktan sonra kupon kullanımını artır
  if (couponToUpdate) {
    couponToUpdate.used += 1
    await couponToUpdate.save()
  }

  // Onay maili gönder
  try {
    const user = await User.findById(req.user._id)
    await sendOrderConfirmEmail(order, user)
  } catch (err) {
    console.log('Mail gönderilemedi:', err.message)
  }

  // --- Socket.IO Bildirimleri ---
  // Admin'e bildirim gönder
  io.to('admin').emit('newOrder', {
    type: 'newOrder',
    message: `Yeni sipariş: ${order.orderNo} — ${order.totalPrice}₺`,
    order: {
      _id: order._id,
      orderNo: order.orderNo,
      totalPrice: order.totalPrice,
      status: order.status,
      createdAt: order.createdAt,
    },
    timestamp: new Date(),
  })

  // Kullanıcıya da bildirim gönder
  io.to(`user_${req.user._id}`).emit('orderCreated', {
    type: 'orderCreated',
    message: `Siparişiniz alındı! ${order.orderNo}`,
    orderNo: order.orderNo,
    timestamp: new Date(),
  })
  // ------------------------------

  res.status(201).json({ success: true, data: order })
}

// @desc    Kargo ucreti on hesaplama
// @route   POST /api/orders/shipping-quote
// @access  Private
export const getShippingQuote = async (req, res) => {
  const { items, shippingAddress, shippingMethod } = req.body

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400)
    throw new Error('Kargo hesabi icin urun listesi zorunludur.')
  }

  if (!shippingAddress?.city) {
    res.status(400)
    throw new Error('Kargo hesabi icin sehir bilgisi zorunludur.')
  }

  const sanitizedItems = items.map((item) => ({
    name: item.name || '',
    material: item.material || '',
    quantity: Number(item.quantity) || 1,
  }))

  const shippingConfig = await getShippingConfigFromSettings()

  const quote = calculateShippingQuote({
    items: sanitizedItems,
    shippingAddress,
    shippingMethod,
  }, shippingConfig)

  res.status(200).json({ success: true, data: quote })
}
// @desc    Ürünün kullanıcı tarafından satın alınıp alınmadığını kontrol et
// @route   GET /api/orders/check-purchase/:productId
// @access  Private
export const checkPurchase = async (req, res) => {
  const productId = req.params.productId
  
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
  
  res.status(200).json({ success: true, hasPurchased: !!hasPurchased })
}

// @desc    Kullanıcının siparişlerini getir
// @route   GET /api/orders/mine
// @access  Private
export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('items.product', 'name images slug')

  const preparedOrders = orders.map((order) => {
    const orderObj = order.toObject()

    return {
      ...orderObj,
      createdAtDisplay: formatOrderDateForTR(orderObj.createdAt),
    }
  })

  res.status(200).json({ success: true, count: preparedOrders.length, data: preparedOrders })
}

// @desc    Tek sipariş getir
// @route   GET /api/orders/:id
// @access  Private
export const getOrder = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'firstName lastName email phone')
    .populate('items.product', 'name images slug')

  if (!order) {
    res.status(404)
    throw new Error('Sipariş bulunamadı.')
  }

  // Sadece kendi siparişini görebilir (admin hariç)
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('Bu siparişi görüntüleme yetkiniz yok.')
  }

  res.status(200).json({ success: true, data: order })
}

// @desc    Tüm siparişleri getir
// @route   GET /api/orders
// @access  Admin
export const getOrders = async (req, res) => {
  const {
    status, page = 1, limit = 20,
    sort = 'createdAt', order = 'desc'
  } = req.query

  const query = {}
  if (status) query.status = status

  const sortOption = { [sort]: order === 'desc' ? -1 : 1 }
  const pageNum = Number(page)
  const limitNum = Number(limit)
  const skip = (pageNum - 1) * limitNum

  const total = await Order.countDocuments(query)
  const orders = await Order.find(query)
    .sort(sortOption)
    .skip(skip)
    .limit(limitNum)
    .populate('user', 'firstName lastName email')

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    pages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data: orders,
  })
}

// @desc    Sipariş durumu güncelle
// @route   PUT /api/orders/:id/status
// @access  Admin
export const updateOrderStatus = async (req, res) => {
  const { status, note } = req.body

  const order = await Order.findById(req.params.id)

  if (!order) {
    res.status(404)
    throw new Error('Sipariş bulunamadı.')
  }

  const previousStatus = order.status
  order.status = status
  order.statusHistory.push({ status, note })

  if (status === 'Teslim Edildi') {
    order.isDelivered = true
    order.deliveredAt = Date.now()
  }

  if (status === 'İptal') {
    // Stokları geri yükle
    await bulkAdjustStock(order.items, 'increase')

    if (previousStatus !== 'İptal') {
      await rollbackCouponUsage(order.coupon)
    }
  }

  await order.save()

  res.status(200).json({ success: true, data: order })
}

// @desc    Kargo takip ekle
// @route   PUT /api/orders/:id/track
// @access  Admin
export const updateTracking = async (req, res) => {
  const { trackingNo, carrier } = req.body

  const order = await Order.findById(req.params.id)

  if (!order) {
    res.status(404)
    throw new Error('Sipariş bulunamadı.')
  }

  order.trackingNo = trackingNo
  order.carrier = carrier
  order.status = 'Kargoda'
  order.statusHistory.push({ status: 'Kargoda', note: `${carrier} - ${trackingNo}` })

  await order.save()

  // Kargo maili gönder
  try {
    const user = await User.findById(order.user)
    await sendShippingEmail(order, user)
  } catch (err) {
    console.log('Mail gönderilemedi:', err.message)
  }

  res.status(200).json({ success: true, data: order })
}

// @desc    Kullanıcının siparişini iptal et (sadece 'Bekliyor' veya 'Onaylandı' durumunda)
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.id)

  if (!order) {
    res.status(404)
    throw new Error('Sipariş bulunamadı.')
  }

  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403)
    throw new Error('Bu siparişi iptal etme yetkiniz yok.')
  }

  const cancellableStatuses = ['Bekliyor', 'Onaylandı']
  if (!cancellableStatuses.includes(order.status)) {
    res.status(400)
    throw new Error(`"${order.status}" aşamasındaki siparişler iptal edilemez.`)
  }

  order.status = 'İptal'
  order.statusHistory.push({ status: 'İptal', note: 'Müşteri tarafından iptal edildi.' })

  // Stokları geri yükle
  await bulkAdjustStock(order.items, 'increase')

  await rollbackCouponUsage(order.coupon)

  await order.save()

  res.status(200).json({ success: true, data: order })
}

// @desc    Fatura PDF indir
// @route   GET /api/orders/:id/pdf
// @access  Admin
export const getInvoicePDF = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'firstName lastName email')

  if (!order) {
    res.status(404)
    throw new Error('Sipariş bulunamadı.')
  }

  const pdfBuffer = await generateInvoicePDF(order, order.user)

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=fatura-${order.orderNo}.pdf`)
  res.send(pdfBuffer)
}

// @desc    Ödeme güncelle
// @route   PUT /api/orders/:id/pay
// @access  Private
export const updateOrderToPaid = async (req, res) => {
  const order = await Order.findById(req.params.id)

  if (!order) {
    res.status(404)
    throw new Error('Sipariş bulunamadı.')
  }

  order.isPaid = true
  order.paidAt = Date.now()
  order.paymentResult = {
    id: req.body.id,
    status: req.body.status,
    paidAt: Date.now(),
  }

  order.statusHistory.push({ status: order.status, note: 'Odeme alindi, uretim planlama asamasinda.' })

  await order.save()

  res.status(200).json({ success: true, data: order })
}