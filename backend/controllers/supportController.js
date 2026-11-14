import crypto from 'crypto'
import path from 'path'
import { supabase } from '../config/supabase.js'
import { must, toApiList, toApi } from '../utils/db.js'
import { sendSupportRequestToAdmin } from '../utils/sendEmail.js'

const SUPPORT_BUCKET = 'support-attachments'
const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60 // admin mailindeki link 7 gün geçerli

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

/** Eki özel bucket'a yükler, storage yolunu döner */
const uploadAttachment = async (userId, file) => {
  const ext = path.extname(file.originalname || '').toLowerCase()
  const storagePath = `${userId}/support-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`

  must(
    await supabase.storage.from(SUPPORT_BUCKET).upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    })
  )
  return storagePath
}

const signedAttachmentUrl = async (storagePath) => {
  if (!storagePath) return ''
  const { data, error } = await supabase.storage
    .from(SUPPORT_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
  return error ? '' : data.signedUrl
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

  if (String(subject).trim().length > 140 || String(message).trim().length > 3000) {
    res.status(400)
    throw new Error('Konu en fazla 140, detay en fazla 3000 karakter olabilir.')
  }

  const attachmentPath = req.file ? await uploadAttachment(req.user._id, req.file) : null

  const row = must(
    await supabase
      .from('support_requests')
      .insert({
        user_id: req.user._id,
        email: String(email).trim().toLowerCase(),
        subject: String(subject).trim(),
        message: String(message).trim(),
        attachment_url: attachmentPath,
        attachment_name: req.file ? req.file.originalname : null,
      })
      .select('*')
      .single()
  )
  const ticket = toApi(row)

  try {
    await sendSupportRequestToAdmin({
      requestId: ticket._id,
      email: ticket.email,
      subject: ticket.subject,
      message: ticket.message,
      submittedAt: formatSubmittedAt(ticket.createdAt),
      attachmentName: ticket.attachmentName || 'Yok',
      attachmentUrl: await signedAttachmentUrl(attachmentPath),
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
  const rows = must(
    await supabase
      .from('support_requests')
      .select('*')
      .eq('user_id', req.user._id)
      .order('created_at', { ascending: false })
  )

  const preparedTickets = toApiList(rows).map((item) => ({
    ...item,
    createdAtDisplay: formatSubmittedAt(item.createdAt),
  }))

  res.status(200).json({ success: true, count: preparedTickets.length, data: preparedTickets })
}
