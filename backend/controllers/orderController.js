import { supabase } from '../config/supabase.js'
import { must, toApi, toApiList, isUuid, newSubId } from '../utils/db.js'
import { generateOrderNo } from '../utils/generateOrderNo.js'
import { sendOrderConfirmEmail, sendOrderNotifyAdmin, sendShippingEmail } from '../utils/sendEmail.js'
import { generateInvoicePDF } from '../utils/pdfGenerator.js'
import { calculateShippingQuote } from '../utils/shippingCalculator.js'
import { broadcast, adminChannel, userChannel } from '../utils/realtime.js'
import { findUserById } from '../services/userService.js'
import { getShippingConfig } from '../services/settingsService.js'
import { findCouponRowByCode, couponIsValid, couponDiscount, adjustCouponUsage } from '../services/couponService.js'
import {
  findOrderRow,
  updateOrderRow,
  historyEntry,
  adjustStock,
  rollbackCouponUsage,
  populateItemProducts,
  hasPurchasedProduct,
} from '../services/orderService.js'

const ORDER_STATUSES = ['Bekliyor', 'Basımda', 'Hazırlanıyor', 'Kargoda', 'Teslim Edildi', 'İptal']
const ORDER_SORT_COLUMNS = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  totalPrice: 'total_price',
  orderNo: 'order_no',
  status: 'status',
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

const requireOrderRow = async (id, res, columns = '*') => {
  const row = await findOrderRow(id, columns)
  if (!row) {
    res.status(404)
    throw new Error('Sipariş bulunamadı.')
  }
  return row
}

// @desc    Sipariş oluştur
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  const {
    items, shippingAddress, paymentMethod,
    shippingMethod, couponCode, customerNote,
  } = req.body

  if (!items || items.length === 0) {
    res.status(400)
    throw new Error('Sipariş öğeleri zorunludur.')
  }

  if (!shippingAddress?.fullName || !shippingAddress?.phone || !shippingAddress?.city || !shippingAddress?.district || !shippingAddress?.address) {
    res.status(400)
    throw new Error('Teslimat adresindeki zorunlu alanlar eksik.')
  }

  if (!['card', 'transfer'].includes(paymentMethod)) {
    res.status(400)
    throw new Error('Geçersiz ödeme yöntemi.')
  }

  // Ürünleri DB'den doğrula ve fiyatları kontrol et
  const productIds = [...new Set(items.map((item) => String(item?.product?._id || item?.product || '')).filter(Boolean))]
  if (productIds.length === 0) {
    res.status(400)
    throw new Error('Sipariş ürün bilgisi eksik.')
  }

  const invalidId = productIds.find((id) => !isUuid(id))
  if (invalidId) {
    res.status(404)
    throw new Error(`Ürün bulunamadı: ${invalidId}`)
  }

  const products = must(
    await supabase.from('products').select('id, name, images, price, stock').in('id', productIds)
  )
  const productMap = new Map(products.map((p) => [p.id, p]))

  let subtotal = 0
  const orderItems = []

  for (const item of items) {
    const productId = String(item?.product?._id || item?.product || '')
    const quantity = Number(item?.quantity)

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

    const price = Number(product.price)
    orderItems.push({
      _id: newSubId(),
      product: product.id,
      name: product.name,
      image: product.images?.[0] || '',
      price,
      quantity,
      material: item.material,
      color: item.color,
    })

    subtotal += price * quantity
  }

  const selectedShippingMethod = shippingMethod === 'express' ? 'express' : 'standard'
  let shippingQuote = calculateShippingQuote({
    items: orderItems,
    shippingAddress,
    shippingMethod: selectedShippingMethod,
  }, await getShippingConfig())
  let shippingCost = shippingQuote.totalCost

  // Kupon
  let discount = 0
  let couponId = null

  if (couponCode) {
    const coupon = await findCouponRowByCode(couponCode)

    if (coupon) {
      const { valid, message } = couponIsValid(coupon, subtotal)
      if (!valid) {
        res.status(400)
        throw new Error(message)
      }

      discount = couponDiscount(coupon, subtotal)
      if (coupon.type === 'shipping') {
        shippingCost = 0
        shippingQuote = { ...shippingQuote, totalCost: 0, couponFreeShipping: true }
      }
      couponId = coupon.id
    }
  }

  const totalPrice = subtotal - discount + shippingCost
  const orderNo = await generateOrderNo()

  const orderRow = must(
    await supabase
      .from('orders')
      .insert({
        user_id: req.user._id,
        order_no: orderNo,
        items: orderItems,
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
        shipping_method: selectedShippingMethod,
        shipping_details: shippingQuote,
        subtotal,
        discount,
        shipping_cost: shippingCost,
        total_price: totalPrice,
        coupon_id: couponId,
        coupon_code: couponCode || null,
        customer_note: customerNote || null,
        status_history: [historyEntry('Bekliyor', 'Sipariş alındı')],
      })
      .select('*')
      .single()
  )
  const order = toApi(orderRow)

  // Stokları düş, kupon kullanımını artır
  await adjustStock(orderItems, -1)
  if (couponId) await adjustCouponUsage(couponId, 1)

  // Onay maili gönder
  const user = req.user

  if (user?.email) {
    try {
      await sendOrderConfirmEmail(order, user)
    } catch (err) {
      console.log('Mail gönderilemedi:', err.message)
    }
  }

  // Admin'e sipariş mail bildirimi gönder
  try {
    await sendOrderNotifyAdmin(order, user)
  } catch (err) {
    console.log('Admin siparis maili gönderilemedi:', err.message)
  }

  // Realtime bildirimleri (eski socket.io olayları)
  await Promise.all([
    broadcast(adminChannel(), 'newOrder', {
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
    }),
    broadcast(userChannel(req.user._id), 'orderCreated', {
      type: 'orderCreated',
      message: `Siparişiniz alındı! ${order.orderNo}`,
      orderNo: order.orderNo,
      timestamp: new Date(),
    }),
  ])

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

  const quote = calculateShippingQuote({
    items: sanitizedItems,
    shippingAddress,
    shippingMethod,
  }, await getShippingConfig())

  res.status(200).json({ success: true, data: quote })
}

// @desc    Ürünün kullanıcı tarafından satın alınıp alınmadığını kontrol et
// @route   GET /api/orders/check-purchase/:productId
// @access  Private
export const checkPurchase = async (req, res) => {
  const hasPurchased = await hasPurchasedProduct(req.user._id, req.params.productId)
  res.status(200).json({ success: true, hasPurchased: !!hasPurchased })
}

// @desc    Kullanıcının siparişlerini getir
// @route   GET /api/orders/mine
// @access  Private
export const getMyOrders = async (req, res) => {
  const rows = must(
    await supabase
      .from('orders')
      .select('*')
      .eq('user_id', req.user._id)
      .order('created_at', { ascending: false })
  )

  const orders = toApiList(rows)
  await populateItemProducts(orders)

  const preparedOrders = orders.map((order) => ({
    ...order,
    createdAtDisplay: formatOrderDateForTR(order.createdAt),
  }))

  res.status(200).json({ success: true, count: preparedOrders.length, data: preparedOrders })
}

// @desc    Tek sipariş getir
// @route   GET /api/orders/:id
// @access  Private
export const getOrder = async (req, res) => {
  const row = await requireOrderRow(
    req.params.id,
    res,
    '*, user:users(id, first_name, last_name, email, phone)'
  )

  // Sadece kendi siparişini görebilir (admin hariç)
  if (row.user_id !== req.user._id && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('Bu siparişi görüntüleme yetkiniz yok.')
  }

  const order = toApi(row, ['user'])
  await populateItemProducts(order)

  res.status(200).json({ success: true, data: order })
}

// @desc    Tüm siparişleri getir
// @route   GET /api/orders
// @access  Admin
export const getOrders = async (req, res) => {
  const { status, page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query

  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(200, Math.max(1, Number(limit) || 20))
  const from = (pageNum - 1) * limitNum

  let query = supabase
    .from('orders')
    .select('*, user:users(id, first_name, last_name, email)', { count: 'exact' })
  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
    .order(ORDER_SORT_COLUMNS[sort] || 'created_at', { ascending: order !== 'desc' })
    .range(from, from + limitNum - 1)
  must({ data, error })

  const total = count || 0
  res.status(200).json({
    success: true,
    count: data.length,
    total,
    pages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data: toApiList(data, ['user']),
  })
}

// @desc    Sipariş durumu güncelle
// @route   PUT /api/orders/:id/status
// @access  Admin
export const updateOrderStatus = async (req, res) => {
  const { status, note } = req.body

  if (!ORDER_STATUSES.includes(status)) {
    res.status(400)
    throw new Error('Geçersiz sipariş durumu.')
  }

  const row = await requireOrderRow(req.params.id, res)
  const previousStatus = row.status

  const fields = {
    status,
    status_history: [...(row.status_history || []), historyEntry(status, note)],
  }

  if (status === 'Teslim Edildi') {
    fields.is_delivered = true
    fields.delivered_at = new Date().toISOString()
  }

  // Stoklar ve kupon sadece ilk iptalde geri alınır
  if (status === 'İptal' && previousStatus !== 'İptal') {
    await adjustStock(row.items, 1)
    await rollbackCouponUsage(row.coupon_id)
  }

  const updated = await updateOrderRow(row.id, fields)
  res.status(200).json({ success: true, data: toApi(updated) })
}

// @desc    Kargo takip ekle
// @route   PUT /api/orders/:id/track
// @access  Admin
export const updateTracking = async (req, res) => {
  const { trackingNo, carrier } = req.body

  const row = await requireOrderRow(req.params.id, res)

  const updated = await updateOrderRow(row.id, {
    tracking_no: trackingNo,
    carrier,
    status: 'Kargoda',
    status_history: [...(row.status_history || []), historyEntry('Kargoda', `${carrier} - ${trackingNo}`)],
  })
  const order = toApi(updated)

  // Kargo maili gönder
  try {
    const user = await findUserById(row.user_id)
    if (user) await sendShippingEmail(order, user)
  } catch (err) {
    console.log('Mail gönderilemedi:', err.message)
  }

  res.status(200).json({ success: true, data: order })
}

// @desc    Kullanıcının siparişini iptal et (sadece 'Bekliyor' veya 'Onaylandı' durumunda)
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = async (req, res) => {
  const row = await requireOrderRow(req.params.id, res)

  if (row.user_id !== req.user._id) {
    res.status(403)
    throw new Error('Bu siparişi iptal etme yetkiniz yok.')
  }

  const cancellableStatuses = ['Bekliyor', 'Onaylandı']
  if (!cancellableStatuses.includes(row.status)) {
    res.status(400)
    throw new Error(`"${row.status}" aşamasındaki siparişler iptal edilemez.`)
  }

  await adjustStock(row.items, 1)
  await rollbackCouponUsage(row.coupon_id)

  const updated = await updateOrderRow(row.id, {
    status: 'İptal',
    status_history: [...(row.status_history || []), historyEntry('İptal', 'Müşteri tarafından iptal edildi.')],
  })

  res.status(200).json({ success: true, data: toApi(updated) })
}

// @desc    Fatura PDF indir
// @route   GET /api/orders/:id/pdf
// @access  Admin
export const getInvoicePDF = async (req, res) => {
  const row = await requireOrderRow(req.params.id, res, '*, user:users(id, first_name, last_name, email)')
  const order = toApi(row, ['user'])

  const pdfBuffer = await generateInvoicePDF(order, order.user)

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=fatura-${order.orderNo}.pdf`)
  res.send(pdfBuffer)
}

// @desc    Ödeme güncelle
// @route   PUT /api/orders/:id/pay
// @access  Admin
// Not: Eskiden her giriş yapmış kullanıcı herhangi bir siparişi "ödendi" yapabiliyordu.
// Kart ödemeleri PayTR callback'i ile işaretlendiği için bu uç artık sadece admin'e açık.
export const updateOrderToPaid = async (req, res) => {
  const row = await requireOrderRow(req.params.id, res)
  const now = new Date().toISOString()

  const updated = await updateOrderRow(row.id, {
    is_paid: true,
    paid_at: now,
    payment_result: { id: req.body.id, status: req.body.status, paidAt: now },
    status_history: [
      ...(row.status_history || []),
      historyEntry(row.status, 'Odeme alindi, uretim planlama asamasinda.'),
    ],
  })

  res.status(200).json({ success: true, data: toApi(updated) })
}
