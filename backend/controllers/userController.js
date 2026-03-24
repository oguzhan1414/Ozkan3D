import User from '../models/User.js'
import Order from '../models/Order.js'

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

// @desc    Admin dashboard istatistikleri
// @route   GET /api/users/stats
// @access  Admin
export const getDashboardStats = async (req, res) => {
  const totalUsers = await User.countDocuments({ role: 'user' })
  const totalOrders = await Order.countDocuments()
  const totalRevenue = await Order.aggregate([
    { $match: { isPaid: true } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } },
  ])

  const pendingOrders = await Order.countDocuments({ status: 'Bekliyor' })
  const processingOrders = await Order.countDocuments({ status: 'Basımda' })

  // Son 30 günlük satış
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentSales = await Order.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo }, isPaid: true } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalPrice' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ])

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      pendingOrders,
      processingOrders,
      recentSales,
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