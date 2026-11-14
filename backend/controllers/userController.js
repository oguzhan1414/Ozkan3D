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
  const { page = 1, limit = 20, search } = req.query

  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(200, Math.max(1, Number(limit) || 20))
  const from = (pageNum - 1) * limitNum

  let query = supabase.from('users').select('*', { count: 'exact' }).eq('role', 'user')

  const term = search ? sanitizeSearch(search) : ''
  if (term) {
    query = query.or(
      `first_name.ilike."*${term}*",last_name.ilike."*${term}*",email.ilike."*${term}*"`
    )
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, from + limitNum - 1)
  must({ data, error })

  const total = count || 0
  res.status(200).json({
    success: true,
    count: data.length,
    total,
    pages: Math.ceil(total / limitNum),
    data: data.map(userToApi),
  })
}

// @desc    Tek kullanıcı getir
// @route   GET /api/users/:id
// @access  Admin
export const getUser = async (req, res) => {
  const row = await requireUserRow(req.params.id, res)

  // Kullanıcının sipariş istatistikleri
  const orders = must(await supabase.from('orders').select('total_price').eq('user_id', row.id))
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total_price || 0), 0)
  const orderCount = orders.length

  res.status(200).json({
    success: true,
    data: {
      ...userToApi(row),
      stats: {
        orderCount,
        totalSpent,
        avgOrder: orderCount > 0 ? Math.round(totalSpent / orderCount) : 0,
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
export const getDashboardStats = async (req, res) => {
  const period = ['today', 'week', 'month', 'quarter', 'year'].includes(req.query.period)
    ? req.query.period
    : 'month'

  const now = new Date()
  const startDate = new Date(now)
  let groupFormat = 'YYYY-MM-DD'
  let periodLabel = 'Bu Ay'
  let salesTitle = 'Son 30 Gün Satış'

  if (period === 'today') {
    startDate.setHours(0, 0, 0, 0)
    groupFormat = 'HH24:00'
    periodLabel = 'Bugün'
    salesTitle = 'Bugün Saatlik Satış'
  } else if (period === 'week') {
    startDate.setDate(now.getDate() - 6)
    startDate.setHours(0, 0, 0, 0)
    periodLabel = 'Bu Hafta'
    salesTitle = 'Son 7 Gün Satış'
  } else if (period === 'month') {
    startDate.setDate(now.getDate() - 29)
    startDate.setHours(0, 0, 0, 0)
    periodLabel = 'Bu Ay'
    salesTitle = 'Son 30 Gün Satış'
  } else if (period === 'quarter') {
    startDate.setMonth(now.getMonth() - 2, 1)
    startDate.setHours(0, 0, 0, 0)
    groupFormat = 'YYYY-MM'
    periodLabel = 'Bu Çeyrek'
    salesTitle = 'Son 3 Ay Satış'
  } else if (period === 'year') {
    startDate.setMonth(now.getMonth() - 11, 1)
    startDate.setHours(0, 0, 0, 0)
    groupFormat = 'YYYY-MM'
    periodLabel = 'Bu Yıl'
    salesTitle = 'Son 12 Ay Satış'
  }

  const from = startDate.toISOString()
  const to = now.toISOString()
  const countOnly = { count: 'exact', head: true }

  const ordersInRange = () =>
    supabase.from('orders').select('id', countOnly).gte('created_at', from).lte('created_at', to)

  const [usersRes, ordersRes, pendingRes, processingRes, salesRes] = await Promise.all([
    supabase.from('users').select('id', countOnly).eq('role', 'user'),
    ordersInRange(),
    ordersInRange().eq('status', 'Bekliyor'),
    ordersInRange().in('status', ['Basımda', 'Hazırlanıyor']),
    supabase.rpc('dashboard_sales', { p_start: from, p_end: to, p_format: groupFormat }),
  ])

  for (const r of [usersRes, ordersRes, pendingRes, processingRes]) must(r)
  const recentSales = must(salesRes).map((s) => ({
    _id: s._id,
    revenue: Number(s.revenue) || 0,
    orders: Number(s.orders) || 0,
  }))

  res.status(200).json({
    success: true,
    data: {
      totalUsers: usersRes.count || 0,
      totalOrders: ordersRes.count || 0,
      totalRevenue: recentSales.reduce((sum, s) => sum + s.revenue, 0),
      pendingOrders: pendingRes.count || 0,
      processingOrders: processingRes.count || 0,
      recentSales,
      period,
      periodLabel,
      salesTitle,
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
