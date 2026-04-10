import Iyzipay from 'iyzipay'
import Order from '../models/Order.js'
import User from '../models/User.js'

const inFlightPayments = new Set()
const TR_IDENTITY_REGEX = /^\d{11}$/
const TR_GSM_REGEX = /^\+90\d{10}$/

const getIyzipay = () => {
  return new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY,
    secretKey: process.env.IYZICO_SECRET_KEY,
    uri: process.env.IYZICO_BASE_URL,
  })
}

const ensureIyziConfig = () => {
  if (!process.env.IYZICO_API_KEY || !process.env.IYZICO_SECRET_KEY || !process.env.IYZICO_BASE_URL) {
    throw new Error('iyzico yapılandırması eksik. IYZICO_API_KEY, IYZICO_SECRET_KEY ve IYZICO_BASE_URL .env içinde olmalı.')
  }
}

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  return req.ip || '127.0.0.1'
}

const normalizeGsmNumber = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '')

  if (digits.length === 12 && digits.startsWith('90')) {
    return `+${digits}`
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return `+90${digits.slice(1)}`
  }

  if (digits.length === 10) {
    return `+90${digits}`
  }

  return null
}

const normalizeIdentityNumber = (value = '') => {
  return String(value).replace(/\D/g, '')
}

const iyziPaymentCreate = (iyzipay, request) => new Promise((resolve, reject) => {
  iyzipay.payment.create(request, (err, result) => {
    if (err) return reject(err)
    resolve(result)
  })
})

const iyziRefundCreate = (iyzipay, request) => new Promise((resolve, reject) => {
  iyzipay.refund.create(request, (err, result) => {
    if (err) return reject(err)
    resolve(result)
  })
})

const iyziPaymentRetrieve = (iyzipay, request) => new Promise((resolve, reject) => {
  iyzipay.payment.retrieve(request, (err, result) => {
    if (err) return reject(err)
    resolve(result)
  })
})

const roundMoney = (value) => Number(Number(value || 0).toFixed(2))

const buildBasketItemsForIyzi = (order) => {
  const baseItems = order.items.map((item, index) => ({
    id: item.product?._id?.toString() || `${order._id}-${index + 1}`,
    name: item.name,
    amount: roundMoney((Number(item.price) || 0) * (Number(item.quantity) || 1)),
  }))

  const baseTotal = roundMoney(baseItems.reduce((sum, item) => sum + item.amount, 0))
  const targetTotal = roundMoney(order.totalPrice)

  if (baseItems.length === 0 || baseTotal <= 0 || targetTotal <= 0) {
    throw new Error('Ödeme kalemleri oluşturulamadı. Sipariş tutarını kontrol edin.')
  }

  const ratio = targetTotal / baseTotal
  const distributedItems = []
  let distributedTotal = 0

  for (let i = 0; i < baseItems.length; i += 1) {
    const item = baseItems[i]

    if (i === baseItems.length - 1) {
      let lastAmount = roundMoney(targetTotal - distributedTotal)
      if (lastAmount <= 0) {
        lastAmount = 0.01
      }

      distributedItems.push({
        id: item.id,
        name: item.name,
        price: lastAmount,
      })
      continue
    }

    const calculated = roundMoney(item.amount * ratio)
    const safeAmount = Math.max(0.01, calculated)

    distributedItems.push({
      id: item.id,
      name: item.name,
      price: safeAmount,
    })
    distributedTotal = roundMoney(distributedTotal + safeAmount)
  }

  const finalSum = roundMoney(distributedItems.reduce((sum, item) => sum + item.price, 0))
  const correction = roundMoney(targetTotal - finalSum)

  if (correction !== 0) {
    const lastIndex = distributedItems.length - 1
    distributedItems[lastIndex].price = roundMoney(distributedItems[lastIndex].price + correction)
  }

  return distributedItems.map((item) => ({
    id: item.id,
    name: item.name,
    category1: 'Koleksiyon',
    itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
    price: roundMoney(item.price).toFixed(2),
  }))
}

// @desc    Ödeme başlat
// @route   POST /api/payment/create
// @access  Private
export const createPayment = async (req, res) => {
  const { orderId, cardDetails, buyerInfo } = req.body

  if (!orderId) {
    res.status(400)
    throw new Error('orderId zorunludur.')
  }

  if (!cardDetails) {
    res.status(400)
    throw new Error('Kart bilgileri zorunludur.')
  }

  if (!buyerInfo?.identityNumber || !buyerInfo?.gsmNumber) {
    res.status(400)
    throw new Error('Ödeme için TC kimlik no ve telefon bilgisi zorunludur.')
  }

  const {
    cardNumber,
    cardHolderName,
    expireMonth,
    expireYear,
    cvc,
    installment = 1,
  } = cardDetails

  if (!cardNumber || !cardHolderName || !expireMonth || !expireYear || !cvc) {
    res.status(400)
    throw new Error('Kart bilgileri eksik.')
  }

  const normalizedIdentityNumber = normalizeIdentityNumber(buyerInfo.identityNumber)
  if (!TR_IDENTITY_REGEX.test(normalizedIdentityNumber) || /^(\d)\1{10}$/.test(normalizedIdentityNumber)) {
    res.status(400)
    throw new Error('Geçerli bir 11 haneli TC kimlik numarası giriniz.')
  }

  const normalizedBuyerGsm = normalizeGsmNumber(buyerInfo.gsmNumber)
  if (!normalizedBuyerGsm || !TR_GSM_REGEX.test(normalizedBuyerGsm)) {
    res.status(400)
    throw new Error('Telefon numarası +90XXXXXXXXXX formatında olmalıdır.')
  }

  ensureIyziConfig()

  const order = await Order.findById(orderId).populate('items.product', 'name')

  if (!order) {
    res.status(404)
    throw new Error('Sipariş bulunamadı.')
  }

  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403)
    throw new Error('Bu sipariş için ödeme yetkiniz yok.')
  }

  if (order.paymentMethod !== 'card') {
    res.status(400)
    throw new Error('Bu sipariş kartla ödeme için oluşturulmamış.')
  }

  if (order.isPaid) {
    res.status(400)
    throw new Error('Bu sipariş zaten ödenmiş.')
  }

  if (inFlightPayments.has(orderId)) {
    return res.status(409).json({
      success: false,
      message: 'Bu sipariş için ödeme işlemi zaten devam ediyor. Lütfen birkaç saniye sonra tekrar deneyin.',
    })
  }

  inFlightPayments.add(orderId)

  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      res.status(404)
      throw new Error('Kullanıcı bulunamadı.')
    }

    const cleanCardNumber = String(cardNumber).replace(/\s/g, '')
    const cleanMonth = String(expireMonth).padStart(2, '0')
    const cleanYear = String(expireYear)
    const cleanCvc = String(cvc)
    const safeInstallment = String(Number(installment) > 1 ? Number(installment) : 1)

    let basketItems
    try {
      basketItems = buildBasketItemsForIyzi(order)
    } catch (err) {
      res.status(400)
      throw new Error(err.message)
    }

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: order._id.toString(),
      price: order.totalPrice.toFixed(2),
      paidPrice: order.totalPrice.toFixed(2),
      currency: Iyzipay.CURRENCY.TRY,
      installment: safeInstallment,
      basketId: order.orderNo,
      paymentChannel: Iyzipay.PAYMENT_CHANNEL.WEB,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,

      paymentCard: {
        cardHolderName,
        cardNumber: cleanCardNumber,
        expireMonth: cleanMonth,
        expireYear: cleanYear,
        cvc: cleanCvc,
        registerCard: '0',
      },

      buyer: {
        id: user._id.toString(),
        name: user.firstName || 'Müşteri',
        surname: user.lastName || 'Kullanıcı',
        gsmNumber: normalizedBuyerGsm,
        email: user.email,
        identityNumber: normalizedIdentityNumber,
        registrationAddress: order.shippingAddress?.address || 'Adres bilgisi yok',
        ip: getClientIp(req),
        city: order.shippingAddress?.city || 'Bilinmiyor',
        country: 'Turkey',
      },

      shippingAddress: {
        contactName: order.shippingAddress?.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        city: order.shippingAddress?.city || 'Bilinmiyor',
        country: 'Turkey',
        address: order.shippingAddress?.address || 'Adres bilgisi yok',
      },

      billingAddress: {
        contactName: order.shippingAddress?.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        city: order.shippingAddress?.city || 'Bilinmiyor',
        country: 'Turkey',
        address: order.shippingAddress?.address || 'Adres bilgisi yok',
      },

      basketItems,
    }

    let result
    try {
      result = await iyziPaymentCreate(getIyzipay(), request)
    } catch (err) {
      res.status(500)
      throw new Error(`Ödeme servisi hatası: ${err.message}`)
    }

    if (result.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: result.errorMessage || 'Ödeme başarısız.',
        errorCode: result.errorCode,
      })
    }

    const itemTransactions = Array.isArray(result.itemTransactions)
      ? result.itemTransactions.map((tx) => ({
          paymentTransactionId: tx.paymentTransactionId,
          paidPrice: tx.paidPrice,
        }))
      : []

    order.isPaid = true
    order.paidAt = Date.now()
    order.paymentResult = {
      id: result.paymentId,
      status: result.status,
      paidAt: Date.now(),
      paymentTransactionId: itemTransactions[0]?.paymentTransactionId,
      itemTransactions,
    }

    order.statusHistory.push({
      status: order.status,
      note: `Odeme alindi. Uretim planlamasina alindi. iyzico Payment ID: ${result.paymentId}`,
    })

    await order.save()

    return res.status(200).json({
      success: true,
      message: 'Ödeme başarılı!',
      data: {
        paymentId: result.paymentId,
        orderNo: order.orderNo,
        status: order.status,
      },
    })
  } finally {
    inFlightPayments.delete(orderId)
  }
}

// @desc    İade işlemi
// @route   POST /api/payment/refund
// @access  Admin
export const refundPayment = async (req, res) => {
  const { orderId, reason } = req.body

  ensureIyziConfig()

  const order = await Order.findById(orderId)

  if (!order) {
    res.status(404)
    throw new Error('Sipariş bulunamadı.')
  }

  if (!order.isPaid) {
    res.status(400)
    throw new Error('Bu sipariş ödenmemiş, iade yapılamaz.')
  }

  if (!order.paymentResult?.id) {
    res.status(400)
    throw new Error('Ödeme ID bulunamadı.')
  }

  const transactions =
    order.paymentResult?.itemTransactions?.length > 0
      ? order.paymentResult.itemTransactions
      : order.paymentResult?.paymentTransactionId
        ? [{
            paymentTransactionId: order.paymentResult.paymentTransactionId,
            paidPrice: order.totalPrice,
          }]
        : []

  if (transactions.length === 0) {
    res.status(400)
    throw new Error('İade için ödeme transaction bilgisi bulunamadı.')
  }

  const iyzipay = getIyzipay()
  const results = []

  for (const tx of transactions) {
    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: order._id.toString(),
      paymentTransactionId: tx.paymentTransactionId,
      price: Number(tx.paidPrice || order.totalPrice).toFixed(2),
      currency: Iyzipay.CURRENCY.TRY,
      ip: getClientIp(req),
    }

    let result
    try {
      result = await iyziRefundCreate(iyzipay, request)
    } catch (err) {
      res.status(500)
      throw new Error(`İade servisi hatası: ${err.message}`)
    }

    if (result.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: result.errorMessage || 'İade başarısız.',
      })
    }

    results.push(result)
  }

  order.status = 'İptal'
  order.statusHistory.push({
    status: 'İptal',
    note: `İade yapıldı. Sebep: ${reason || 'Belirtilmedi'}`,
  })
  await order.save()

  return res.status(200).json({
    success: true,
    message: 'İade başarıyla gerçekleşti.',
    data: results,
  })
}

// @desc    Ödeme durumu sorgula
// @route   GET /api/payment/:paymentId
// @access  Admin
export const getPaymentDetail = async (req, res) => {
  ensureIyziConfig()

  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: 'query',
    paymentId: req.params.paymentId,
  }

  let result
  try {
    result = await iyziPaymentRetrieve(getIyzipay(), request)
  } catch (err) {
    res.status(500)
    throw new Error(`Ödeme sorgu hatası: ${err.message}`)
  }

  return res.status(200).json({ success: true, data: result })
}