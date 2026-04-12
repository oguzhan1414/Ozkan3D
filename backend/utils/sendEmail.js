import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'
import dns from 'node:dns'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let transporter
let transporterVerified = false
let transporterConfigKey = ''

try {
  // Railway ortamında IPv6 route yoksa SMTP bağlantısı ENETUNREACH verebilir.
  // DNS sıralamasını IPv4 öncelikli yaparak gmail host çözümlemesinde IPv4 tercih edilir.
  dns.setDefaultResultOrder('ipv4first')
} catch {
  // Node sürümü bu API'yi desteklemiyorsa sessizce varsayılana devam eder.
}

const getAdminNotifyEmail = () => process.env.EMAIL_ADMIN_TO || process.env.EMAIL_USER

const toBoolean = (value, fallback = false) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true
  if (['false', '0', 'no', 'n'].includes(normalized)) return false
  return fallback
}

const NETWORK_SMTP_ERROR_CODES = new Set([
  'ESOCKET',
  'ETIMEDOUT',
  'ECONNECTION',
  'ECONNREFUSED',
  'ENETUNREACH',
  'EHOSTUNREACH',
])

const isNetworkSmtpError = (error) => NETWORK_SMTP_ERROR_CODES.has(error?.code)

const getMailProvider = () => {
  const explicitProvider = process.env.MAIL_PROVIDER?.trim().toLowerCase()
  if (explicitProvider === 'resend' || explicitProvider === 'smtp') {
    return explicitProvider
  }

  if (process.env.RESEND_API_KEY?.trim()) return 'resend'
  return 'smtp'
}

const getResendConfig = () => {
  let apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM?.trim() || process.env.EMAIL_FROM || process.env.EMAIL_USER

  if (apiKey) {
    apiKey = apiKey
      .replace(/^['"]+|['"]+$/g, '')
      .replace(/^Bearer\s+/i, '')
      .replace(/\s+/g, '')
  }

  if (!apiKey) {
    throw new Error('RESEND_API_KEY tanımlı değil.')
  }

  if (!apiKey.startsWith('re_')) {
    throw new Error('RESEND_API_KEY formatı geçersiz. Anahtar re_ ile başlamalıdır.')
  }

  if (!from) {
    throw new Error('RESEND_FROM veya EMAIL_FROM tanımlı değil.')
  }

  return { apiKey, from }
}

const normalizeResendAttachments = (attachments = []) => {
  if (!Array.isArray(attachments) || !attachments.length) return undefined

  const normalized = []

  for (const item of attachments) {
    const filename = item?.filename || item?.name || null
    if (!filename) continue

    let base64Content = null
    if (item?.content) {
      base64Content = Buffer.isBuffer(item.content)
        ? item.content.toString('base64')
        : Buffer.from(String(item.content)).toString('base64')
    } else if (item?.path && fs.existsSync(item.path)) {
      base64Content = fs.readFileSync(item.path).toString('base64')
    }

    if (!base64Content) continue

    normalized.push({
      filename,
      content: base64Content,
    })
  }

  return normalized.length ? normalized : undefined
}

const sendEmailViaResend = async ({ to, subject, html, attachments = [] }) => {
  const { apiKey, from } = getResendConfig()

  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  }

  const resendAttachments = normalizeResendAttachments(attachments)
  if (resendAttachments) payload.attachments = resendAttachments

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    const resendError = new Error(`Resend API hatası: ${response.status} ${errorText}`)
    resendError.code = `RESEND_${response.status}`
    throw resendError
  }

  console.log('📧 Mail Resend API ile gönderildi')
}

const getSmtpConfig = () => {
  const host = process.env.EMAIL_HOST?.trim()
  const rawPort = String(process.env.EMAIL_PORT || '587').trim()
  const normalizedPort = Number(rawPort.replace(/[^\d]/g, ''))
  const port = Number.isFinite(normalizedPort) && normalizedPort > 0 ? normalizedPort : 587
  const user = process.env.EMAIL_USER?.trim()
  let pass = process.env.EMAIL_PASS?.trim()

  if (!host || !port || !user || !pass) {
    throw new Error('EMAIL_HOST, EMAIL_PORT, EMAIL_USER ve EMAIL_PASS zorunludur.')
  }

  // Gmail app password değeri bazen "xxxx xxxx xxxx xxxx" formatında giriliyor.
  // SMTP doğrulamasında tek parça olması daha güvenli olduğu için boşlukları temizliyoruz.
  if (/gmail\.com$/i.test(host) || /@gmail\.com$/i.test(user)) {
    pass = pass.replace(/\s+/g, '')
  }

  const secure =
    process.env.EMAIL_SECURE !== undefined
      ? toBoolean(process.env.EMAIL_SECURE, false)
      : port === 465

  return {
    host,
    port,
    secure,
    family: 4,
    connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT || 15000),
    greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT || 10000),
    socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT || 20000),
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { ...options, family: 4, all: false }, callback)
    },
    tls: {
      servername: host,
    },
    auth: { user, pass },
  }
}

const createTransporter = (smtpConfig) => nodemailer.createTransport(smtpConfig)

const getTransporter = () => {
  const smtpConfig = getSmtpConfig()
  const configKey = `${smtpConfig.host}:${smtpConfig.port}:${smtpConfig.secure}`

  if (!transporter || transporterConfigKey !== configKey) {
    transporter = createTransporter(smtpConfig)
    transporterVerified = false
    transporterConfigKey = configKey
  }

  return transporter
}

const verifyTransporter = async () => {
  if (transporterVerified) return

  const smtpConfig = getSmtpConfig()
  await getTransporter().verify()
  transporterVerified = true
  console.log(
    `📧 SMTP doğrulandı: host=${smtpConfig.host}, port=${smtpConfig.port}, secure=${smtpConfig.secure}`
  )
}

const attemptFallbackSend = async (mailPayload, originalConfig) => {
  const allowPortFallback = process.env.EMAIL_ALLOW_PORT_FALLBACK !== 'false'
  if (!allowPortFallback) return false
  if (originalConfig.port !== 587) return false

  const fallbackConfig = {
    ...originalConfig,
    port: 465,
    secure: true,
  }

  console.warn('⚠️ SMTP 587 başarısız oldu, 465 fallback deneniyor...')
  const fallbackTransporter = createTransporter(fallbackConfig)
  await fallbackTransporter.verify()
  await fallbackTransporter.sendMail(mailPayload)

  transporter = fallbackTransporter
  transporterVerified = true
  transporterConfigKey = `${fallbackConfig.host}:${fallbackConfig.port}:${fallbackConfig.secure}`
  console.log('✅ SMTP fallback başarılı: 465/secure')
  return true
}

const loadTemplate = (templateName, variables) => {
  const templatePath = path.join(__dirname, '../templates', `${templateName}.html`)
  let template = fs.readFileSync(templatePath, 'utf-8')

  Object.keys(variables).forEach(key => {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), variables[key])
  })

  return template
}

export const sendEmail = async ({ to, subject, templateName, variables, html, attachments = [] }) => {
  const mailHtml = html || loadTemplate(templateName, variables)
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER
  const provider = getMailProvider()

  if (provider === 'resend') {
    await sendEmailViaResend({
      to,
      subject,
      html: mailHtml,
      attachments,
    })
    return
  }

  const mailPayload = {
    from,
    to,
    subject,
    html: mailHtml,
    attachments,
  }

  try {
    await verifyTransporter()

    await getTransporter().sendMail(mailPayload)
  } catch (error) {
    try {
      const smtpConfig = getSmtpConfig()
      if (isNetworkSmtpError(error)) {
        const fallbackWorked = await attemptFallbackSend(mailPayload, smtpConfig)
        if (fallbackWorked) return
      }

      if (isNetworkSmtpError(error) && process.env.RESEND_API_KEY?.trim()) {
        await sendEmailViaResend({
          to,
          subject,
          html: mailHtml,
          attachments,
        })
        return
      }
    } catch (fallbackError) {
      console.error('❌ SMTP fallback hatası:', {
        message: fallbackError.message,
        code: fallbackError.code,
        command: fallbackError.command,
        responseCode: fallbackError.responseCode,
        response: fallbackError.response,
      })
    }

    console.error('❌ Mail gönderim hatası:', {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response,
    })
    throw error
  }
}

// Hazır mail fonksiyonları
export const sendOrderConfirmEmail = async (order, user) => {
  await sendEmail({
    to: user.email,
    subject: `Siparişiniz Alındı — ${order.orderNo}`,
    templateName: 'orderConfirm',
    variables: {
      name: user.name,
      orderNo: order.orderNo,
      totalPrice: order.totalPrice,
      status: order.status,
      year: new Date().getFullYear(),
    },
  })
}

export const sendShippingEmail = async (order, user) => {
  await sendEmail({
    to: user.email,
    subject: `Siparişiniz Kargoya Verildi — ${order.orderNo}`,
    templateName: 'shippingNotify',
    variables: {
      name: user.name,
      orderNo: order.orderNo,
      trackingNo: order.trackingNo,
      carrier: order.carrier,
      year: new Date().getFullYear(),
    },
  })
}

export const sendPasswordResetEmail = async (user, resetUrl) => {
  await sendEmail({
    to: user.email,
    subject: 'Şifre Sıfırlama Talebi',
    templateName: 'passwordReset',
    variables: {
      name: user.name,
      resetUrl,
      year: new Date().getFullYear(),
    },
  })
}

export const sendWelcomeEmail = async (user) => {
  await sendEmail({
    to: user.email,
    subject: '🎉 Ozkan3D.design\'a Hoş Geldiniz!',
    templateName: 'welcome',
    variables: {
      firstName: user.firstName,
      lastName: user.lastName,
      clientUrl: process.env.CLIENT_URL,
      year: new Date().getFullYear(),
    },
  })
}

export const sendEmailVerificationEmail = async (user, verifyUrl) => {
  await sendEmail({
    to: user.email,
    subject: 'E-posta Adresini Doğrula',
    templateName: 'verifyEmail',
    variables: {
      firstName: user.firstName,
      verifyUrl,
      year: new Date().getFullYear(),
    },
  })
}

// Yeni üye bildirimi — admin'e
export const sendNewUserNotifyAdmin = async (user) => {
  await sendEmail({
    to: getAdminNotifyEmail(),
    subject: `👤 Yeni Üye: ${user.firstName} ${user.lastName}`,
    templateName: 'newUserAdmin',
    variables: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || 'Belirtilmedi',
      date: new Date().toLocaleDateString('tr-TR', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      adminUrl: process.env.CLIENT_URL,
      year: new Date().getFullYear(),
    },
  })
}

// İletişim Formu (Contact) -> admin'e
export const sendContactEmailToAdmin = async (data) => {
  await sendEmail({
    to: getAdminNotifyEmail(),
    subject: `Yeni İletişim Mesajı: ${data.subject}`,
    templateName: 'contactMsgAdmin',
    variables: {
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      date: new Date().toLocaleDateString('tr-TR', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
    },
  })
}

// Fiyat Düşüşü Bildirimi
export const sendPriceDropEmail = async (user, product, oldPrice) => {
  await sendEmail({
    to: user.email,
    subject: `🔥 Favorilerindeki ${product.name} İndirime Girdi!`,
    templateName: 'priceDrop',
    variables: {
      firstName: user.firstName,
      productName: product.name,
      oldPrice,
      newPrice: product.price,
      productUrl: `${process.env.CLIENT_URL}/product/${product.slug || product._id}`,
      year: new Date().getFullYear(),
    },
  })
}

export const sendSupportRequestToAdmin = async (data) => {
  const fileUrl = data.attachmentUrl
    ? `${process.env.SERVER_URL || 'http://localhost:5000'}${data.attachmentUrl}`
    : 'Yok'

  await sendEmail({
    to: getAdminNotifyEmail(),
    subject: `Yeni Destek Talebi: ${data.subject}`,
    templateName: 'supportRequestAdmin',
    variables: {
      requestId: data.requestId,
      email: data.email,
      subject: data.subject,
      message: data.message,
      submittedAt: data.submittedAt,
      attachmentName: data.attachmentName || 'Yok',
      attachmentUrl: fileUrl,
    },
  })
}