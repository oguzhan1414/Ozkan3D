import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let transporter

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

export const sendEmail = async ({ to, subject, templateName, variables }) => {
  const html = loadTemplate(templateName, variables)

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
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

// Yeni üye bildirimi — admin'e
export const sendNewUserNotifyAdmin = async (user) => {
  await sendEmail({
    to: process.env.EMAIL_USER,
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
    to: process.env.EMAIL_USER,
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