import Coupon from '../models/Coupon.js'

// @desc    Tüm kuponları getir
// @route   GET /api/coupons
// @access  Admin
export const getCoupons = async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 })
  res.status(200).json({ success: true, count: coupons.length, data: coupons })
}

// @desc    Kupon oluştur
// @route   POST /api/coupons
// @access  Admin
export const createCoupon = async (req, res) => {
  const existing = await Coupon.findOne({ code: req.body.code.toUpperCase() })
  if (existing) {
    res.status(400)
    throw new Error('Bu kupon kodu zaten mevcut.')
  }

  const coupon = await Coupon.create(req.body)
  res.status(201).json({ success: true, data: coupon })
}

// @desc    Kupon güncelle
// @route   PUT /api/coupons/:id
// @access  Admin
export const updateCoupon = async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  )

  if (!coupon) {
    res.status(404)
    throw new Error('Kupon bulunamadı.')
  }

  res.status(200).json({ success: true, data: coupon })
}

// @desc    Kupon sil
// @route   DELETE /api/coupons/:id
// @access  Admin
export const deleteCoupon = async (req, res) => {
  const coupon = await Coupon.findById(req.params.id)

  if (!coupon) {
    res.status(404)
    throw new Error('Kupon bulunamadı.')
  }

  await coupon.deleteOne()
  res.status(200).json({ success: true, message: 'Kupon silindi.' })
}

// @desc    Kupon doğrula
// @route   POST /api/coupons/validate
// @access  Private
export const validateCoupon = async (req, res) => {
  const { code, orderTotal } = req.body

  if (!code) {
    res.status(400)
    throw new Error('Kupon kodu zorunludur.')
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase() })

  if (!coupon) {
    res.status(404)
    throw new Error('Kupon bulunamadı.')
  }

  const result = coupon.isValid(orderTotal || 0)

  if (!result.valid) {
    res.status(400)
    throw new Error(result.message)
  }

  const discount = coupon.calcDiscount(orderTotal || 0)

  res.status(200).json({
    success: true,
    data: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount,
      freeShipping: coupon.type === 'shipping',
    },
  })
}