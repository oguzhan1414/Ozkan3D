import Order from '../models/Order.js'

export const generateOrderNo = async () => {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  const todayStart = new Date(date.setHours(0, 0, 0, 0))
  const todayEnd = new Date(date.setHours(23, 59, 59, 999))

  const todayCount = await Order.countDocuments({
    createdAt: { $gte: todayStart, $lte: todayEnd },
  })

  const sequence = String(todayCount + 1).padStart(3, '0')
  return `OZ${year}${month}${day}${sequence}`
}