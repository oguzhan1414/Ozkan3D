import { supabase } from '../config/supabase.js'
import { must } from '../utils/db.js'

// Raporlar Türkiye saatine göre (UTC+3) hesaplanır; sunucu UTC çalışır.
const TR_OFFSET_MS = 3 * 60 * 60 * 1000
const DAY_MS = 86400000
const pad = (n) => String(n).padStart(2, '0')
const trDate = (d) => {
  const x = new Date(new Date(d).getTime() + TR_OFFSET_MS)
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`
}
const trStart = (ymd) => new Date(`${ymd}T00:00:00+03:00`)
const isYmd = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''))
const round2 = (n) => Math.round(n * 100) / 100

/** ?from=YYYY-MM-DD&to=YYYY-MM-DD (dahil). Varsayılan: son 30 gün. En fazla 2 yıl. */
const parseRange = (query) => {
  const today = trDate(new Date())
  const to = isYmd(query.to) ? query.to : today
  const from = isYmd(query.from) ? query.from : trDate(trStart(to).getTime() - 29 * DAY_MS)
  const start = trStart(from)
  const end = new Date(trStart(to).getTime() + DAY_MS) // ertesi gün 00:00 (hariç)
  if (start >= end) throw Object.assign(new Error('Başlangıç tarihi bitişten sonra olamaz.'), { status: 400 })
  if (end - start > 732 * DAY_MS) throw Object.assign(new Error('En fazla 2 yıllık rapor alınabilir.'), { status: 400 })
  return { from, to, start, end, days: Math.round((end - start) / DAY_MS) }
}

/** Aralıktaki siparişlerin hepsi (1000'erli sayfalarla) */
const fetchOrders = async (start, end, columns) => {
  const all = []
  for (let offset = 0; ; offset += 1000) {
    const rows = must(await supabase
      .from('orders')
      .select(columns)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .order('created_at', { ascending: true })
      .range(offset, offset + 999))
    all.push(...rows)
    if (rows.length < 1000) return all
  }
}

// @desc    Satış raporu
// @route   GET /api/reports?from&to
// @access  Admin
export const getReport = async (req, res) => {
  let range
  try {
    range = parseRange(req.query)
  } catch (err) {
    res.status(err.status || 400)
    throw err
  }
  const { start, end, days } = range

  // Aynı uzunlukta önceki dönem (karşılaştırma için)
  const prevStart = new Date(start.getTime() - (end - start))
  const cols = 'id, user_id, status, is_paid, payment_method, total_price, subtotal, discount, shipping_cost, coupon_code, items, shipping_address, created_at'

  const [orders, prevOrders, newUsers, prevNewUsers] = await Promise.all([
    fetchOrders(start, end, cols),
    fetchOrders(prevStart, start, 'status, is_paid, total_price'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'user')
      .gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'user')
      .gte('created_at', prevStart.toISOString()).lt('created_at', start.toISOString()),
  ])

  const active = orders.filter((o) => o.status !== 'İptal')
  const paid = active.filter((o) => o.is_paid)
  const sum = (list, key) => list.reduce((s, o) => s + (Number(o[key]) || 0), 0)

  const revenue = sum(paid, 'total_price')
  const prevPaid = prevOrders.filter((o) => o.status !== 'İptal' && o.is_paid)
  const prevRevenue = sum(prevPaid, 'total_price')
  const pct = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 100) : cur ? null : 0)

  // Tekrar eden müşteri: aralıkta 2+ siparişi olanlar
  const perUser = new Map()
  for (const o of active) if (o.user_id) perUser.set(o.user_id, (perUser.get(o.user_id) || 0) + 1)
  const buyers = perUser.size
  const repeatBuyers = [...perUser.values()].filter((n) => n > 1).length

  const summary = {
    revenue: round2(revenue),
    revenueChange: pct(revenue, prevRevenue),
    orders: active.length,
    ordersChange: pct(active.length, prevOrders.filter((o) => o.status !== 'İptal').length),
    paidOrders: paid.length,
    avgOrder: paid.length ? round2(revenue / paid.length) : 0,
    cancelled: orders.length - active.length,
    unpaid: active.length - paid.length,
    discountTotal: round2(sum(paid, 'discount')),
    shippingTotal: round2(sum(paid, 'shipping_cost')),
    newCustomers: newUsers.count || 0,
    newCustomersChange: pct(newUsers.count || 0, prevNewUsers.count || 0),
    buyers,
    repeatRate: buyers ? Math.round((repeatBuyers / buyers) * 100) : 0,
  }

  // Zaman serisi: 92 güne kadar günlük, üstü aylık
  const monthly = days > 92
  const bucketOf = (d) => (monthly ? trDate(d).slice(0, 7) : trDate(d))
  const series = []
  const seriesMap = new Map()
  if (monthly) {
    const [fy, fm] = range.from.split('-').map(Number)
    const [ty, tm] = range.to.split('-').map(Number)
    for (let y = fy, m = fm; y < ty || (y === ty && m <= tm); m === 12 ? (y++, m = 1) : m++) {
      const row = { date: `${y}-${pad(m)}`, revenue: 0, orders: 0 }
      series.push(row)
      seriesMap.set(row.date, row)
    }
  } else {
    for (let i = 0; i < days; i++) {
      const row = { date: trDate(start.getTime() + i * DAY_MS), revenue: 0, orders: 0 }
      series.push(row)
      seriesMap.set(row.date, row)
    }
  }
  for (const o of active) {
    const row = seriesMap.get(bucketOf(o.created_at))
    if (!row) continue
    row.orders += 1
    if (o.is_paid) row.revenue = round2(row.revenue + (Number(o.total_price) || 0))
  }

  // Ürün ve kategori kırılımı (ödenmiş siparişler)
  const productMap = new Map()
  for (const o of paid) {
    for (const it of o.items || []) {
      const key = it.product || it.name
      const row = productMap.get(key) || { product: it.product || null, name: it.name, image: it.image || null, quantity: 0, revenue: 0 }
      row.quantity += Number(it.quantity) || 0
      row.revenue = round2(row.revenue + (Number(it.price) || 0) * (Number(it.quantity) || 0))
      productMap.set(key, row)
    }
  }
  const productRows = [...productMap.values()]
  const ids = productRows.map((p) => p.product).filter(Boolean)
  const catOf = new Map()
  if (ids.length) {
    const prods = must(await supabase.from('products').select('id, category').in('id', ids))
    for (const p of prods) catOf.set(p.id, p.category)
  }
  const categoryMap = new Map()
  for (const p of productRows) {
    const name = catOf.get(p.product) || 'Silinmiş ürünler'
    const row = categoryMap.get(name) || { name, quantity: 0, revenue: 0 }
    row.quantity += p.quantity
    row.revenue = round2(row.revenue + p.revenue)
    categoryMap.set(name, row)
  }

  // Ödeme yöntemi
  const payments = ['card', 'transfer'].map((method) => {
    const list = active.filter((o) => o.payment_method === method)
    const paidList = list.filter((o) => o.is_paid)
    return { method, orders: list.length, paidOrders: paidList.length, revenue: round2(sum(paidList, 'total_price')) }
  })

  // Kuponlar
  const couponMap = new Map()
  for (const o of active) {
    if (!o.coupon_code) continue
    const row = couponMap.get(o.coupon_code) || { code: o.coupon_code, orders: 0, discount: 0, revenue: 0 }
    row.orders += 1
    row.discount = round2(row.discount + (Number(o.discount) || 0))
    if (o.is_paid) row.revenue = round2(row.revenue + (Number(o.total_price) || 0))
    couponMap.set(o.coupon_code, row)
  }

  // Şehirler
  const cityMap = new Map()
  for (const o of active) {
    const city = o.shipping_address?.city || 'Bilinmiyor'
    const row = cityMap.get(city) || { city, orders: 0, revenue: 0 }
    row.orders += 1
    if (o.is_paid) row.revenue = round2(row.revenue + (Number(o.total_price) || 0))
    cityMap.set(city, row)
  }

  // Durum dağılımı
  const statusCounts = {}
  for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1

  res.status(200).json({
    success: true,
    data: {
      range: { from: range.from, to: range.to, days, granularity: monthly ? 'month' : 'day' },
      summary,
      series,
      topProducts: productRows.sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      categories: [...categoryMap.values()].sort((a, b) => b.revenue - a.revenue),
      payments,
      coupons: [...couponMap.values()].sort((a, b) => b.orders - a.orders),
      cities: [...cityMap.values()].sort((a, b) => b.orders - a.orders).slice(0, 10),
      statusCounts,
    },
  })
}

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v)
  // Excel formül enjeksiyonunu önle (+90532... gibi düz numaralar hariç)
  const plainNumber = /^[+-]?\d[\d\s]*$/.test(s)
  const safe = !plainNumber && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

// @desc    Aralıktaki siparişleri CSV indir (Excel uyumlu, ; ayraçlı)
// @route   GET /api/reports/orders.csv?from&to
// @access  Admin
export const exportOrdersCsv = async (req, res) => {
  let range
  try {
    range = parseRange(req.query)
  } catch (err) {
    res.status(err.status || 400)
    throw err
  }
  const orders = await fetchOrders(range.start, range.end, '*, user:users(email)')

  const header = [
    'Sipariş No', 'Tarih', 'Durum', 'Ödeme', 'Ödendi', 'Müşteri', 'E-posta', 'Telefon', 'Şehir', 'İlçe',
    'Ürünler', 'Ara Toplam', 'İndirim', 'Kupon', 'Kargo', 'Toplam',
  ]
  const fmt = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' })
  const num = (n) => String(Number(n) || 0).replace('.', ',')
  const lines = [header.join(';')]
  for (const o of orders) {
    const items = (o.items || []).map((i) => {
      const extra = [i.material, ...(i.options || []).map((x) => x.value), i.personalization?.text && `"${i.personalization.text}"`]
        .filter(Boolean).join(', ')
      return `${i.quantity}x ${i.name}${extra ? ` (${extra})` : ''}`
    }).join(' | ')
    lines.push([
      o.order_no, fmt.format(new Date(o.created_at)), o.status,
      o.payment_method === 'card' ? 'Kart' : 'Havale', o.is_paid ? 'Evet' : 'Hayır',
      o.shipping_address?.fullName, o.user?.email, o.shipping_address?.phone,
      o.shipping_address?.city, o.shipping_address?.district,
      items, num(o.subtotal), num(o.discount), o.coupon_code, num(o.shipping_cost), num(o.total_price),
    ].map(csvCell).join(';'))
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="siparisler-${range.from}_${range.to}.csv"`)
  // BOM: Excel Türkçe karakterleri doğru açsın
  res.status(200).send(`﻿${lines.join('\r\n')}`)
}
