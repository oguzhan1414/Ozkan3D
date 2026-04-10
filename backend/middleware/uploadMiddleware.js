import multer from 'multer'

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
  if (allowedMimeTypes.has(file.mimetype)) cb(null, true)
  else cb(new Error('Sadece jpeg, jpg, png ve webp desteklenir.'))
}

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
})