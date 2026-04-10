import SupportRequest from '../models/SupportRequest.js'
import { sendSupportRequestToAdmin } from '../utils/sendEmail.js'

const formatSubmittedAt = (dateValue) => {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateValue))
}

// @desc    Destek talebi oluştur
// @route   POST /api/support
// @access  Private
export const createSupportRequest = async (req, res) => {
  const { email, subject, message } = req.body

  if (!email || !subject || !message) {
    res.status(400)
    throw new Error('E-posta, konu ve detay alanları zorunludur.')
  }

  const attachmentUrl = req.file ? `/uploads/support/${req.file.filename}` : ''
  const attachmentName = req.file ? req.file.originalname : ''

  const ticket = await SupportRequest.create({
    user: req.user._id,
    email: String(email).trim().toLowerCase(),
    subject: String(subject).trim(),
    message: String(message).trim(),
    attachmentUrl,
    attachmentName,
  })

  try {
    await sendSupportRequestToAdmin({
      requestId: ticket._id,
      email: ticket.email,
      subject: ticket.subject,
      message: ticket.message,
      submittedAt: formatSubmittedAt(ticket.createdAt),
      attachmentName: ticket.attachmentName || 'Yok',
      attachmentUrl: ticket.attachmentUrl || '',
    })
  } catch (err) {
    console.log('Destek talebi maili gönderilemedi:', err.message)
  }

  res.status(201).json({ success: true, data: ticket, message: 'Destek talebiniz alındı.' })
}

// @desc    Kullanıcının destek taleplerini getir
// @route   GET /api/support/mine
// @access  Private
export const getMySupportRequests = async (req, res) => {
  const tickets = await SupportRequest.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .lean()

  const preparedTickets = tickets.map((item) => ({
    ...item,
    createdAtDisplay: formatSubmittedAt(item.createdAt),
  }))

  res.status(200).json({ success: true, count: preparedTickets.length, data: preparedTickets })
}
