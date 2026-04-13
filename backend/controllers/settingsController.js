import Settings from '../models/Settings.js'

// @desc    Ayarları getir
// @route   GET /api/settings
// @access  Public (site adı vs frontend için)
export const getSettings = async (req, res) => {
  let settings = await Settings.findOne().lean()
  if (!settings) {
    const created = await Settings.create({})
    settings = created.toObject()
  }
  res.status(200).json({ success: true, data: settings })
}

// @desc    Ayarları güncelle
// @route   PUT /api/settings
// @access  Admin
export const updateSettings = async (req, res) => {
  let settings = await Settings.findOne()
  if (!settings) {
    settings = await Settings.create(req.body)
  } else {
    Object.keys(req.body).forEach(key => {
      settings[key] = req.body[key]
    })
    await settings.save()
  }
  res.status(200).json({ success: true, data: settings })
}

// @desc    Anasayfa slider görseli yükle
// @route   POST /api/settings/hero-image
// @access  Admin
export const uploadHeroImage = async (req, res) => {
  if (!req.file) {
    res.status(400)
    throw new Error('Yüklenecek görsel bulunamadı.')
  }

  const imageUrl = `/uploads/home-hero/${req.file.filename}`
  res.status(200).json({
    success: true,
    url: imageUrl,
  })
}