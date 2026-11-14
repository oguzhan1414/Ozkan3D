import { supabase } from '../config/supabase.js'
import { must, toApi, toApiList, toDb, isUuid } from '../utils/db.js'
import { findCouponRowByCode, couponIsValid, couponDiscount } from '../services/couponService.js'

const COUPON_FIELDS = [
  'code', 'type', 'value', 'minOrder', 'maxUse', 'used',
  'startDate', 'endDate', 'status', 'description',
]

const buildCouponFields = (body) => {
  const fields = toDb(body, COUPON_FIELDS)
  if (fields.code !== undefined) fields.code = String(fields.code).trim().toUpperCase()
  // Boş tarih alanları null olsun ("" Postgres'te geçersiz)
  for (const key of ['start_date', 'end_date']) {
    if (key in fields && !fields[key]) fields[key] = null
  }
  for (const key of ['value', 'min_order']) {
    if (key in fields) fields[key] = Number(fields[key]) || 0
  }
  for (const key of ['max_use', 'used']) {
    if (key in fields) fields[key] = Math.max(0, Math.trunc(Number(fields[key]) || 0))
  }
  return fields
}

// @desc    Tüm kuponları getir
// @route   GET /api/coupons
// @access  Admin
export const getCoupons = async (req, res) => {
  const rows = must(await supabase.from('coupons').select('*').order('created_at', { ascending: false }))
  res.status(200).json({ success: true, count: rows.length, data: toApiList(rows) })
}

// @desc    Kupon oluştur
// @route   POST /api/coupons
// @access  Admin
export const createCoupon = async (req, res) => {
  if (!req.body.code || !String(req.body.code).trim()) {
    res.status(400)
    throw new Error('Kupon kodu zorunludur')
  }

  if (await findCouponRowByCode(req.body.code)) {
    res.status(400)
    throw new Error('Bu kupon kodu zaten mevcut.')
  }

  const row = must(await supabase.from('coupons').insert(buildCouponFields(req.body)).select('*').single())
  res.status(201).json({ success: true, data: toApi(row) })
}

// @desc    Kupon güncelle
// @route   PUT /api/coupons/:id
// @access  Admin
export const updateCoupon = async (req, res) => {
  const row = isUuid(req.params.id)
    ? must(
        await supabase
          .from('coupons')
          .update(buildCouponFields(req.body))
          .eq('id', req.params.id)
          .select('*')
          .maybeSingle()
      )
    : null

  if (!row) {
    res.status(404)
    throw new Error('Kupon bulunamadı.')
  }

  res.status(200).json({ success: true, data: toApi(row) })
}

// @desc    Kupon sil
// @route   DELETE /api/coupons/:id
// @access  Admin
export const deleteCoupon = async (req, res) => {
  const deleted = isUuid(req.params.id)
    ? must(await supabase.from('coupons').delete().eq('id', req.params.id).select('id'))
    : []

  if (deleted.length === 0) {
    res.status(404)
    throw new Error('Kupon bulunamadı.')
  }

  res.status(200).json({ success: true, message: 'Kupon silindi.' })
}

// @desc    Kupon doğrula
// @route   POST /api/coupons/validate
// @access  Public
export const validateCoupon = async (req, res) => {
  const { code, orderTotal } = req.body

  if (!code) {
    res.status(400)
    throw new Error('Kupon kodu zorunludur.')
  }

  const coupon = await findCouponRowByCode(code)

  if (!coupon) {
    res.status(404)
    throw new Error('Kupon bulunamadı.')
  }

  const result = couponIsValid(coupon, orderTotal || 0)

  if (!result.valid) {
    res.status(400)
    throw new Error(result.message)
  }

  res.status(200).json({
    success: true,
    data: {
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      discount: couponDiscount(coupon, orderTotal || 0),
      freeShipping: coupon.type === 'shipping',
    },
  })
}
