import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Coupon from '../models/Coupon.js'
import { generateOrderNo } from '../utils/generateOrderNo.js'
import { sendOrderConfirmEmail, sendShippingEmail } from '../utils/sendEmail.js'
import { generateInvoicePDF } from '../utils/pdfGenerator.js'
import User from '../models/User.js'
import {io} from '../server.js'

// @desc    Sipariş oluştur
// @route   POST /api/orders
// @access  Private

export const createOrder = async (req, res) => {
  const {
    items, shippingAddress, paymentMethod,
    couponCode, customerNote
  } = req.body

  if (!items || items.length === 0) {
    res.status(400) 
    throw new Error('Sipariş öğeleri zorunludur.')
  }

  // Ürünleri DB'den doğrula ve fiyatları kontrol et
  let subtotal = 0
  const orderItems = []

  for (const item of items) {
    const product = await Product.findById(item.product)

    if (!product) {
      res.status(404)
      throw new Error(`Ürün bulunamadı: ${item.product}`)
    }

    if (product.stock < item.quantity) {
      res.status(400)
      throw new Error(`${product.name} için yeterli stok yok. Mevcut stok: ${product.stock}`)
    }

    orderItems.push({
      product: product._id,
      name: product.name,
      image: product.images[0] || '',
      price: product.price,
      quantity: item.quantity,
      material: item.material,
      color: item.color,
    })

    subtotal += product.price * item.quantity
  }

  // Kargo ücreti
  let shippingCost = subtotal >= 500 ? 0 : 49

  // Kupon
  let discount = 0
  let couponId = null

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() })

    if (coupon) {
      const { valid, message } = coupon.isValid(subtotal)
      if (!valid) {
        res.status(400)
        throw new Error(message)
      }

      discount = coupon.calcDiscount(subtotal)
      if (coupon.type === 'shipping') shippingCost = 0
      couponId = coupon._id

      // Kullanım sayısını artır
      coupon.used += 1
      await coupon.save()
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
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity },
    })
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
// @desc    Ürünün kullanıcı tarafından satın alınıp alınmadığını kontrol et
// @route   GET /api/orders/check-purchase/:productId
// @access  Private
export const checkPurchase = async (req, res) => {
  const productId = req.params.productId
  
  const hasPurchased = await Order.findOne({
    user: req.user._id,
    'items.product': productId,
    status: { $in: ['Onaylandı', 'Hazırlanıyor', 'Kargoya Verildi', 'Teslim Edildi'] },
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

  res.status(200).json({ success: true, count: orders.length, data: orders })
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

  order.status = status
  order.statusHistory.push({ status, note })

  if (status === 'Teslim Edildi') {
    order.isDelivered = true
    order.deliveredAt = Date.now()
  }

  if (status === 'İptal') {
    // Stokları geri yükle
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      })
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
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
    })
  }

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

  order.statusHistory.push({ status: 'Basımda', note: 'Ödeme alındı, baskı başlıyor' })
  order.status = 'Basımda'

  await order.save()

  res.status(200).json({ success: true, data: order })
}