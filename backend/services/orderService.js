import { supabase } from '../config/supabase.js'
import { must, toApi, isUuid, newSubId } from '../utils/db.js'
import { adjustCouponUsage } from './couponService.js'

// Yorum yapabilmek / "satın aldı" sayılmak için geçerli durumlar
export const PURCHASED_STATUSES = [
  'Onaylandı', 'Basımda', 'Hazırlanıyor', 'Kargoya Verildi', 'Kargoda', 'Teslim Edildi',
]

export const findOrderRow = async (id, columns = '*') => {
  if (!isUuid(id)) return null
  return must(await supabase.from('orders').select(columns).eq('id', id).maybeSingle())
}

export const updateOrderRow = async (id, fields, columns = '*') =>
  must(await supabase.from('orders').update(fields).eq('id', id).select(columns).single())

export const historyEntry = (status, note) => ({
  _id: newSubId(),
  status,
  date: new Date().toISOString(),
  ...(note ? { note } : {}),
})

/** Stok düş (-1) / iade et (+1) — tek SQL ile atomik */
export const adjustStock = async (items, sign) => {
  if (!Array.isArray(items) || items.length === 0) return
  const payload = items
    .filter((i) => i?.product && Number(i.quantity) > 0)
    .map((i) => ({ product: String(i.product?._id || i.product), quantity: Number(i.quantity) }))
  if (payload.length === 0) return
  must(await supabase.rpc('adjust_stock', { p_items: payload, p_sign: sign }))
}

export const rollbackCouponUsage = (couponId) => adjustCouponUsage(couponId, -1)

/**
 * Sipariş/sepet kalemlerindeki `product` id'lerini ürün nesneleriyle değiştirir
 * (Mongo'daki .populate('items.product', ...) karşılığı).
 */
export const populateItemProducts = async (records, columns = 'id, name, images, slug') => {
  const list = Array.isArray(records) ? records : [records]
  const ids = [
    ...new Set(
      list.flatMap((r) => (r?.items || []).map((i) => i?.product)).filter((id) => isUuid(id))
    ),
  ]
  if (ids.length === 0) return records

  const products = must(await supabase.from('products').select(columns).in('id', ids))
  const map = new Map(products.map((p) => [p.id, toApi(p)]))

  for (const r of list) {
    if (!r?.items) continue
    r.items = r.items.map((item) => ({ ...item, product: map.get(item.product) || null }))
  }
  return records
}

export const hasPurchasedProduct = async (userId, productId) => {
  if (!isUuid(productId)) return null
  const rows = must(
    await supabase
      .from('orders')
      .select('id')
      .eq('user_id', userId)
      .contains('items', [{ product: productId }])
      .in('status', PURCHASED_STATUSES)
      .limit(1)
  )
  return rows[0] || null
}
