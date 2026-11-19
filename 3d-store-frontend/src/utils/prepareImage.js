// Yüklemeden önce görseli tarayıcıda küçültür: büyük telefon fotoğrafları
// (8-15 MB) Vercel'in 4.5 MB gövde sınırına takılmaz, yükleme de hızlanır.
// Asıl optimizasyon (WebP, boyut) yine sunucuda yapılır.

const MAX_SIDE = 2400
const TARGET_BYTES = 3.5 * 1024 * 1024
const ACCEPTED = /^image\/(jpeg|png|webp|gif|avif|heic|heif)$/i

export const isImageFile = (file) => file && (ACCEPTED.test(file.type) || /\.(jpe?g|png|webp|gif|avif)$/i.test(file.name))

const loadBitmap = async (file) => {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file) } catch { /* aşağıdaki yönteme düş */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** @returns {Promise<File>} gerekirse küçültülmüş WebP/JPEG dosyası */
export const prepareImage = async (file) => {
  const bitmap = await loadBitmap(file)
  const w = bitmap.width
  const h = bitmap.height
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h))
  if (scale === 1 && file.size <= TARGET_BYTES) return file

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()

  for (const quality of [0.9, 0.8, 0.7]) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
    if (blob && (blob.size <= TARGET_BYTES || quality === 0.7)) {
      const base = file.name.replace(/\.[^.]+$/, '')
      return new File([blob], `${base}.webp`, { type: 'image/webp' })
    }
  }
  return file
}
