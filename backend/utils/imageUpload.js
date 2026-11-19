import crypto from 'crypto'
import sharp from 'sharp'
import { supabase, SUPABASE_URL } from '../config/supabase.js'

/**
 * Ürün ve slider görselleri — Supabase Storage ("media" public bucket).
 * Eskiden Cloudinary kullanılıyordu; fonksiyon isimleri ve dönüş şekli
 * ({ secure_url }) aynı tutuldu, controller'lar değişmedi.
 *
 * Supabase'in ücretsiz planında görsel dönüştürme olmadığı için Cloudinary'nin
 * yaptığı küçültme/sıkıştırma burada sharp ile yapılır.
 */

export const MEDIA_BUCKET = 'media'

const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/`

// Klasöre göre maksimum boyut (px). Slider geniş, ürün görselleri kare ağırlıklı.
const MAX_SIZE = {
  products: { width: 1200, height: 1200 },
  support: { width: 2000, height: 2000 },
  'home-hero': { width: 1920, height: 1080 },
  categories: { width: 1448, height: 1086 },
}

// Storage şişmesin diye: her görsel küçültülür ve WebP'ye çevrilir.
// quality 80 + effort 5: gerçek ürün fotoğraflarında eski ayara (q82) göre ~%11 daha küçük,
// gözle fark edilmez. (smartSubsample dosyayı büyüttüğü için kullanılmıyor; q78 ~%22
// küçültür ama ürün netliği için 80'de kalındı.)
// EXIF/konum gibi metadata sharp varsayılanıyla atılır.
const WEBP_OPTIONS = { quality: 80, effort: 5 }

// Çok büyük (ör. 100 MP) görseller sunucuyu yormasın
const MAX_INPUT_PIXELS = 50_000_000

/** Görseli küçültür, EXIF yönünü düzeltir, WebP'ye çevirir */
export const optimizeImageBuffer = async (buffer, folder = 'products') => {
  const { width, height } = MAX_SIZE[folder] || MAX_SIZE.products
  return sharp(buffer, { failOn: 'error', limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({ width, height, fit: 'inside', withoutEnlargement: true })
    .webp(WEBP_OPTIONS)
    .toBuffer()
}

/**
 * @param {Buffer} fileBuffer
 * @param {'products'|'home-hero'} folder
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
export const uploadImage = async (fileBuffer, folder = 'products') => {
  let optimized
  try {
    optimized = await optimizeImageBuffer(fileBuffer, folder)
  } catch {
    const err = new Error('Görsel okunamadı. Geçerli bir JPEG, PNG veya WebP yükleyin.')
    err.statusCode = 400
    throw err
  }

  const path = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, optimized, {
    contentType: 'image/webp',
    cacheControl: '31536000', // dosya adı benzersiz, 1 yıl önbelleklenebilir
    upsert: false,
  })

  if (error) {
    const err = new Error(`Görsel yüklenemedi: ${error.message}`)
    err.statusCode = 500
    throw err
  }

  return { secure_url: `${PUBLIC_PREFIX}${path}`, public_id: path }
}

/** URL bizim bucket'ımıza aitse storage yolunu döner, değilse null */
export const getPublicId = (imageUrl) => {
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith(PUBLIC_PREFIX)) return null
  return decodeURIComponent(imageUrl.slice(PUBLIC_PREFIX.length).split('?')[0])
}

/** Storage'dan siler. Dış URL'ler (null) sessizce atlanır. */
export const deleteImage = async (path) => {
  if (!path) return null
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path])
  if (error) throw new Error(error.message)
  return { result: 'ok' }
}

/**
 * Görsel hâlâ bir siparişte ya da sepette kullanılıyorsa silmez
 * (sipariş geçmişindeki küçük resimler kırılmasın). Dış URL'leri atlar.
 * @returns {Promise<boolean>} silindiyse true
 */
export const deleteImageIfUnused = async (url) => {
  const path = getPublicId(url)
  if (!path) return false

  // Kopyalanan ürünler aynı görseli paylaşabilir; başka üründe kullanılıyorsa silme
  const [orders, carts, products] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).contains('items', [{ image: url }]),
    supabase.from('carts').select('id', { count: 'exact', head: true }).contains('items', [{ image: url }]),
    supabase.from('products').select('id', { count: 'exact', head: true }).contains('images', [url]),
  ])
  if ((orders.count || 0) > 0 || (carts.count || 0) > 0 || (products.count || 0) > 0) return false

  await deleteImage(path)
  return true
}
