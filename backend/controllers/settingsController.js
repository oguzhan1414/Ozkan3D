import { supabase } from '../config/supabase.js'
import { must, toApi, toDb, newSubId } from '../utils/db.js'
import { uploadImage, deleteImage, getPublicId } from '../utils/imageUpload.js'
import { getSettingsRow } from '../services/settingsService.js'

const SETTINGS_FIELDS = [
  'siteName', 'siteDesc', 'currency', 'language', 'timezone', 'logo',
  'localShippingCost', 'nearShippingCost', 'standardShippingCost', 'farShippingCost',
  'expressShippingSurcharge', 'carriers',
  'notifyNewOrder', 'notifyLowStock', 'notifyNewReview', 'notifyReturnRequest',
  'notifyNewCustomer', 'emailNotif', 'browserNotif', 'lowStockThreshold',
  'emailFrom', 'emailSender', 'heroSlides', 'defaultLeadMinDays', 'defaultLeadMaxDays',
  'bankName', 'bankOwner', 'bankIban',
]

const NUMERIC_FIELDS = [
  'local_shipping_cost', 'near_shipping_cost', 'standard_shipping_cost',
  'far_shipping_cost', 'express_shipping_surcharge', 'low_stock_threshold',
  'default_lead_min_days', 'default_lead_max_days',
]

const text = (value, max) => String(value || '').trim().slice(0, max)

// Buton bağlantısı: sadece site içi yol (/shop?...) veya http(s) adresi
const safeHref = (value) => {
  const v = text(value, 300)
  return /^\/(?!\/)/.test(v) || /^https?:\/\//i.test(v) ? v : ''
}

const normalizeHeroSlides = (slides) =>
  (Array.isArray(slides) ? slides : []).map((slide, index) => ({
    _id: slide?._id || newSubId(),
    imageUrl: String(slide?.imageUrl || ''),
    altText: text(slide?.altText, 140),
    // Görselin üzerindeki yazılar (hepsi isteğe bağlı)
    title: text(slide?.title, 80),
    subtitle: text(slide?.subtitle, 160),
    ctaLabel: text(slide?.ctaLabel, 40),
    ctaHref: safeHref(slide?.ctaHref),
    isActive: slide?.isActive !== false,
    sortOrder: Number.isFinite(Number(slide?.sortOrder)) ? Number(slide.sortOrder) : index,
  }))

// @desc    Ayarları getir
// @route   GET /api/settings
// @access  Public (site adı vs frontend için)
export const getSettings = async (req, res) => {
  res.status(200).json({ success: true, data: toApi(await getSettingsRow()) })
}

// @desc    Ayarları güncelle
// @route   PUT /api/settings
// @access  Admin
export const updateSettings = async (req, res) => {
  const current = await getSettingsRow('id, hero_slides, logo')
  const fields = toDb(req.body, SETTINGS_FIELDS)

  for (const key of NUMERIC_FIELDS) {
    if (key in fields) fields[key] = Number(fields[key]) || 0
  }
  if ('carriers' in fields) {
    fields.carriers = (Array.isArray(fields.carriers) ? fields.carriers : []).map(String).filter(Boolean)
  }
  if ('hero_slides' in fields) fields.hero_slides = normalizeHeroSlides(fields.hero_slides)
  for (const key of ['bank_name', 'bank_owner']) if (key in fields) fields[key] = text(fields[key], 80)
  if ('bank_iban' in fields) {
    // TR + 24 rakam; 4'erli gruplanarak saklanır
    const raw = String(fields.bank_iban || '').toUpperCase().replace(/\s+/g, '')
    if (!/^TR\d{24}$/.test(raw)) {
      res.status(400)
      throw new Error('IBAN "TR" ile başlayan 26 karakter olmalı.')
    }
    fields.bank_iban = raw.match(/.{1,4}/g).join(' ')
  }
  for (const key of ['default_lead_min_days', 'default_lead_max_days']) {
    if (key in fields) fields[key] = Math.min(60, Math.max(0, Math.trunc(fields[key])))
  }
  if ((fields.default_lead_min_days ?? 0) > (fields.default_lead_max_days ?? 60)) {
    res.status(400)
    throw new Error('Hazırlık süresinde en az gün, en fazla günden büyük olamaz.')
  }

  const row = Object.keys(fields).length
    ? must(await supabase.from('settings').update(fields).eq('id', current.id).select('*').single())
    : await getSettingsRow()

  // Artık kullanılmayan slider/logo görsellerini Storage'dan temizle
  const stillUsed = new Set([row.logo, ...(row.hero_slides || []).map((s) => s.imageUrl)])
  const removed = [current.logo, ...(current.hero_slides || []).map((s) => s.imageUrl)]
    .filter((url) => url && !stillUsed.has(url))
  for (const url of removed) {
    try {
      await deleteImage(getPublicId(url))
    } catch (err) {
      console.log('Eski slider görseli silinemedi:', err.message)
    }
  }

  res.status(200).json({ success: true, data: toApi(row) })
}

// @desc    Anasayfa slider görseli yükle
// @route   POST /api/settings/hero-image
// @access  Admin
export const uploadHeroImage = async (req, res) => {
  if (!req.file) {
    res.status(400)
    throw new Error('Yüklenecek görsel bulunamadı.')
  }

  const uploadResult = await uploadImage(req.file.buffer, 'home-hero')

  res.status(200).json({
    success: true,
    url: uploadResult.secure_url,
  })
}
