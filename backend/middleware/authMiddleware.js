import jwt from 'jsonwebtoken'
import { findUserById } from '../services/userService.js'

export const protect = async (req, res, next) => {
  let token

  // Cookie'den al
  if (req.cookies?.token) {
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

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    res.status(401)
    throw new Error('Token geçersiz veya süresi dolmuş.')
  }

  const user = await findUserById(decoded.id)
  if (!user || user.isActive === false) {
    res.status(401)
    throw new Error('Token geçersiz veya süresi dolmuş.')
  }

  req.user = user
  next()
}
