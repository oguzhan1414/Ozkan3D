import crypto from 'crypto'
import { supabase } from '../config/supabase.js'
import { must, isUuid } from '../utils/db.js'
import {
  findOrderRow,
  updateOrderRow,
  historyEntry,
  adjustStock,
  rollbackCouponUsage,
} from '../services/orderService.js'

// Not: Serverless ortamda bu set sadece aynı instance içindeki çift tıklamaları engeller.
const inFlightPayments = new Set()

// PayTR merchant_oid sadece alfanumerik kabul eder: UUID tirelerini kaldır / geri ekle
const toMerchantOid = (orderId) => String(orderId).replace(/-/g, '')
const fromMerchantOid = (oid) => {
  const hex = String(oid || '').toLowerCase()
  if (!/^[0-9a-f]{32}$/.test(hex)) return null
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
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

// order: DB satırı (items JSONB, total_price)
const buildBasketForPaytr = (order) => {
  const baseItems = (order.items || []).map((item, index) => ({
    name: item.name || `Urun-${index + 1}`,
    amount: normalizeMoney((Number(item.price) || 0) * (Number(item.quantity) || 1)),
  }))

  const baseTotal = normalizeMoney(baseItems.reduce((sum, item) => sum + item.amount, 0))
  const targetTotal = normalizeMoney(order.total_price)

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

  const order = await findOrderRow(orderId)

  if (!order) {
    res.status(404)
    throw new Error('Siparis bulunamadi.')
  }

  if (order.user_id !== req.user._id) {
    res.status(403)
    throw new Error('Bu siparis icin odeme yetkiniz yok.')
  }

  if (order.payment_method !== 'card') {
    res.status(400)
    throw new Error('Bu siparis kart ile odeme icin olusturulmamis.')
  }

  if (order.status === 'İptal') {
    res.status(400)
    throw new Error('Iptal edilmis siparis icin odeme yapilamaz.')
  }

  if (order.is_paid) {
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
    const user = req.user

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
    const merchantOid = toMerchantOid(order.id)
    const userIp = getClientIp(req)
    const email = user.email
    const { basketBase64, paymentAmount } = buildBasketForPaytr(order)

    const merchantOkUrlBase = process.env.PAYTR_MERCHANT_OK_URL || `${clientUrl}/order-success`
    const merchantFailUrlBase = process.env.PAYTR_MERCHANT_FAIL_URL || `${clientUrl}/checkout`
    const merchantOkUrl = buildRedirectUrlWithOrder(merchantOkUrlBase, order.id, 'success')
    const merchantFailUrl = buildRedirectUrlWithOrder(merchantFailUrlBase, order.id, 'failed')

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
      user_name: order.shipping_address?.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Musteri',
      user_address: `${order.shipping_address?.address || ''} ${order.shipping_address?.district || ''} ${order.shipping_address?.city || ''}`.trim(),
      user_phone: normalizePhoneForPaytr(order.shipping_address?.phone || user.phone),
      merchant_ok_url: merchantOkUrl,
      merchant_fail_url: merchantFailUrl,
      timeout_limit: String(timeoutLimit),
      currency,
      test_mode: isTestMode ? '1' : '0',
      lang: 'tr',
    })

    await updateOrderRow(order.id, {
      payment_result: {
        ...(order.payment_result || {}),
        id: merchantOid,
        status: 'pending',
        paytrToken: token,
        requestedAt: new Date().toISOString(),
      },
      status_history: [
        ...(order.status_history || []),
        historyEntry(order.status, 'PayTR odeme oturumu olusturuldu.'),
      ],
    }, 'id')

    return res.status(200).json({
      success: true,
      message: 'PayTR odeme sayfasi hazir.',
      data: {
        paymentId: merchantOid,
        orderNo: order.order_no,
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

  const orderId = fromMerchantOid(merchantOid)
  const order = orderId ? await findOrderRow(orderId) : null
  if (!order) {
    return res.status(200).send('OK')
  }

  const amountTl = Number(totalAmount) / 100
  const now = new Date().toISOString()

  if (status === 'success') {
    if (!order.is_paid) {
      // Koşullu güncelleme: PayTR aynı callback'i tekrar gönderirse çift işlenmez
      must(
        await supabase
          .from('orders')
          .update({
            is_paid: true,
            paid_at: now,
            payment_result: {
              ...(order.payment_result || {}),
              id: merchantOid,
              status: 'success',
              paidAt: now,
              totalAmount: amountTl,
            },
            status_history: [
              ...(order.status_history || []),
              historyEntry(order.status, `PayTR odeme alindi. Tutar: ${amountTl.toFixed(2)} TL`),
            ],
          })
          .eq('id', order.id)
          .eq('is_paid', false)
      )
    }

    return res.status(200).send('OK')
  }

  if (!order.is_paid && order.status !== 'İptal') {
    const cancelled = must(
      await supabase
        .from('orders')
        .update({
          status: 'İptal',
          payment_result: {
            ...(order.payment_result || {}),
            id: merchantOid,
            status: 'failed',
            failedReasonCode,
            failedReasonMsg,
            failedAt: now,
          },
          status_history: [
            ...(order.status_history || []),
            historyEntry('İptal', `PayTR odeme basarisiz. Kod: ${failedReasonCode || '-'} Mesaj: ${failedReasonMsg || '-'}`),
          ],
        })
        .eq('id', order.id)
        .eq('is_paid', false)
        .neq('status', 'İptal')
        .select('id')
    )

    // Stok ve kupon sadece bu istek siparişi gerçekten iptal ettiyse geri alınır
    if (cancelled.length > 0) {
      await adjustStock(order.items, 1)
      await rollbackCouponUsage(order.coupon_id)
    }
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

// @desc    Odeme durumu sorgula
// @route   GET /api/payment/:paymentId
// @access  Admin
export const getPaymentDetail = async (req, res) => {
  const { paymentId } = req.params

  // paymentId: PayTR merchant_oid (tiresiz uuid) veya sipariş id'si
  const orderId = isUuid(paymentId) ? paymentId : fromMerchantOid(paymentId)
  const order = orderId
    ? await findOrderRow(orderId, 'id, order_no, is_paid, paid_at, status, payment_result, total_price, created_at')
    : null

  if (!order) {
    res.status(404)
    throw new Error('Odeme kaydi bulunamadi.')
  }

  return res.status(200).json({
    success: true,
    data: {
      paymentId,
      orderId: order.id,
      orderNo: order.order_no,
      isPaid: order.is_paid,
      paidAt: order.paid_at,
      status: order.status,
      totalPrice: order.total_price,
      paymentResult: order.payment_result || null,
      createdAt: order.created_at,
    },
  })
}
