import { sendContactEmailToAdmin } from '../utils/sendEmail.js'

// @desc    İletişim formu mesajı gönder
// @route   POST /api/contact
// @access  Public
export const submitContactForm = async (req, res) => {
  const { name, email, subject, message } = req.body

  if (!name || !email || !message) {
    res.status(400)
    throw new Error('Lütfen gerekli tüm alanları doldurun.')
  }

  try {
    await sendContactEmailToAdmin({ name, email, subject, message })
    res.status(200).json({ success: true, message: 'Mesajınız başarıyla gönderildi.' })
  } catch (err) {
    console.error('İletişim maili hatası:', err)
    res.status(500)
    throw new Error('Mesajınız gönderilemedi, lütfen daha sonra tekrar deneyin.')
  }
}
