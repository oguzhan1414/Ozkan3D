import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import { supabase } from '../config/supabase.js'
import { must, newSubId } from '../utils/db.js'
import { getSettingsRow } from '../services/settingsService.js'
import { sendTokenResponse, getAuthCookieOptions } from '../utils/generateToken.js'
import {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendNewUserNotifyAdmin,
  sendEmailVerificationEmail,
} from '../utils/sendEmail.js'
import { broadcast, adminChannel, userChannel } from '../utils/realtime.js'
import {
  hashPassword,
  matchPassword,
  userToApi,
  findUserRowById,
  findUserRowByEmail,
  updateUserRow,
  deleteUserRow,
} from '../services/userService.js'

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
const EMAIL_VERIFY_WINDOW_MS = 3 * 60 * 1000
const EMAIL_VERIFY_WINDOW_SECONDS = Math.floor(EMAIL_VERIFY_WINDOW_MS / 1000)
const EMAIL_REGEX = /^\S+@\S+\.\S+$/
const PHONE_REGEX = /^\+90\d{10}$/
const ADDRESS_FIELDS = ['title', 'fullName', 'phone', 'city', 'district', 'neighborhood', 'address', 'isDefault']

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')

const isVerificationExpired = (row) => {
  if (!row?.email_verify_expire) return false
  return new Date(row.email_verify_expire).getTime() <= Date.now()
}

const remainingVerifySeconds = (row) =>
  Math.max(1, Math.ceil((new Date(row.email_verify_expire).getTime() - Date.now()) / 1000))

const cleanupExpiredUnverifiedUsers = async () => {
  must(
    await supabase
      .from('users')
      .delete()
      .eq('email_verified', false)
      .eq('role', 'user')
      .lte('email_verify_expire', new Date().toISOString())
  )
}

/** Yeni doğrulama token'ı üretir, hash'ini kaydeder, düz halini döner */
const issueEmailVerifyToken = async (userId) => {
  const verifyToken = crypto.randomBytes(20).toString('hex')
  await updateUserRow(userId, {
    email_verify_token: sha256(verifyToken),
    email_verify_expire: new Date(Date.now() + EMAIL_VERIFY_WINDOW_MS).toISOString(),
  })
  return verifyToken
}

const notifyNewVerifiedUser = async (user) => {
  try {
    await sendWelcomeEmail(user)
  } catch (err) {
    console.log('Hoş geldin maili gönderilemedi:', err.message)
  }

  try {
    const { notify_new_customer: notifyUser } = await getSettingsRow('notify_new_customer')
    if (notifyUser) await sendNewUserNotifyAdmin(user)
  } catch (err) {
    console.log('Admin bildirimi gönderilemedi:', err.message)
  }

  await broadcast(adminChannel(), 'newUser', {
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

/** Tam olarak bir varsayılan adres kalmasını sağlar */
const normalizeDefaultAddresses = (addresses = []) => {
  if (addresses.length === 0) return addresses
  const firstDefault = addresses.findIndex((a) => a.isDefault)
  const keep = firstDefault === -1 ? 0 : firstDefault
  return addresses.map((a, i) => ({ ...a, isDefault: i === keep }))
}

const pickAddressFields = (body = {}) => {
  const out = {}
  for (const key of ADDRESS_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key]
  }
  return out
}

const hasRequiredAddressFields = (a) => a.fullName && a.phone && a.city && a.district && a.address

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

  if (String(password).length < 8) {
    res.status(400)
    throw new Error('Şifre en az 8 karakter olmalıdır')
  }

  if (String(firstName).trim().length > 30 || String(lastName).trim().length > 30) {
    res.status(400)
    throw new Error('Ad ve soyad 30 karakterden uzun olamaz')
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

  const existing = await findUserRowByEmail(normalizedEmail)
  if (existing) {
    if (existing.email_verified === false && existing.role !== 'admin') {
      if (isVerificationExpired(existing)) {
        await deleteUserRow(existing.id)
      } else {
        res.status(409)
        throw new Error(
          `Bu e-posta için doğrulama bekleniyor. Kalan süre: ${remainingVerifySeconds(existing)} saniye. Mailinizi doğrulayın veya süre dolunca tekrar kayıt olun.`
        )
      }
    } else {
      res.status(400)
      throw new Error('Bu e-posta adresi zaten kayıtlı.')
    }
  }

  const row = must(
    await supabase
      .from('users')
      .insert({
        first_name: String(firstName).trim(),
        last_name: String(lastName).trim(),
        email: normalizedEmail,
        password: await hashPassword(password),
        phone: normalizedPhone,
        birth_date: parsedBirthDate.toISOString(),
        email_verified: false,
      })
      .select('*')
      .single()
  )

  const verifyToken = await issueEmailVerifyToken(row.id)
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`

  try {
    await sendEmailVerificationEmail(userToApi(row), verifyUrl)
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

  const row = await findUserRowByEmail(email)
  if (!row || !(await matchPassword(password, row.password))) {
    res.status(401)
    throw new Error('E-posta veya şifre hatalı.')
  }

  if (!row.is_active) {
    res.status(401)
    throw new Error('Hesabınız devre dışı bırakılmış.')
  }

  if (row.role !== 'admin' && row.email_verified === false) {
    if (isVerificationExpired(row)) {
      await deleteUserRow(row.id)
      res.status(410)
      throw new Error('E-posta doğrulama süresi dolduğu için kayıt iptal edildi. Lütfen tekrar kayıt olun.')
    }

    res.status(403)
    throw new Error(`Giriş yapmadan önce e-posta adresinizi doğrulayın. Kalan süre: ${remainingVerifySeconds(row)} saniye.`)
  }

  sendTokenResponse(userToApi(row), 200, res)
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
    audience: process.env.GOOGLE_CLIENT_ID,
  })
  const { sub, email, given_name, family_name } = ticket.getPayload()
  const normalizedEmail = String(email || '').trim().toLowerCase()

  const existing = await findUserRowByEmail(normalizedEmail)
  let user

  if (existing) {
    user = userToApi(existing)
    if (!existing.google_id || existing.email_verified !== true) {
      user = await updateUserRow(existing.id, {
        google_id: sub,
        email_verified: true,
        email_verify_token: null,
        email_verify_expire: null,
      })
    }
    if (!existing.is_active) {
      res.status(401)
      throw new Error('Hesabınız devre dışı bırakılmış.')
    }
  } else {
    const row = must(
      await supabase
        .from('users')
        .insert({
          first_name: String(given_name || 'Kullanıcı').slice(0, 30),
          last_name: String(family_name || 'Kullanıcısı').slice(0, 30),
          email: normalizedEmail,
          password: await hashPassword(crypto.randomBytes(16).toString('hex')),
          google_id: sub,
          email_verified: true,
        })
        .select('*')
        .single()
    )
    user = userToApi(row)
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

  const row = must(
    await supabase
      .from('users')
      .select('*')
      .eq('email_verify_token', sha256(req.params.token))
      .maybeSingle()
  )

  if (!row) {
    res.status(400)
    throw new Error('Doğrulama bağlantısı geçersiz veya süresi dolmuş.')
  }

  if (row.email_verified === true) {
    res.status(200).json({
      success: true,
      message: 'E-posta adresiniz zaten doğrulanmış. Giriş yapabilirsiniz.',
    })
    return
  }

  if (isVerificationExpired(row)) {
    await deleteUserRow(row.id)
    res.status(410)
    throw new Error('Doğrulama süresi dolduğu için kayıt iptal edildi. Lütfen tekrar kayıt olun.')
  }

  const user = await updateUserRow(row.id, { email_verified: true })
  await notifyNewVerifiedUser(user)

  res.status(200).json({
    success: true,
    message: 'E-posta adresiniz doğrulandı. Artık giriş yapabilirsiniz.',
  })
}

// @desc    Doğrulama mailini yeniden gönder
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerificationEmail = async (req, res) => {
  const normalizedEmail = String(req.body.email || '').trim().toLowerCase()

  if (!normalizedEmail) {
    res.status(400)
    throw new Error('E-posta adresi zorunludur.')
  }

  const row = await findUserRowByEmail(normalizedEmail)
  if (!row) {
    res.status(404)
    throw new Error('Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.')
  }

  if (row.email_verified === true) {
    res.status(400)
    throw new Error('Bu e-posta adresi zaten doğrulanmış.')
  }

  if (isVerificationExpired(row)) {
    await deleteUserRow(row.id)
    res.status(410)
    throw new Error('Doğrulama süresi dolduğu için kayıt iptal edildi. Lütfen tekrar kayıt olun.')
  }

  const verifyToken = await issueEmailVerifyToken(row.id)
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`

  try {
    await sendEmailVerificationEmail(userToApi(row), verifyUrl)
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
  res.cookie('token', 'none', {
    ...getAuthCookieOptions(),
    expires: new Date(Date.now() + 10 * 1000),
  })

  res.status(200).json({ success: true, message: 'Başarıyla çıkış yapıldı.' })
}

// @desc    Mevcut kullanıcıyı getir
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  res.status(200).json({ success: true, data: req.user })
}

// @desc    Realtime bildirim kanallarını getir (socket.io yerine)
// @route   GET /api/auth/realtime
// @access  Private
export const getRealtimeChannels = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: userChannel(req.user._id),
      admin: req.user.role === 'admin' ? adminChannel() : null,
    },
  })
}

// @desc    Profil güncelle
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  const { firstName, lastName, phone, birthDate } = req.body
  const fields = {}

  if (firstName !== undefined) fields.first_name = String(firstName).trim()
  if (lastName !== undefined) fields.last_name = String(lastName).trim()
  if (phone !== undefined) fields.phone = phone ? String(phone).trim() : null
  if (birthDate !== undefined) fields.birth_date = birthDate || null

  if ((fields.first_name !== undefined && !fields.first_name) || (fields.last_name !== undefined && !fields.last_name)) {
    res.status(400)
    throw new Error('Ad ve soyad boş bırakılamaz.')
  }

  const user = Object.keys(fields).length ? await updateUserRow(req.user._id, fields) : req.user
  res.status(200).json({ success: true, data: user })
}

// @desc    Şifre değiştir
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body

  const row = await findUserRowById(req.user._id)

  if (!(await matchPassword(currentPassword, row?.password))) {
    res.status(401)
    throw new Error('Mevcut şifre hatalı.')
  }

  if (!newPassword || String(newPassword).length < 8) {
    res.status(400)
    throw new Error('Şifre en az 8 karakter olmalıdır')
  }

  const user = await updateUserRow(row.id, { password: await hashPassword(newPassword) })
  sendTokenResponse(user, 200, res)
}

// @desc    Şifre sıfırlama linki gönder
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  const row = await findUserRowByEmail(req.body.email)

  if (!row) {
    res.status(404)
    throw new Error('Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.')
  }

  const resetToken = crypto.randomBytes(20).toString('hex')
  const user = await updateUserRow(row.id, {
    reset_password_token: sha256(resetToken),
    reset_password_expire: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 dakika
  })

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`

  try {
    await sendPasswordResetEmail(user, resetUrl)
    res.status(200).json({ success: true, message: 'Şifre sıfırlama linki e-posta adresinize gönderildi.' })
  } catch (error) {
    await updateUserRow(row.id, { reset_password_token: null, reset_password_expire: null })
    res.status(500)
    throw new Error('E-posta gönderilemedi, lütfen tekrar deneyin.')
  }
}

// @desc    Şifreyi sıfırla
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
  const row = must(
    await supabase
      .from('users')
      .select('id')
      .eq('reset_password_token', sha256(req.params.token))
      .gt('reset_password_expire', new Date().toISOString())
      .maybeSingle()
  )

  if (!row) {
    res.status(400)
    throw new Error('Geçersiz veya süresi dolmuş token.')
  }

  if (!req.body.password || String(req.body.password).length < 8) {
    res.status(400)
    throw new Error('Şifre en az 8 karakter olmalıdır')
  }

  const user = await updateUserRow(row.id, {
    password: await hashPassword(req.body.password),
    reset_password_token: null,
    reset_password_expire: null,
  })

  sendTokenResponse(user, 200, res)
}

// @desc    Adres ekle
// @route   POST /api/auth/address
// @access  Private
export const addAddress = async (req, res) => {
  const fields = pickAddressFields(req.body)
  if (!hasRequiredAddressFields(fields)) {
    res.status(400)
    throw new Error('Adres için zorunlu alanlar eksik.')
  }

  const current = req.user.addresses || []
  const shouldBeDefault = Boolean(fields.isDefault) || current.length === 0

  let addresses = shouldBeDefault ? current.map((a) => ({ ...a, isDefault: false })) : [...current]
  addresses.push({ title: 'Ev', ...fields, _id: newSubId(), isDefault: shouldBeDefault })
  addresses = normalizeDefaultAddresses(addresses)

  const user = await updateUserRow(req.user._id, { addresses })
  res.status(201).json({ success: true, data: user.addresses })
}

// @desc    Adres güncelle
// @route   PUT /api/auth/address/:addressId
// @access  Private
export const updateAddress = async (req, res) => {
  const current = req.user.addresses || []
  const index = current.findIndex((a) => a._id === req.params.addressId)

  if (index === -1) {
    res.status(404)
    throw new Error('Adres bulunamadı.')
  }

  const updated = { ...current[index], ...pickAddressFields(req.body) }

  if (!hasRequiredAddressFields(updated)) {
    res.status(400)
    throw new Error('Adres için zorunlu alanlar eksik.')
  }

  let addresses = current.map((a, i) => {
    if (i === index) return updated
    return updated.isDefault ? { ...a, isDefault: false } : a
  })
  addresses = normalizeDefaultAddresses(addresses)

  const user = await updateUserRow(req.user._id, { addresses })
  res.status(200).json({ success: true, data: user.addresses })
}

// @desc    Adres sil
// @route   DELETE /api/auth/address/:addressId
// @access  Private
export const deleteAddress = async (req, res) => {
  const addresses = normalizeDefaultAddresses(
    (req.user.addresses || []).filter((a) => a._id !== req.params.addressId)
  )

  const user = await updateUserRow(req.user._id, { addresses })
  res.status(200).json({ success: true, data: user.addresses })
}
