import crypto from 'crypto'
import User from '../models/User.js'
import { sendTokenResponse } from '../utils/generateToken.js'
import { sendPasswordResetEmail } from '../utils/sendEmail.js'
import { sendWelcomeEmail, sendNewUserNotifyAdmin } from '../utils/sendEmail.js'
import { io } from '../server.js';
// @desc    Kayıt ol
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  const { firstName, lastName, email, password, phone, birthDate } = req.body

  const userExists = await User.findOne({ email })
  if (userExists) {
    res.status(400)
    throw new Error('Bu e-posta adresi zaten kayıtlı.')
  }

  const user = await User.create({
    firstName, lastName, email,
    password, phone, birthDate,
  })

  // Kullanıcıya hoş geldin maili
  try {
    await sendWelcomeEmail(user)
  } catch (err) {
    console.log('Hoş geldin maili gönderilemedi:', err.message)
  }

  // Admin'e bildirim maili
  try {
    await sendNewUserNotifyAdmin(user)
  } catch (err) {
    console.log('Admin bildirimi gönderilemedi:', err.message)
  }

  // Socket.io — admin dashboarda gerçek zamanlı bildirim
  io.to('admin').emit('newUser', {
    type: 'newUser',
    message: `Yeni üye: ${user.firstName} ${user.lastName}`,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      createdAt: user.createdAt,
    },
    timestamp: new Date(),
  })

  sendTokenResponse(user, 201, res)
}

// @desc    Giriş yap
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400)
    throw new Error('E-posta ve şifre zorunludur.')
  }

  const user = await User.findOne({ email }).select('+password')
  if (!user || !(await user.matchPassword(password))) {
    res.status(401)
    throw new Error('E-posta veya şifre hatalı.')
  }

  if (!user.isActive) {
    res.status(401)
    throw new Error('Hesabınız devre dışı bırakılmış.')
  }

  sendTokenResponse(user, 200, res)
}

// @desc    Çıkış yap
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  })

  res.status(200).json({ success: true, message: 'Başarıyla çıkış yapıldı.' })
}

// @desc    Mevcut kullanıcıyı getir
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  const user = await User.findById(req.user.id)
  res.status(200).json({ success: true, data: user })
}

// @desc    Profil güncelle
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  const { name, phone } = req.body

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, phone },
    { new: true, runValidators: true }
  )

  res.status(200).json({ success: true, data: user })
}

// @desc    Şifre değiştir
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body

  const user = await User.findById(req.user.id).select('+password')

  if (!(await user.matchPassword(currentPassword))) {
    res.status(401)
    throw new Error('Mevcut şifre hatalı.')
  }

  user.password = newPassword
  await user.save()

  sendTokenResponse(user, 200, res)
}

// @desc    Şifre sıfırlama linki gönder
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email })

  if (!user) {
    res.status(404)
    throw new Error('Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.')
  }

  const resetToken = crypto.randomBytes(20).toString('hex')

  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')

  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000 // 15 dakika
  await user.save({ validateBeforeSave: false })

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`

  try {
    await sendPasswordResetEmail(user, resetUrl)
    res.status(200).json({ success: true, message: 'Şifre sıfırlama linki e-posta adresinize gönderildi.' })
  } catch (error) {
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined
    await user.save({ validateBeforeSave: false })
    res.status(500)
    throw new Error('E-posta gönderilemedi, lütfen tekrar deneyin.')
  }
}

// @desc    Şifreyi sıfırla
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex')

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  })

  if (!user) {
    res.status(400)
    throw new Error('Geçersiz veya süresi dolmuş token.')
  }

  user.password = req.body.password
  user.resetPasswordToken = undefined
  user.resetPasswordExpire = undefined
  await user.save()

  sendTokenResponse(user, 200, res)
}

// @desc    Adres ekle
// @route   POST /api/auth/address
// @access  Private
export const addAddress = async (req, res) => {
  const user = await User.findById(req.user.id)

  if (req.body.isDefault) {
    user.addresses.forEach(addr => addr.isDefault = false)
  }

  user.addresses.push(req.body)
  await user.save()

  res.status(201).json({ success: true, data: user.addresses })
}

// @desc    Adres sil
// @route   DELETE /api/auth/address/:addressId
// @access  Private
export const deleteAddress = async (req, res) => {
  const user = await User.findById(req.user.id)

  user.addresses = user.addresses.filter(
    addr => addr._id.toString() !== req.params.addressId
  )

  await user.save()
  res.status(200).json({ success: true, data: user.addresses })
}