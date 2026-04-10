import User from '../models/User.js'
import Order from '../models/Order.js'
import { sendEmail } from '../utils/sendEmail.js'

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

// @desc    Tüm kullanıcıları getir
// @route   GET /api/users
// @access  Admin
export const getUsers = async (req, res) => {
  const { page = 1, limit = 20, search } = req.query

  const query = { role: 'user' } // ← sadece normal kullanıcılar
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
  }

  const pageNum = Number(page)
  const limitNum = Number(limit)
  const skip = (pageNum - 1) * limitNum

  const total = await User.countDocuments(query)
  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    pages: Math.ceil(total / limitNum),
    data: users,
  })
}

// @desc    Tek kullanıcı getir
// @route   GET /api/users/:id
// @access  Admin
export const getUser = async (req, res) => {
  const user = await User.findById(req.params.id)

  if (!user) {
    res.status(404)
    throw new Error('Kullanıcı bulunamadı.')
  }

  // Kullanıcının sipariş istatistikleri
  const orders = await Order.find({ user: req.params.id })
  const totalSpent = orders.reduce((sum, order) => sum + order.totalPrice, 0)
  const orderCount = orders.length

  res.status(200).json({
    success: true,
    data: {
      ...user.toObject(),
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

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role, isActive },
    { new: true, runValidators: true }
  )

  if (!user) {
    res.status(404)
    throw new Error('Kullanıcı bulunamadı.')
  }

  res.status(200).json({ success: true, data: user })
}

// @desc    Kullanıcı sil
// @route   DELETE /api/users/:id
// @access  Admin
export const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id)

  if (!user) {
    res.status(404)
    throw new Error('Kullanıcı bulunamadı.')
  }

  if (user.role === 'admin') {
    res.status(400)
    throw new Error('Admin hesabı silinemez.')
  }

  await user.deleteOne()
  res.status(200).json({ success: true, message: 'Kullanıcı silindi.' })
}

// @desc    Kullanıcı siparişlerini getir
// @route   GET /api/users/:id/orders
// @access  Admin
export const getUserOrders = async (req, res) => {
  const orders = await Order.find({ user: req.params.id })
    .sort({ createdAt: -1 })
    .populate('items.product', 'name images')

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

  const user = await User.findById(req.params.id)

  if (!user) {
    res.status(404)
    throw new Error('Kullanıcı bulunamadı.')
  }

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
  let groupFormat = '%Y-%m-%d'
  let periodLabel = 'Bu Ay'
  let salesTitle = 'Son 30 Gün Satış'

  if (period === 'today') {
    startDate.setHours(0, 0, 0, 0)
    groupFormat = '%H:00'
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
    groupFormat = '%Y-%m'
    periodLabel = 'Bu Çeyrek'
    salesTitle = 'Son 3 Ay Satış'
  } else if (period === 'year') {
    startDate.setMonth(now.getMonth() - 11, 1)
    startDate.setHours(0, 0, 0, 0)
    groupFormat = '%Y-%m'
    periodLabel = 'Bu Yıl'
    salesTitle = 'Son 12 Ay Satış'
  }

  const dateMatch = { createdAt: { $gte: startDate, $lte: now } }

  const [totalUsers, totalOrders, totalRevenueAgg, pendingOrders, processingOrders, recentSales] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Order.countDocuments(dateMatch),
    Order.aggregate([
      { $match: { ...dateMatch, isPaid: true } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),
    Order.countDocuments({ ...dateMatch, status: 'Bekliyor' }),
    Order.countDocuments({ ...dateMatch, status: { $in: ['Basımda', 'Hazırlanıyor'] } }),
    Order.aggregate([
      { $match: { ...dateMatch, isPaid: true } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupFormat,
              date: '$createdAt',
              timezone: 'Europe/Istanbul',
            },
          },
          revenue: { $sum: '$totalPrice' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ])

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalOrders,
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      pendingOrders,
      processingOrders,
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
  const user = await User.findById(req.user._id)
    .populate('favorites', 'name images price slug rating reviewCount badge colors')

  res.status(200).json({ success: true, data: user.favorites })
}

// @desc    Favoriye ekle/çıkar
// @route   POST /api/users/favorites/:productId
// @access  Private
export const toggleFavorite = async (req, res) => {
  const user = await User.findById(req.user._id)
  const productId = req.params.productId

  const isFav = user.favorites.includes(productId)

  if (isFav) {
    user.favorites = user.favorites.filter(id => id.toString() !== productId)
  } else {
    user.favorites.push(productId)
  }

  await user.save()

  res.status(200).json({
    success: true,
    isFavorite: !isFav,
    data: user.favorites,
  })
}