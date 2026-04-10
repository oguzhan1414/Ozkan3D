import crypto from 'crypto'
import User from '../models/User.js'
import { sendTokenResponse, getAuthCookieOptions } from '../utils/generateToken.js'
import { sendPasswordResetEmail } from '../utils/sendEmail.js'
import { sendWelcomeEmail, sendNewUserNotifyAdmin, sendEmailVerificationEmail } from '../utils/sendEmail.js'
import { io } from '../server.js'
import { OAuth2Client } from 'google-auth-library'

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
const EMAIL_VERIFY_WINDOW_MS = 3 * 60 * 1000
const EMAIL_VERIFY_WINDOW_SECONDS = Math.floor(EMAIL_VERIFY_WINDOW_MS / 1000)
const EMAIL_REGEX = /^\S+@\S+\.\S+$/
const PHONE_REGEX = /^\+90\d{10}$/

const isVerificationExpired = (user) => {
  if (!user?.emailVerifyExpire) return false
  return new Date(user.emailVerifyExpire).getTime() <= Date.now()
}

const cleanupExpiredUnverifiedUsers = async () => {
  await User.deleteMany({
    emailVerified: false,
    role: 'user',
    emailVerifyExpire: { $lte: new Date() },
  })
}

const createEmailVerifyToken = (user) => {
  const verifyToken = crypto.randomBytes(20).toString('hex')

  user.emailVerifyToken = crypto
    .createHash('sha256')
    .update(verifyToken)
    .digest('hex')

  user.emailVerifyExpire = Date.now() + EMAIL_VERIFY_WINDOW_MS

  return verifyToken
}

const notifyNewVerifiedUser = async (user) => {
  try {
    await sendWelcomeEmail(user)
  } catch (err) {
    console.log('Hoş geldin maili gönderilemedi:', err.message)
  }

  try {
    await sendNewUserNotifyAdmin(user)
  } catch (err) {
    console.log('Admin bildirimi gönderilemedi:', err.message)
  }

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
}

const normalizeDefaultAddresses = (user) => {
  if (!user?.addresses || user.addresses.length === 0) return

  const defaultIndexes = []
  user.addresses.forEach((addr, index) => {
    if (addr.isDefault) defaultIndexes.push(index)
  })

  if (defaultIndexes.length === 0) {
    user.addresses[0].isDefault = true
    return
  }

  if (defaultIndexes.length > 1) {
    const keepIndex = defaultIndexes[0]
    user.addresses.forEach((addr, index) => {
      addr.isDefault = index === keepIndex
    })
  }
}

// @desc    Kayıt ol
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  const { firstName, lastName, email, password, phone, birthDate } = req.body

  await cleanupExpiredUnverifiedUsers()

  if (!firstName || !lastName || !password || !phone || !birthDate) {
    res.status(400)
    throw new Error('Ad, soyad, e-posta, telefon, doğum tarihi ve şifre alanları zorunludur.')
  }

  const normalizedEmail = String(email || '').trim().toLowerCase()
  const normalizedPhone = String(phone || '').trim()

  if (!normalizedEmail) {
    res.status(400)
    throw new Error('E-posta adresi zorunludur.')
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    res.status(400)
    throw new Error('Geçerli bir e-posta adresi giriniz.')
  }

  if (!PHONE_REGEX.test(normalizedPhone)) {
    res.status(400)
    throw new Error('Telefon numarası +90 ile başlayan 10 haneli formatta olmalıdır. Örn: +905XXXXXXXXX')
  }

  const parsedBirthDate = new Date(birthDate)
  if (Number.isNaN(parsedBirthDate.getTime())) {
    res.status(400)
    throw new Error('Geçerli bir doğum tarihi seçiniz.')
  }

  if (parsedBirthDate > new Date()) {
    res.status(400)
    throw new Error('Doğum tarihi bugünden ileri bir tarih olamaz.')
  }

  const userExists = await User.findOne({ email: normalizedEmail })
  if (userExists) {
    if (userExists.emailVerified === false && userExists.role !== 'admin') {
      if (isVerificationExpired(userExists)) {
        await User.deleteOne({ _id: userExists._id })
      } else {
        const remainingSeconds = Math.max(
          1,
          Math.ceil((new Date(userExists.emailVerifyExpire).getTime() - Date.now()) / 1000)
        )

        res.status(409)
        throw new Error(
          `Bu e-posta için doğrulama bekleniyor. Kalan süre: ${remainingSeconds} saniye. Mailinizi doğrulayın veya süre dolunca tekrar kayıt olun.`
        )
      }
    } else {
      res.status(400)
      throw new Error('Bu e-posta adresi zaten kayıtlı.')
    }
  }

  const user = await User.create({
    firstName, lastName, email: normalizedEmail,
    password, phone: normalizedPhone, birthDate: parsedBirthDate,
    emailVerified: false,
  })

  const verifyToken = createEmailVerifyToken(user)
  await user.save({ validateBeforeSave: false })

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`

  try {
    await sendEmailVerificationEmail(user, verifyUrl)
  } catch (error) {
    res.status(500)
    throw new Error('Doğrulama e-postası gönderilemedi. Lütfen tekrar deneyin.')
  }

  res.status(201).json({
    success: true,
    message: 'Kayıt başarılı. 3 dakika içinde e-posta adresinizi doğrulamalısınız.',
    verifyExpiresInSeconds: EMAIL_VERIFY_WINDOW_SECONDS,
  })
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

  if (user.role !== 'admin' && user.emailVerified === false) {
    if (isVerificationExpired(user)) {
      await User.deleteOne({ _id: user._id })
      res.status(410)
      throw new Error('E-posta doğrulama süresi dolduğu için kayıt iptal edildi. Lütfen tekrar kayıt olun.')
    }

    const remainingSeconds = Math.max(
      1,
      Math.ceil((new Date(user.emailVerifyExpire).getTime() - Date.now()) / 1000)
    )

    res.status(403)
    throw new Error(`Giriş yapmadan önce e-posta adresinizi doğrulayın. Kalan süre: ${remainingSeconds} saniye.`)
  }

  sendTokenResponse(user, 200, res)
}

// @desc    Google ile Giriş yap
// @route   POST /api/auth/google
// @access  Public
export const googleLogin = async (req, res) => {
  const { credential } = req.body
  if (!credential) {
    res.status(400)
    throw new Error('Google token eksik.')
  }

  // Frontend'den gelen credential (JWT id_token) doğrulanır
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,  // Backend .env'inde olmalı
  })
  const payload = ticket.getPayload()
  const { sub, email, given_name, family_name } = payload

  let user = await User.findOne({ email })
  if (user) {
    if (!user.googleId || user.emailVerified !== true) {
      user.googleId = sub
      user.emailVerified = true
      user.emailVerifyToken = undefined
      user.emailVerifyExpire = undefined
      await user.save({ validateBeforeSave: false })
    }
  } else {
    // Yeni kullanıcı
    const randomPassword = crypto.randomBytes(16).toString('hex')
    user = await User.create({
      firstName: given_name || 'Kullanıcı',
      lastName: family_name || 'Kullanıcısı',
      email,
      password: randomPassword,
      googleId: sub,
      emailVerified: true,
    })

    await notifyNewVerifiedUser(user)
  }

  sendTokenResponse(user, 200, res)
}

// @desc    E-posta doğrula
// @route   POST /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req, res) => {
  if (!req.params.token) {
    res.status(400)
    throw new Error('Doğrulama token bilgisi eksik.')
  }

  const emailVerifyToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex')

  const user = await User.findOne({ emailVerifyToken })

  if (!user) {
    res.status(400)
    throw new Error('Doğrulama bağlantısı geçersiz veya süresi dolmuş.')
  }

  if (user.emailVerified === true) {
    res.status(200).json({
      success: true,
      message: 'E-posta adresiniz zaten doğrulanmış. Giriş yapabilirsiniz.',
    })
    return
  }

  if (isVerificationExpired(user)) {
    await User.deleteOne({ _id: user._id })
    res.status(410)
    throw new Error('Doğrulama süresi dolduğu için kayıt iptal edildi. Lütfen tekrar kayıt olun.')
  }

  const shouldSendOnboarding = user.emailVerified !== true

  user.emailVerified = true
  await user.save({ validateBeforeSave: false })

  if (shouldSendOnboarding) {
    await notifyNewVerifiedUser(user)
  }

  res.status(200).json({
    success: true,
    message: 'E-posta adresiniz doğrulandı. Artık giriş yapabilirsiniz.',
  })
}

// @desc    Doğrulama mailini yeniden gönder
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerificationEmail = async (req, res) => {
  const { email } = req.body

  const normalizedEmail = String(email || '').trim().toLowerCase()

  if (!normalizedEmail) {
    res.status(400)
    throw new Error('E-posta adresi zorunludur.')
  }

  const user = await User.findOne({ email: normalizedEmail })
  if (!user) {
    res.status(404)
    throw new Error('Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.')
  }

  if (user.emailVerified === true) {
    res.status(400)
    throw new Error('Bu e-posta adresi zaten doğrulanmış.')
  }

  if (isVerificationExpired(user)) {
    await User.deleteOne({ _id: user._id })
    res.status(410)
    throw new Error('Doğrulama süresi dolduğu için kayıt iptal edildi. Lütfen tekrar kayıt olun.')
  }

  const verifyToken = createEmailVerifyToken(user)
  await user.save({ validateBeforeSave: false })

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`

  try {
    await sendEmailVerificationEmail(user, verifyUrl)
  } catch (error) {
    res.status(500)
    throw new Error('Doğrulama e-postası gönderilemedi. Lütfen tekrar deneyin.')
  }

  res.status(200).json({
    success: true,
    message: 'Doğrulama e-postası yeniden gönderildi.',
    verifyExpiresInSeconds: EMAIL_VERIFY_WINDOW_SECONDS,
  })
}

// @desc    Çıkış yap
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  const cookieOptions = getAuthCookieOptions()

  res.cookie('token', 'none', {
    ...cookieOptions,
    expires: new Date(Date.now() + 10 * 1000),
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
  const { firstName, lastName, phone, birthDate } = req.body

  const updateFields = {
    ...(firstName !== undefined ? { firstName } : {}),
    ...(lastName !== undefined ? { lastName } : {}),
    ...(phone !== undefined ? { phone } : {}),
    ...(birthDate !== undefined ? { birthDate } : {}),
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    updateFields,
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

  const { fullName, phone, city, district, address } = req.body
  if (!fullName || !phone || !city || !district || !address) {
    res.status(400)
    throw new Error('Adres için zorunlu alanlar eksik.')
  }

  const shouldBeDefault = req.body.isDefault || user.addresses.length === 0
  if (shouldBeDefault) {
    user.addresses.forEach(addr => addr.isDefault = false)
  }

  user.addresses.push({
    ...req.body,
    isDefault: shouldBeDefault,
  })

  normalizeDefaultAddresses(user)
  await user.save()

  res.status(201).json({ success: true, data: user.addresses })
}

// @desc    Adres güncelle
// @route   PUT /api/auth/address/:addressId
// @access  Private
export const updateAddress = async (req, res) => {
  const user = await User.findById(req.user.id)
  const address = user.addresses.id(req.params.addressId)

  if (!address) {
    res.status(404)
    throw new Error('Adres bulunamadı.')
  }

  const fields = ['title', 'fullName', 'phone', 'city', 'district', 'neighborhood', 'address', 'isDefault']
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      address[field] = req.body[field]
    }
  })

  if (address.isDefault) {
    user.addresses.forEach((addr) => {
      if (addr._id.toString() !== req.params.addressId) {
        addr.isDefault = false
      }
    })
  }

  if (!address.fullName || !address.phone || !address.city || !address.district || !address.address) {
    res.status(400)
    throw new Error('Adres için zorunlu alanlar eksik.')
  }

  normalizeDefaultAddresses(user)
  await user.save()
  res.status(200).json({ success: true, data: user.addresses })
}

// @desc    Adres sil
// @route   DELETE /api/auth/address/:addressId
// @access  Private
export const deleteAddress = async (req, res) => {
  const user = await User.findById(req.user.id)

  user.addresses = user.addresses.filter(
    addr => addr._id.toString() !== req.params.addressId
  )

  normalizeDefaultAddresses(user)
  await user.save()
  res.status(200).json({ success: true, data: user.addresses })
}