import { supabase } from '../config/supabase.js'
import { must } from '../utils/db.js'

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

export const findCouponRowByCode = async (code) => {
  const normalized = String(code || '').trim().toUpperCase()
  if (!normalized) return null
  return must(await supabase.from('coupons').select('*').eq('code', normalized).maybeSingle())
}

/** Kupon şu an ve bu tutar için geçerli mi? row: DB satırı */
export const couponIsValid = (row, orderTotal) => {
  const now = new Date()
  const total = Number(orderTotal) || 0

  if (row.status !== 'Aktif') return { valid: false, message: 'Bu kupon şu an kullanılamıyor.' }
  if (row.start_date && now < new Date(row.start_date)) return { valid: false, message: 'Kupon henüz başlamadı.' }
  if (row.end_date && now > new Date(row.end_date)) return { valid: false, message: 'Kuponun süresi dolmuş.' }
  if (row.max_use > 0 && row.used >= row.max_use) return { valid: false, message: 'Kupon kullanım limiti dolmuş.' }
  if (total < Number(row.min_order)) {
    return { valid: false, message: `Bu kupon ${Number(row.min_order)} ₺ ve üzeri siparişlerde geçerli.` }
  }
  return { valid: true }
}

/** Kişi başı sınır: kullanıcının bu kuponla verdiği (iptal edilmemiş) sipariş sayısı */
export const couponUserCheck = async (row, userId) => {
  if (!userId || !(row.per_user_limit > 0)) return { valid: true }
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('coupon_id', row.id)
    .eq('user_id', userId)
    .neq('status', 'İptal')
  must({ data: null, error })
  if ((count || 0) >= row.per_user_limit) {
    return {
      valid: false,
      message: row.per_user_limit === 1 ? 'Bu kuponu daha önce kullandın.' : `Bu kuponu en fazla ${row.per_user_limit} kez kullanabilirsin.`,
    }
  }
  return { valid: true }
}

/** İndirim tutarı (kuruş hassasiyetinde, sipariş tutarını geçmez) */
export const couponDiscount = (row, orderTotal) => {
  const total = Number(orderTotal) || 0
  const value = Number(row.value) || 0
  if (row.type === 'percent') return round2(Math.min(total, (total * Math.min(100, value)) / 100))
  if (row.type === 'fixed') return round2(Math.min(value, total))
  return 0 // 'shipping' -> kargo ücretsiz, indirim 0
}

export const adjustCouponUsage = async (couponId, delta) => {
  if (!couponId) return
  must(await supabase.rpc('increment_coupon_used', { p_coupon_id: couponId, p_delta: delta }))
}
