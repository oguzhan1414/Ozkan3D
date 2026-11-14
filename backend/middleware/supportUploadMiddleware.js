import multer from 'multer'
import path from 'path'

// Dosya diske yazılmaz (Vercel'de kalıcı disk yok); buffer Supabase Storage'a yüklenir.
// Vercel istek gövdesi sınırı 4.5 MB olduğu için ek limiti 4 MB.
const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  const allowedExt = /pdf|jpeg|jpg|png|webp|txt|doc|docx/
  const extname = allowedExt.test(path.extname(file.originalname).toLowerCase())
  const mimetype = /application\/pdf|image\/jpeg|image\/jpg|image\/png|image\/webp|text\/plain|application\/msword|application\/vnd.openxmlformats-officedocument.wordprocessingml.document/.test(file.mimetype)

  if (extname && mimetype) {
    cb(null, true)
  } else {
    cb(new Error('Destek dosyası için sadece PDF, görsel, TXT, DOC ve DOCX yüklenebilir.'))
  }
}

export const supportUpload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter,
})
