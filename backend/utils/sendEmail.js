import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let transporter

const getAdminNotifyEmail = () => process.env.EMAIL_ADMIN_TO || process.env.EMAIL_USER

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  }
  return transporter
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

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html: mailHtml,
    attachments,
  })
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