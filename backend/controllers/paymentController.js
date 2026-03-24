import Iyzipay from 'iyzipay'
import Order from '../models/Order.js'
import User from '../models/User.js'

const getIyzipay = () => {
  return new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY,
    secretKey: process.env.IYZICO_SECRET_KEY,
    uri: process.env.IYZICO_BASE_URL,
  })
}

// @desc    Ödeme başlat
// @route   POST /api/payment/create
// @access  Private
export const createPayment = async (req, res) => {
  const { orderId, cardDetails } = req.body

  const order = await Order.findById(orderId)
    .populate('items.product', 'name')

  if (!order) {
    res.status(404)
    throw new Error('Sipariş bulunamadı.')
  }

  if (order.isPaid) {
    res.status(400)
    throw new Error('Bu sipariş zaten ödenmiş.')
  }

  const user = await User.findById(req.user._id)

  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: order._id.toString(),
    price: order.totalPrice.toFixed(2),
    paidPrice: order.totalPrice.toFixed(2),
    currency: Iyzipay.CURRENCY.TRY,
    installment: '1',
    basketId: order.orderNo,
    paymentChannel: Iyzipay.PAYMENT_CHANNEL.WEB,
    paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,

    paymentCard: {
      cardHolderName: cardDetails.cardHolderName,
      cardNumber: cardDetails.cardNumber,
      expireMonth: cardDetails.expireMonth,
      expireYear: cardDetails.expireYear,
      cvc: cardDetails.cvc,
      registerCard: '0',
    },

    buyer: {
      id: user._id.toString(),
      name: user.firstName, // Not: User modelinde firstName/lastName yoksa buraları name.split(' ')[0] şeklinde ayarlaman gerekebilir.
      surname: user.lastName,
      gsmNumber: user.phone || '+905321234567',
      email: user.email,
      identityNumber: '11111111111',
      registrationAddress: order.shippingAddress.address,
      ip: req.ip || '85.34.78.112',
      city: order.shippingAddress.city,
      country: 'Turkey',
    },

    shippingAddress: {
      contactName: order.shippingAddress.fullName,
      city: order.shippingAddress.city,
      country: 'Turkey',
      address: order.shippingAddress.address,
    },

    billingAddress: {
      contactName: order.shippingAddress.fullName,
      city: order.shippingAddress.city,
      country: 'Turkey',
      address: order.shippingAddress.address,
    },

    basketItems: order.items.map((item, index) => ({
      id: item.product._id.toString(),
      name: item.name,
      category1: 'Koleksiyon',
      itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
      price: (item.price * item.quantity).toFixed(2),
    })),
  }

  // iyzipay. yerine doğrudan getIyzipay(). kullandık
  getIyzipay().payment.create(request, async (err, result) => {
    if (err) {
      res.status(500)
      throw new Error('Ödeme servisi hatası: ' + err.message)
    }

    if (result.status === 'success') {
      // Ödeme başarılı
      order.isPaid = true
      order.paidAt = Date.now()
      order.paymentResult = {
        id: result.paymentId,
        status: result.status,
        paidAt: Date.now(),
      }
      order.status = 'Basımda'
      
      // statusHistory array'i Order şemasına eklenmiş olmalı
      order.statusHistory.push({
        status: 'Basımda',
        note: `Ödeme alındı. iyzico Payment ID: ${result.paymentId}`,
      })

      await order.save()

      res.status(200).json({
        success: true,
        message: 'Ödeme başarılı!',
        data: {
          paymentId: result.paymentId,
          orderNo: order.orderNo,
          status: order.status,
        },
      })
    } else {
      res.status(400).json({
        success: false,
        message: result.errorMessage || 'Ödeme başarısız.',
        errorCode: result.errorCode,
      })
    }
  })
}

// @desc    İade işlemi
// @route   POST /api/payment/refund
// @access  Admin
export const refundPayment = async (req, res) => {
  const { orderId, reason } = req.body

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

  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: order._id.toString(),
    paymentTransactionId: order.paymentResult.id,
    price: order.totalPrice.toFixed(2),
    currency: Iyzipay.CURRENCY.TRY,
    ip: req.ip || '85.34.78.112',
  }

  // iyzipay. yerine doğrudan getIyzipay(). kullandık ve hatayı çözdük
  getIyzipay().refund.create(request, async (err, result) => {
    if (err) {
      res.status(500)
      throw new Error('İade servisi hatası: ' + err.message)
    }

    if (result.status === 'success') {
      order.status = 'İptal'
      order.statusHistory.push({
        status: 'İptal',
        note: `İade yapıldı. Sebep: ${reason || 'Belirtilmedi'}`,
      })
      await order.save()

      res.status(200).json({
        success: true,
        message: 'İade başarıyla gerçekleşti.',
        data: result,
      })
    } else {
      res.status(400).json({
        success: false,
        message: result.errorMessage || 'İade başarısız.',
      })
    }
  })
}

// @desc    Ödeme durumu sorgula
// @route   GET /api/payment/:paymentId
// @access  Admin
export const getPaymentDetail = async (req, res) => {
  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: 'query',
    paymentId: req.params.paymentId,
  }

  // iyzipay. yerine doğrudan getIyzipay(). kullandık
  getIyzipay().payment.retrieve(request, (err, result) => {
    if (err) {
      res.status(500)
      throw new Error('Ödeme sorgu hatası: ' + err.message)
    }

    res.status(200).json({ success: true, data: result })
  })
}