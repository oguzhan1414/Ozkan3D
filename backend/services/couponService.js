import { supabase } from '../config/supabase.js'
import { must } from '../utils/db.js'

export const findCouponRowByCode = async (code) => {
  const normalized = String(code || '').trim().toUpperCase()
  if (!normalized) return null
  return must(await supabase.from('coupons').select('*').eq('code', normalized).maybeSingle())
}

/** Eski Coupon.isValid() — row: DB satırı */
export const couponIsValid = (row, orderTotal) => {
  const now = new Date()
  const total = Number(orderTotal) || 0

  if (row.status !== 'Aktif') return { valid: false, message: 'Kupon aktif değil.' }
  if (row.start_date && now < new Date(row.start_date)) return { valid: false, message: 'Kupon henüz aktif değil.' }
  if (row.end_date && now > new Date(row.end_date)) return { valid: false, message: 'Kuponun süresi dolmuş.' }
  if (row.max_use > 0 && row.used >= row.max_use) return { valid: false, message: 'Kupon kullanım limiti dolmuş.' }
  if (total < Number(row.min_order)) {
    return { valid: false, message: `Bu kupon için minimum sipariş tutarı ${Number(row.min_order)}₺` }
  }
  return { valid: true }
}

/** Eski Coupon.calcDiscount() */
export const couponDiscount = (row, orderTotal) => {
  const total = Number(orderTotal) || 0
  const value = Number(row.value) || 0
  if (row.type === 'percent') return (total * value) / 100
  if (row.type === 'fixed') return Math.min(value, total)
  return 0 // 'shipping' -> kargo ücretsiz, indirim 0
}

export const adjustCouponUsage = async (couponId, delta) => {
  if (!couponId) return
  must(await supabase.rpc('increment_coupon_used', { p_coupon_id: couponId, p_delta: delta }))
}
