import crypto from 'crypto'
import Order from '../models/Order.js'
import User from '../models/User.js'
import Product from '../models/Product.js'
import Coupon from '../models/Coupon.js'

const inFlightPayments = new Set()
const PAYTR_TOKEN_URL = 'https://www.paytr.com/odeme/api/get-token'
const FALLBACK_CLIENT_URL = 'https://www.ozkan3d.com.tr'

const normalizeMoney = (value) => Number(Number(value || 0).toFixed(2))

const toBoolean = (value, fallback = false) => {
  if (value == null) return fallback
  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false
  return fallback
}

const resolveClientUrl = () => {
  const rawClientUrl = String(process.env.CLIENT_URL || '').trim()
  if (rawClientUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(rawClientUrl)) {
    return rawClientUrl.replace(/\/+$/, '')
  }

  const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
  if (isProduction) return FALLBACK_CLIENT_URL

  return (rawClientUrl || 'http://localhost:5173').replace(/\/+$/, '')
}

const getPaytrConfig = () => {
  const merchantId = process.env.PAYTR_MERCHANT_ID || process.env.merchant_id
  const merchantKey = process.env.PAYTR_MERCHANT_KEY || process.env.merchant_key
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT || process.env.merchant_salt

  const explicitTestMode = process.env.PAYTR_TEST_MODE
  const defaultTestMode = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
    String(process.env.CLIENT_URL || '').trim() || 'http://localhost:5173'
  )
  const isTestMode = toBoolean(explicitTestMode, defaultTestMode)

  return {
    merchantId,
    merchantKey,
    merchantSalt,
    isTestMode,
    noInstallment: '0',
    maxInstallment: '12',
    currency: 'TL',
    timeoutLimit: Number(process.env.PAYTR_TIMEOUT_LIMIT || 30),
    debugOn: toBoolean(process.env.PAYTR_DEBUG_ON, isTestMode) ? '1' : '0',
  }
}

const ensurePaytrConfig = () => {
  const { merchantId, merchantKey, merchantSalt } = getPaytrConfig()
  if (!merchantId || !merchantKey || !merchantSalt) {
    throw new Error('PayTR ayarlari eksik. PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY ve PAYTR_MERCHANT_SALT (veya merchant_id, merchant_key, merchant_salt) .env icinde olmali.')
  }
}

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  if (req.ip === '::1' || req.ip === '::ffff:127.0.0.1') {
    return '127.0.0.1'
  }
  return req.ip || '127.0.0.1'
}

const normalizePhoneForPaytr = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '')
  if (digits.length >= 10) {
    return digits.slice(-10)
  }
  return '5555555555'
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

const buildBasketForPaytr = (order) => {
  const baseItems = order.items.map((item, index) => ({
    id: item.product?._id?.toString() || `${order._id}-${index + 1}`,
    name: item.name || `Urun-${index + 1}`,
    amount: normalizeMoney((Number(item.price) || 0) * (Number(item.quantity) || 1)),
  }))

  const baseTotal = normalizeMoney(baseItems.reduce((sum, item) => sum + item.amount, 0))
  const targetTotal = normalizeMoney(order.totalPrice)

  if (baseItems.length === 0 || baseTotal <= 0 || targetTotal <= 0) {
    throw new Error('PayTR sepeti olusturulamadi. Siparis tutarini kontrol edin.')
  }

  const ratio = targetTotal / baseTotal
  const distributed = []
  let running = 0

  for (let i = 0; i < baseItems.length; i += 1) {
    const item = baseItems[i]

    if (i === baseItems.length - 1) {
      const lastAmount = Math.max(0.01, normalizeMoney(targetTotal - running))
      distributed.push({ name: item.name, amount: lastAmount })
      continue
    }

    const safeAmount = Math.max(0.01, normalizeMoney(item.amount * ratio))
    distributed.push({ name: item.name, amount: safeAmount })
    running = normalizeMoney(running + safeAmount)
  }

  const sum = normalizeMoney(distributed.reduce((acc, item) => acc + item.amount, 0))
  const correction = normalizeMoney(targetTotal - sum)
  if (correction !== 0 && distributed.length > 0) {
    distributed[distributed.length - 1].amount = normalizeMoney(distributed[distributed.length - 1].amount + correction)
  }

  const basket = distributed.map((item) => [item.name, item.amount.toFixed(2), 1])
  const basketBase64 = Buffer.from(JSON.stringify(basket), 'utf8').toString('base64')
  const paymentAmount = Math.round(targetTotal * 100)

  return { basketBase64, paymentAmount }
}

const buildPaytrToken = ({
  merchantId,
  merchantKey,
  merchantSalt,
  userIp,
  merchantOid,
  email,
  paymentAmount,
  userBasket,
  noInstallment,
  maxInstallment,
  currency,
  testMode,
}) => {
  const hashStr = `${merchantId}${userIp}${merchantOid}${email}${paymentAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}`
  return crypto
    .createHmac('sha256', merchantKey)
    .update(hashStr + merchantSalt)
    .digest('base64')
}

const verifyCallbackHash = ({ merchantOid, status, totalAmount, hash }) => {
  const { merchantKey, merchantSalt } = getPaytrConfig()
  const calculated = crypto
    .createHmac('sha256', merchantKey)
    .update(`${merchantOid}${merchantSalt}${status}${totalAmount}`)
    .digest('base64')

  return calculated === hash
}

const requestPaytrToken = async (payload) => {
  const response = await fetch(PAYTR_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(payload).toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`PayTR token servisi HTTP ${response.status}: ${text}`)
  }

  const data = await response.json()
  if (data.status !== 'success' || !data.token) {
    throw new Error(data.reason || 'PayTR token olusturulamadi.')
  }

  return data.token
}

const buildRedirectUrlWithOrder = (rawUrl, orderId, paytrStatus) => {
  try {
    const parsed = new URL(rawUrl)
    parsed.searchParams.set('orderId', orderId)
    parsed.searchParams.set('paytr', paytrStatus)
    return parsed.toString()
  } catch {
    const separator = rawUrl.includes('?') ? '&' : '?'
    return `${rawUrl}${separator}orderId=${orderId}&paytr=${paytrStatus}`
  }
}

// @desc    PayTR odeme baslat
// @route   POST /api/payment/create
// @access  Private
export const createPayment = async (req, res) => {
  const { orderId } = req.body

  if (!orderId) {
    res.status(400)
    throw new Error('orderId zorunludur.')
  }

  ensurePaytrConfig()

  const order = await Order.findById(orderId).populate('items.product', 'name')

  if (!order) {
    res.status(404)
    throw new Error('Siparis bulunamadi.')
  }

  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403)
    throw new Error('Bu siparis icin odeme yetkiniz yok.')
  }

  if (order.paymentMethod !== 'card') {
    res.status(400)
    throw new Error('Bu siparis kart ile odeme icin olusturulmamis.')
  }

  if (order.isPaid) {
    res.status(400)
    throw new Error('Bu siparis zaten odenmis.')
  }

  if (inFlightPayments.has(orderId)) {
    return res.status(409).json({
      success: false,
      message: 'Bu siparis icin odeme islemi zaten devam ediyor. Lutfen birkac saniye sonra tekrar deneyin.',
    })
  }

  inFlightPayments.add(orderId)

  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      res.status(404)
      throw new Error('Kullanici bulunamadi.')
    }

    const {
      merchantId,
      merchantKey,
      merchantSalt,
      isTestMode,
      noInstallment,
      maxInstallment,
      currency,
      timeoutLimit,
      debugOn,
    } = getPaytrConfig()

    const clientUrl = resolveClientUrl()
    const merchantOid = order._id.toString()
    const userIp = getClientIp(req)
    const email = user.email
    const { basketBase64, paymentAmount } = buildBasketForPaytr(order)

    const merchantOkUrlBase = process.env.PAYTR_MERCHANT_OK_URL || `${clientUrl}/order-success`
    const merchantFailUrlBase = process.env.PAYTR_MERCHANT_FAIL_URL || `${clientUrl}/checkout`
    const merchantOkUrl = buildRedirectUrlWithOrder(merchantOkUrlBase, order._id.toString(), 'success')
    const merchantFailUrl = buildRedirectUrlWithOrder(merchantFailUrlBase, order._id.toString(), 'failed')

    const paytrToken = buildPaytrToken({
      merchantId,
      merchantKey,
      merchantSalt,
      userIp,
      merchantOid,
      email,
      paymentAmount,
      userBasket: basketBase64,
      noInstallment,
      maxInstallment,
      currency,
      testMode: isTestMode ? '1' : '0',
    })

    const token = await requestPaytrToken({
      merchant_id: merchantId,
      user_ip: userIp,
      merchant_oid: merchantOid,
      email,
      payment_amount: String(paymentAmount),
      paytr_token: paytrToken,
      user_basket: basketBase64,
      debug_on: debugOn,
      no_installment: noInstallment,
      max_installment: maxInstallment,
      user_name: order.shippingAddress?.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Musteri',
      user_address: `${order.shippingAddress?.address || ''} ${order.shippingAddress?.district || ''} ${order.shippingAddress?.city || ''}`.trim(),
      user_phone: normalizePhoneForPaytr(order.shippingAddress?.phone || user.phone),
      merchant_ok_url: merchantOkUrl,
      merchant_fail_url: merchantFailUrl,
      timeout_limit: String(timeoutLimit),
      currency,
      test_mode: isTestMode ? '1' : '0',
      lang: 'tr',
    })

    order.paymentResult = {
      ...(order.paymentResult || {}),
      id: merchantOid,
      status: 'pending',
      paytrToken: token,
      requestedAt: Date.now(),
    }
    order.statusHistory.push({
      status: order.status,
      note: 'PayTR odeme oturumu olusturuldu.',
    })
    await order.save()

    return res.status(200).json({
      success: true,
      message: 'PayTR odeme sayfasi hazir.',
      data: {
        paymentId: merchantOid,
        orderNo: order.orderNo,
        status: order.status,
        token,
        paymentPageUrl: `https://www.paytr.com/odeme/guvenli/${token}`,
      },
    })
  } finally {
    inFlightPayments.delete(orderId)
  }
}

// @desc    PayTR callback
// @route   POST /api/payment/paytr/callback
// @access  Public
export const handlePaytrCallback = async (req, res) => {
  ensurePaytrConfig()

  const {
    merchant_oid: merchantOid,
    status,
    total_amount: totalAmount,
    hash,
    failed_reason_code: failedReasonCode,
    failed_reason_msg: failedReasonMsg,
  } = req.body || {}

  if (!merchantOid || !status || !totalAmount || !hash) {
    return res.status(400).send('BAD_REQUEST')
  }

  if (!verifyCallbackHash({ merchantOid, status, totalAmount, hash })) {
    return res.status(403).send('INVALID_HASH')
  }

  const order = await Order.findById(merchantOid)
  if (!order) {
    return res.status(200).send('OK')
  }

  if (status === 'success') {
    if (!order.isPaid) {
      order.isPaid = true
      order.paidAt = Date.now()
      order.paymentResult = {
        ...(order.paymentResult || {}),
        id: merchantOid,
        status: 'success',
        paidAt: Date.now(),
        totalAmount: Number(totalAmount) / 100,
      }
      order.statusHistory.push({
        status: order.status,
        note: `PayTR odeme alindi. Tutar: ${(Number(totalAmount) / 100).toFixed(2)} TL`,
      })
      await order.save()
    }

    return res.status(200).send('OK')
  }

  if (!order.isPaid && order.status !== 'İptal') {
    order.status = 'İptal'
    order.paymentResult = {
      ...(order.paymentResult || {}),
      id: merchantOid,
      status: 'failed',
      failedReasonCode,
      failedReasonMsg,
      failedAt: Date.now(),
    }
    order.statusHistory.push({
      status: 'İptal',
      note: `PayTR odeme basarisiz. Kod: ${failedReasonCode || '-'} Mesaj: ${failedReasonMsg || '-'}`,
    })

    await bulkAdjustStock(order.items, 'increase')
    await rollbackCouponUsage(order.coupon)
    await order.save()
  }

  return res.status(200).send('OK')
}

// @desc    Iade islemi
// @route   POST /api/payment/refund
// @access  Admin
export const refundPayment = async (req, res) => {
  return res.status(501).json({
    success: false,
    message: 'PayTR iade islemi bu panelde otomatik acik degil. Iadeyi PayTR panelinden yapip siparis durumunu manuel guncelleyin.',
  })
}

const isMongoId = (value = '') => /^[a-f\d]{24}$/i.test(String(value))

// @desc    Odeme durumu sorgula
// @route   GET /api/payment/:paymentId
// @access  Admin
export const getPaymentDetail = async (req, res) => {
  const { paymentId } = req.params

  const orQuery = [{ 'paymentResult.id': paymentId }]
  if (isMongoId(paymentId)) {
    orQuery.push({ _id: paymentId })
  }

  const order = await Order.findOne({ $or: orQuery })
    .select('orderNo isPaid paidAt status paymentResult totalPrice createdAt')
    .lean()

  if (!order) {
    res.status(404)
    throw new Error('Odeme kaydi bulunamadi.')
  }

  return res.status(200).json({
    success: true,
    data: {
      paymentId,
      orderId: order._id,
      orderNo: order.orderNo,
      isPaid: order.isPaid,
      paidAt: order.paidAt,
      status: order.status,
      totalPrice: order.totalPrice,
      paymentResult: order.paymentResult || null,
      createdAt: order.createdAt,
    },
  })
}