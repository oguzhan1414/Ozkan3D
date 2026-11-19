import crypto from 'crypto'
import path from 'path'
import { supabase } from '../config/supabase.js'
import { must, toApiList, toApi, isUuid, sanitizeSearch } from '../utils/db.js'
import { sendSupportRequestToAdmin, sendEmail } from '../utils/sendEmail.js'
import { optimizeImageBuffer } from '../utils/imageUpload.js'

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

const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

/**
 * Eki özel bucket'a yükler, storage yolunu döner.
 * Fotoğraflar Storage şişmesin diye küçültülüp WebP'ye çevrilir; PDF/Word olduğu gibi kalır.
 */
const uploadAttachment = async (userId, file) => {
  let body = file.buffer
  let contentType = file.mimetype
  let ext = path.extname(file.originalname || '').toLowerCase()

  if (IMAGE_TYPES.has(file.mimetype)) {
    try {
      body = await optimizeImageBuffer(file.buffer, 'support')
      contentType = 'image/webp'
      ext = '.webp'
    } catch {
      // Okunamayan görsel: olduğu gibi sakla (multer zaten 4 MB ile sınırlıyor)
    }
  }

  const storagePath = `${userId}/support-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`

  must(
    await supabase.storage.from(SUPPORT_BUCKET).upload(storagePath, body, {
      contentType,
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

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const SUPPORT_STATUSES = ['new', 'in-progress', 'resolved']

// @desc    Admin: destek talepleri
// @route   GET /api/support/admin
// @access  Admin
export const getSupportRequestsAdmin = async (req, res) => {
  const { status, keyword, page = 1, limit = 20 } = req.query
  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20))
  const from = (pageNum - 1) * limitNum

  let query = supabase
    .from('support_requests')
    .select('*, user:users(id, first_name, last_name, email, phone)', { count: 'exact' })
  if (SUPPORT_STATUSES.includes(status)) query = query.eq('status', status)
  const term = keyword ? sanitizeSearch(keyword) : ''
  if (term) query = query.or(`subject.ilike."*${term}*",email.ilike."*${term}*",message.ilike."*${term}*"`)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, from + limitNum - 1)
  must({ data, error })

  // Sekme rozetleri için durum sayıları
  const counts = {}
  await Promise.all(SUPPORT_STATUSES.map(async (s) => {
    const r = await supabase.from('support_requests').select('id', { count: 'exact', head: true }).eq('status', s)
    counts[s] = r.count || 0
  }))

  res.status(200).json({
    success: true,
    total: count || 0,
    pages: Math.max(1, Math.ceil((count || 0) / limitNum)),
    counts,
    data: toApiList(data, ['user']),
  })
}

// @desc    Admin: talep eki için kısa süreli bağlantı
// @route   GET /api/support/admin/:id/attachment
// @access  Admin
export const getSupportAttachment = async (req, res) => {
  const row = isUuid(req.params.id)
    ? must(await supabase.from('support_requests').select('attachment_url').eq('id', req.params.id).maybeSingle())
    : null
  if (!row?.attachment_url) {
    res.status(404)
    throw new Error('Ek bulunamadı.')
  }
  const { data, error } = await supabase.storage.from(SUPPORT_BUCKET).createSignedUrl(row.attachment_url, 10 * 60)
  if (error) {
    res.status(500)
    throw new Error('Ek bağlantısı oluşturulamadı.')
  }
  res.status(200).json({ success: true, url: data.signedUrl })
}

// @desc    Admin: durum güncelle ve/veya müşteriye yanıt gönder
// @route   PUT /api/support/admin/:id
// @access  Admin
export const updateSupportRequest = async (req, res) => {
  const row = isUuid(req.params.id)
    ? must(await supabase.from('support_requests').select('*').eq('id', req.params.id).maybeSingle())
    : null
  if (!row) {
    res.status(404)
    throw new Error('Talep bulunamadı.')
  }

  const fields = {}
  if (req.body.status !== undefined) {
    if (!SUPPORT_STATUSES.includes(req.body.status)) {
      res.status(400)
      throw new Error('Geçersiz durum.')
    }
    fields.status = req.body.status
  }

  const reply = String(req.body.reply || '').trim()
  if (reply) {
    if (reply.length > 3000) {
      res.status(400)
      throw new Error('Yanıt en fazla 3000 karakter olabilir.')
    }
    await sendEmail({
      to: row.email,
      subject: `Re: ${row.subject}`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111;max-width:640px;margin:0 auto;padding:20px;">
          <p>Merhaba,</p>
          <div style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:8px;padding:14px 16px;">${escapeHtml(reply).replace(/\r?\n/g, '<br/>')}</div>
          <p style="color:#666;font-size:13px;margin-top:18px;">Talebiniz: “${escapeHtml(row.subject)}”</p>
          <p style="margin-top:16px;">Saygılarımızla,<br/>Ozkan3d Ekibi</p>
        </div>
      `,
    })
    fields.admin_reply = reply
    fields.replied_at = new Date().toISOString()
    if (!fields.status && row.status === 'new') fields.status = 'in-progress'
  }

  if (!Object.keys(fields).length) {
    res.status(400)
    throw new Error('Değişiklik yok.')
  }

  const updated = must(await supabase
    .from('support_requests')
    .update(fields)
    .eq('id', row.id)
    .select('*, user:users(id, first_name, last_name, email, phone)')
    .single())
  res.status(200).json({ success: true, data: toApi(updated, ['user']) })
}
