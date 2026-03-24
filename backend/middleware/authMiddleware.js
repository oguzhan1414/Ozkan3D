import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const protect = async (req, res, next) => {
  let token

  // Cookie'den al
  if (req.cookies.token) {
    token = req.cookies.token
  }
  // Header'dan al
  else if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    res.status(401)
    throw new Error('Bu işlem için giriş yapmanız gerekiyor.')
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id).select('-password')
    next()
  } catch (error) {
    res.status(401)
    throw new Error('Token geçersiz veya süresi dolmuş.')
  }
}