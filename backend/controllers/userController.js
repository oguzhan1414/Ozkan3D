import { supabase } from '../config/supabase.js'
import { must, toApi, toApiList, isUuid, sanitizeSearch } from '../utils/db.js'
import { sendEmail } from '../utils/sendEmail.js'
import { userToApi, findUserRowById, updateUserRow } from '../services/userService.js'
import { populateItemProducts } from '../services/orderService.js'

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const requireUserRow = async (id, res) => {
  const row = await findUserRowById(id)
  if (!row) {
    res.status(404)
    throw new Error('Kullanıcı bulunamadı.')
  }
  return row
}

// @desc    Tüm kullanıcıları getir
// @route   GET /api/users
// @access  Admin
export const getUsers = async (req, res) => {
  const { page = 1, limit = 20, search, role = 'user' } = req.query

  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(200, Math.max(1, Number(limit) || 20))
  const from = (pageNum - 1) * limitNum

  let query = supabase.from('users').select('*', { count: 'exact' })
  if (role === 'user' || role === 'admin') query = query.eq('role', role)

  const term = search ? sanitizeSearch(search) : ''
  if (term) {
    query = query.or(
      `first_name.ilike."*${term}*",last_name.ilike."*${term}*",email.ilike."*${term}*",phone.ilike."*${term}*"`
    )
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, from + limitNum - 1)
  must({ data, error })

  // Listedeki müşterilerin sipariş sayısı ve harcaması (iptaller hariç, ödenmiş tutar)
  const ids = data.map((u) => u.id)
  const stats = new Map()
  if (ids.length) {
    const orders = must(await supabase
      .from('orders')
      .select('user_id, total_price, is_paid, created_at')
      .in('user_id', ids)
      .neq('status', 'İptal'))
    for (const o of orders) {
      const st = stats.get(o.user_id) || { orderCount: 0, totalSpent: 0, lastOrderAt: null }
      st.orderCount += 1
      if (o.is_paid) st.totalSpent += Number(o.total_price) || 0
      if (!st.lastOrderAt || o.created_at > st.lastOrderAt) st.lastOrderAt = o.created_at
      stats.set(o.user_id, st)
    }
  }

  const total = count || 0
  res.status(200).json({
    success: true,
    count: data.length,
    total,
    pages: Math.ceil(total / limitNum),
    data: data.map((u) => ({ ...userToApi(u), ...(stats.get(u.id) || { orderCount: 0, totalSpent: 0, lastOrderAt: null }) })),
  })
}

// @desc    Tek kullanıcı getir
// @route   GET /api/users/:id
// @access  Admin
export const getUser = async (req, res) => {
  const row = await requireUserRow(req.params.id, res)

  // Kullanıcının sipariş istatistikleri
  // İptaller sayılmaz; harcama sadece ödenmiş siparişlerden
  const orders = must(await supabase.from('orders').select('total_price, is_paid').eq('user_id', row.id).neq('status', 'İptal'))
  const paid = orders.filter((o) => o.is_paid)
  const totalSpent = paid.reduce((sum, order) => sum + Number(order.total_price || 0), 0)
  const orderCount = orders.length

  res.status(200).json({
    success: true,
    data: {
      ...userToApi(row),
      stats: {
        orderCount,
        totalSpent,
        avgOrder: paid.length > 0 ? Math.round(totalSpent / paid.length) : 0,
      },
    },
  })
}

// @desc    Kullanıcı güncelle
// @route   PUT /api/users/:id
// @access  Admin
export const updateUser = async (req, res) => {
  const { role, isActive } = req.body
  const row = await requireUserRow(req.params.id, res)

  // Admin kendi yetkisini kaldırıp ya da hesabını kapatıp panele erişimini kaybetmesin
  if (row.id === req.user._id && ((role !== undefined && role !== 'admin') || isActive === false)) {
    res.status(400)
    throw new Error('Kendi yetkinizi kaldıramaz veya hesabınızı kapatamazsınız.')
  }

  const fields = {}
  if (role !== undefined) {
    if (!['user', 'admin'].includes(role)) {
      res.status(400)
      throw new Error('Geçersiz rol.')
    }
    fields.role = role
  }
  if (isActive !== undefined) fields.is_active = Boolean(isActive)

  const user = Object.keys(fields).length ? await updateUserRow(row.id, fields) : userToApi(row)
  res.status(200).json({ success: true, data: user })
}

// @desc    Kullanıcı sil
// @route   DELETE /api/users/:id
// @access  Admin
export const deleteUser = async (req, res) => {
  const row = await requireUserRow(req.params.id, res)

  if (row.role === 'admin') {
    res.status(400)
    throw new Error('Admin hesabı silinemez.')
  }

  must(await supabase.from('users').delete().eq('id', row.id))
  res.status(200).json({ success: true, message: 'Kullanıcı silindi.' })
}

// @desc    Kullanıcı siparişlerini getir
// @route   GET /api/users/:id/orders
// @access  Admin
export const getUserOrders = async (req, res) => {
  const rows = isUuid(req.params.id)
    ? must(
        await supabase
          .from('orders')
          .select('*')
          .eq('user_id', req.params.id)
          .order('created_at', { ascending: false })
      )
    : []

  const orders = toApiList(rows)
  await populateItemProducts(orders, 'id, name, images')

  res.status(200).json({ success: true, count: orders.length, data: orders })
}

// @desc    Admin panelden müşteriye e-posta gönder
// @route   POST /api/users/:id/email
// @access  Admin
export const sendCustomerEmail = async (req, res) => {
  const { subject, message } = req.body

  if (!subject || !String(subject).trim()) {
    res.status(400)
    throw new Error('E-posta konusu zorunludur.')
  }

  if (!message || !String(message).trim()) {
    res.status(400)
    throw new Error('E-posta mesajı zorunludur.')
  }

  const user = userToApi(await requireUserRow(req.params.id, res))

  const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br/>')
  const safeName = escapeHtml(`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email)

  await sendEmail({
    to: user.email,
    subject: String(subject).trim(),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111;max-width:640px;margin:0 auto;padding:20px;">
        <p>Merhaba ${safeName},</p>
        <div style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:8px;padding:14px 16px;">${safeMessage}</div>
        <p style="margin-top:16px;">Saygılarımızla,<br/>Ozkan3D Ekibi</p>
      </div>
    `,
  })

  res.status(200).json({ success: true, message: 'E-posta başarıyla gönderildi.' })
}

// @desc    Admin dashboard istatistikleri
// @route   GET /api/users/stats
// @access  Admin
// Türkiye saati (UTC+3, yaz saati uygulaması yok). Sunucu (Vercel) UTC çalışır.
const TR_OFFSET_MS = 3 * 60 * 60 * 1000
const trParts = (date) => {
  const d = new Date(date.getTime() + TR_OFFSET_MS)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours() }
}
const trMidnight = (y, m, d) => new Date(Date.UTC(y, m, d) - TR_OFFSET_MS)
const pad = (n) => String(n).padStart(2, '0')

const PERIODS = {
  today: { label: 'Bugün', title: 'Bugün saatlik satış', format: 'HH24:00', unit: 'hour' },
  week: { label: 'Son 7 gün', title: 'Son 7 gün satış', format: 'YYYY-MM-DD', unit: 'day', days: 7 },
  month: { label: 'Son 30 gün', title: 'Son 30 gün satış', format: 'YYYY-MM-DD', unit: 'day', days: 30 },
  quarter: { label: 'Son 3 ay', title: 'Son 3 ay satış', format: 'YYYY-MM', unit: 'month', months: 3 },
  year: { label: 'Son 12 ay', title: 'Son 12 ay satış', format: 'YYYY-MM', unit: 'month', months: 12 },
}

/** Dönem başlangıcı (Türkiye saatine göre) ve grafikteki tüm aralık etiketleri */
const periodRange = (period, now) => {
  const cfg = PERIODS[period]
  const t = trParts(now)
  let start
  const buckets = []
  if (cfg.unit === 'hour') {
    start = trMidnight(t.y, t.m, t.d)
    for (let h = 0; h <= t.h; h++) buckets.push(`${pad(h)}:00`)
  } else if (cfg.unit === 'day') {
    start = trMidnight(t.y, t.m, t.d - (cfg.days - 1))
    for (let i = 0; i < cfg.days; i++) {
      const p = trParts(new Date(start.getTime() + i * 86400000))
      buckets.push(`${p.y}-${pad(p.m + 1)}-${pad(p.d)}`)
    }
  } else {
    start = trMidnight(t.y, t.m - (cfg.months - 1), 1)
    for (let i = 0; i < cfg.months; i++) {
      const dt = new Date(Date.UTC(t.y, t.m - (cfg.months - 1) + i, 1))
      buckets.push(`${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`)
    }
  }
  return { ...cfg, start, buckets }
}

const pctChange = (current, previous) => {
  if (!previous) return current ? null : 0 // önceki dönem boşsa oran anlamsız
  return Math.round(((current - previous) / previous) * 100)
}

export const getDashboardStats = async (req, res) => {
  const period = PERIODS[req.query.period] ? req.query.period : 'month'
  const now = new Date()
  const range = periodRange(period, now)
  const from = range.start
  // Önceki dönem: aynı uzunlukta, hemen öncesi
  const prevFrom = new Date(from.getTime() - (now.getTime() - from.getTime()))
  const countOnly = { count: 'exact', head: true }

  const settingsRow = must(await supabase.from('settings').select('low_stock_threshold').limit(1).maybeSingle())
  const threshold = Number(settingsRow?.low_stock_threshold ?? 10)

  const [
    ordersRes, usersRes, newUsersRes, prevUsersRes, salesRes,
    toPrintRes, transferRes, printingRes, toShipRes, reviewsRes, supportRes,
    lowStockRes, lowStockCountRes,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, status, total_price, is_paid, created_at, items')
      .gte('created_at', prevFrom.toISOString())
      .lte('created_at', now.toISOString()),
    supabase.from('users').select('id', countOnly).eq('role', 'user'),
    supabase.from('users').select('id', countOnly).eq('role', 'user').gte('created_at', from.toISOString()),
    supabase.from('users').select('id', countOnly).eq('role', 'user')
      .gte('created_at', prevFrom.toISOString()).lt('created_at', from.toISOString()),
    supabase.rpc('dashboard_sales', { p_start: from.toISOString(), p_end: now.toISOString(), p_format: range.format }),
    // Yapılacaklar (döneme bağlı değil, şu anki durum)
    supabase.from('orders').select('id', countOnly).eq('status', 'Bekliyor').eq('is_paid', true),
    supabase.from('orders').select('id', countOnly).eq('payment_method', 'transfer').eq('is_paid', false).neq('status', 'İptal'),
    supabase.from('orders').select('id', countOnly).eq('status', 'Basımda'),
    supabase.from('orders').select('id', countOnly).eq('status', 'Hazırlanıyor'),
    supabase.from('reviews').select('id', countOnly).eq('status', 'pending'),
    supabase.from('support_requests').select('id', countOnly).eq('status', 'new'),
    // Siparişe özel ürünlerin stoğu takip edilmez
    supabase.from('products').select('id, name, slug, stock, images')
      .eq('is_active', true).eq('made_to_order', false).lte('stock', threshold).order('stock').limit(6),
    supabase.from('products').select('id', countOnly).eq('is_active', true).eq('made_to_order', false).lte('stock', threshold),
  ])

  const orders = must(ordersRes)
  for (const r of [usersRes, newUsersRes, prevUsersRes, toPrintRes, transferRes, printingRes, toShipRes, reviewsRes, supportRes, lowStockCountRes]) must(r)
  const lowStock = must(lowStockRes)

  // Dönem metrikleri: ciro = ödenmiş siparişler, sipariş sayısı = iptal hariç
  const inCurrent = (o) => new Date(o.created_at) >= from
  const summarize = (list) => {
    const active = list.filter((o) => o.status !== 'İptal')
    const paid = list.filter((o) => o.is_paid)
    const revenue = paid.reduce((sum, o) => sum + Number(o.total_price || 0), 0)
    return { revenue, orders: active.length, avgOrder: paid.length ? revenue / paid.length : 0 }
  }
  const currentOrders = orders.filter(inCurrent)
  const current = summarize(currentOrders)
  const previous = summarize(orders.filter((o) => !inCurrent(o)))

  const statusCounts = {}
  for (const o of currentOrders) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1

  // En çok satanlar (dönemdeki ödenmiş siparişler)
  const productStats = new Map()
  for (const o of currentOrders.filter((x) => x.is_paid)) {
    for (const it of o.items || []) {
      const key = it.product || it.name
      const row = productStats.get(key) || { product: it.product, name: it.name, image: it.image, quantity: 0, revenue: 0 }
      row.quantity += Number(it.quantity) || 0
      row.revenue += (Number(it.price) || 0) * (Number(it.quantity) || 0)
      productStats.set(key, row)
    }
  }
  const topProducts = [...productStats.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 5)

  // Grafik: satış olmayan aralıklar da sıfırla doldurulur
  const salesMap = new Map(must(salesRes).map((s) => [s._id, s]))
  const recentSales = range.buckets.map((b) => ({
    _id: b,
    revenue: Number(salesMap.get(b)?.revenue) || 0,
    orders: Number(salesMap.get(b)?.orders) || 0,
  }))

  const newCustomers = newUsersRes.count || 0

  res.status(200).json({
    success: true,
    data: {
      // Eski alanlar (Raporlar sayfası da kullanıyor)
      totalUsers: usersRes.count || 0,
      totalOrders: current.orders,
      totalRevenue: current.revenue,
      pendingOrders: statusCounts['Bekliyor'] || 0,
      processingOrders: (statusCounts['Basımda'] || 0) + (statusCounts['Hazırlanıyor'] || 0),
      recentSales,
      period,
      periodLabel: range.label,
      salesTitle: range.title,
      // Önceki dönemle karşılaştırmalı göstergeler
      kpis: {
        revenue: { value: current.revenue, change: pctChange(current.revenue, previous.revenue) },
        orders: { value: current.orders, change: pctChange(current.orders, previous.orders) },
        avgOrder: { value: Math.round(current.avgOrder), change: pctChange(current.avgOrder, previous.avgOrder) },
        newCustomers: { value: newCustomers, change: pctChange(newCustomers, prevUsersRes.count || 0) },
      },
      statusCounts,
      topProducts,
      // Şu an yapılması gerekenler
      todo: {
        toPrint: toPrintRes.count || 0,
        awaitingTransfer: transferRes.count || 0,
        printing: printingRes.count || 0,
        toShip: toShipRes.count || 0,
        pendingReviews: reviewsRes.count || 0,
        newSupport: supportRes.count || 0,
        lowStock: lowStockCountRes.count || 0,
      },
      lowStock: lowStock.map((p) => ({ _id: p.id, name: p.name, slug: p.slug, stock: p.stock, image: p.images?.[0] || null })),
      lowStockThreshold: threshold,
    },
  })
}

// @desc    Favorileri getir
// @route   GET /api/users/favorites
// @access  Private
export const getFavorites = async (req, res) => {
  const ids = req.user.favorites || []
  if (ids.length === 0) {
    res.status(200).json({ success: true, data: [] })
    return
  }

  const rows = must(
    await supabase
      .from('products')
      .select('id, name, images, price, slug, rating, review_count, badge, colors')
      .in('id', ids)
  )

  // Favori ekleme sırasını koru
  const map = new Map(rows.map((r) => [r.id, toApi(r)]))
  res.status(200).json({ success: true, data: ids.map((id) => map.get(id)).filter(Boolean) })
}

// @desc    Favoriye ekle/çıkar
// @route   POST /api/users/favorites/:productId
// @access  Private
export const toggleFavorite = async (req, res) => {
  const productId = req.params.productId

  if (!isUuid(productId)) {
    res.status(404)
    throw new Error('Ürün bulunamadı.')
  }

  const current = req.user.favorites || []
  const isFav = current.includes(productId)

  if (!isFav) {
    const exists = must(await supabase.from('products').select('id').eq('id', productId).maybeSingle())
    if (!exists) {
      res.status(404)
      throw new Error('Ürün bulunamadı.')
    }
  }

  const favorites = isFav ? current.filter((id) => id !== productId) : [...current, productId]
  const user = await updateUserRow(req.user._id, { favorites })

  res.status(200).json({
    success: true,
    isFavorite: !isFav,
    data: user.favorites,
  })
}
