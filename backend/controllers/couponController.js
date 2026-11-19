import { supabase } from '../config/supabase.js'
import { must, toApi, toApiList, toDb, isUuid } from '../utils/db.js'
import { findCouponRowByCode, couponIsValid, couponDiscount, couponUserCheck } from '../services/couponService.js'

const COUPON_FIELDS = [
  'code', 'type', 'value', 'minOrder', 'maxUse', 'perUserLimit',
  'startDate', 'endDate', 'status', 'description',
]

// Türkiye saati (UTC+3). "2026-12-31" bitiş tarihi gün sonuna kadar geçerli olmalı.
const trDayBoundary = (value, end) => {
  if (!value) return null
  const v = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T${end ? '23:59:59' : '00:00:00'}+03:00`
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** Gövdeyi doğrular; hata varsa mesaj fırlatır */
const buildCouponFields = (body, res, current = null) => {
  const fields = toDb(body, COUPON_FIELDS)
  const fail = (msg) => {
    res.status(400)
    throw new Error(msg)
  }

  if (fields.code !== undefined) {
    fields.code = String(fields.code).trim().toUpperCase().replace(/\s+/g, '')
    if (!/^[A-Z0-9_-]{3,30}$/.test(fields.code)) fail('Kupon kodu 3-30 karakter olmalı; harf, rakam, - ve _ kullanılabilir.')
  }
  if (fields.type !== undefined && !['percent', 'fixed', 'shipping'].includes(fields.type)) fail('Geçersiz kupon türü.')
  if ('start_date' in fields) fields.start_date = trDayBoundary(fields.start_date, false)
  if ('end_date' in fields) fields.end_date = trDayBoundary(fields.end_date, true)
  for (const key of ['value', 'min_order']) {
    if (key in fields) fields[key] = Math.max(0, Math.round((Number(fields[key]) || 0) * 100) / 100)
  }
  for (const key of ['max_use', 'per_user_limit']) {
    if (key in fields) fields[key] = Math.max(0, Math.trunc(Number(fields[key]) || 0))
  }
  if (fields.status !== undefined && !['Aktif', 'Pasif'].includes(fields.status)) fail('Geçersiz durum.')
  if (fields.description !== undefined) fields.description = String(fields.description || '').trim().slice(0, 200) || null

  const type = fields.type ?? current?.type
  const value = fields.value ?? Number(current?.value)
  if (type === 'shipping') fields.value = 0
  else if (type === 'percent' && (value <= 0 || value > 100)) fail('Yüzde indirim 1 ile 100 arasında olmalı.')
  else if (type === 'fixed' && value <= 0) fail('İndirim tutarı 0’dan büyük olmalı.')

  const start = fields.start_date ?? current?.start_date
  const end = fields.end_date ?? current?.end_date
  if (start && end && new Date(start) > new Date(end)) fail('Bitiş tarihi başlangıçtan önce olamaz.')

  return fields
}

// @desc    Tüm kuponları getir (kullanım istatistiğiyle)
// @route   GET /api/coupons
// @access  Admin
export const getCoupons = async (req, res) => {
  const rows = must(await supabase.from('coupons').select('*').order('created_at', { ascending: false }))

  // Kuponla gelen ciro ve verilen toplam indirim (iptaller hariç)
  const ids = rows.map((r) => r.id)
  const stats = new Map()
  if (ids.length) {
    const orders = must(await supabase
      .from('orders')
      .select('coupon_id, discount, total_price, is_paid, status')
      .in('coupon_id', ids)
      .neq('status', 'İptal'))
    for (const o of orders) {
      const s = stats.get(o.coupon_id) || { orders: 0, discountTotal: 0, revenue: 0 }
      s.orders += 1
      s.discountTotal += Number(o.discount) || 0
      if (o.is_paid) s.revenue += Number(o.total_price) || 0
      stats.set(o.coupon_id, s)
    }
  }

  res.status(200).json({
    success: true,
    count: rows.length,
    data: rows.map((r) => ({ ...toApi(r), stats: stats.get(r.id) || { orders: 0, discountTotal: 0, revenue: 0 } })),
  })
}

// @desc    Kupon oluştur
// @route   POST /api/coupons
// @access  Admin
export const createCoupon = async (req, res) => {
  if (!req.body.code || !String(req.body.code).trim()) {
    res.status(400)
    throw new Error('Kupon kodu zorunludur.')
  }
  const fields = buildCouponFields({ type: 'percent', ...req.body }, res)

  if (await findCouponRowByCode(fields.code)) {
    res.status(400)
    throw new Error(`"${fields.code}" kodu zaten kullanılıyor.`)
  }

  const row = must(await supabase.from('coupons').insert(fields).select('*').single())
  res.status(201).json({ success: true, data: { ...toApi(row), stats: { orders: 0, discountTotal: 0, revenue: 0 } } })
}

// @desc    Kupon güncelle
// @route   PUT /api/coupons/:id
// @access  Admin
export const updateCoupon = async (req, res) => {
  const current = isUuid(req.params.id)
    ? must(await supabase.from('coupons').select('*').eq('id', req.params.id).maybeSingle())
    : null
  if (!current) {
    res.status(404)
    throw new Error('Kupon bulunamadı.')
  }

  // "used" sayacı siparişlerden yönetilir; formdan değiştirilemez
  const { used, ...body } = req.body // eslint-disable-line no-unused-vars
  const fields = buildCouponFields(body, res, current)

  if (fields.code && fields.code !== current.code) {
    const clash = await findCouponRowByCode(fields.code)
    if (clash) {
      res.status(400)
      throw new Error(`"${fields.code}" kodu zaten kullanılıyor.`)
    }
  }

  const row = must(await supabase.from('coupons').update(fields).eq('id', current.id).select('*').single())
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

// @desc    Kupon doğrula (sepette)
// @route   POST /api/coupons/validate
// @access  Public (giriş yapılmışsa kişi başı sınır da kontrol edilir)
export const validateCoupon = async (req, res) => {
  const { code, orderTotal } = req.body

  if (!code) {
    res.status(400)
    throw new Error('Kupon kodu zorunludur.')
  }

  const coupon = await findCouponRowByCode(code)

  if (!coupon) {
    res.status(404)
    throw new Error('Bu kupon kodu geçerli değil.')
  }

  for (const result of [couponIsValid(coupon, orderTotal || 0), await couponUserCheck(coupon, req.user?._id)]) {
    if (!result.valid) {
      res.status(400)
      throw new Error(result.message)
    }
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
