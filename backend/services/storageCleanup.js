import { supabase } from '../config/supabase.js'
import { must } from '../utils/db.js'
import { getPublicId, MEDIA_BUCKET } from '../utils/imageUpload.js'

/**
 * Storage raporu ve sahipsiz dosya temizliği.
 * Hem `npm run storage:audit` komutu hem de haftalık Vercel cron görevi bunu kullanır.
 *
 * "Sahipsiz" = hiçbir ürün, slayt, kategori, sipariş, sepet ya da destek talebinde
 * kullanılmayan dosya. Yeni yüklenip henüz kaydedilmemiş dosyalar (ör. ayarlarda
 * yüklenen ama kaydedilmeyen slider görseli) silinmesin diye 24 saatten yenilere dokunulmaz.
 */

const GRACE_MS = 24 * 60 * 60 * 1000
export const SUPPORT_BUCKET = 'support-attachments'

/** Bucket'taki tüm dosyalar (klasörler dahil, özyinelemeli) */
const listAll = async (bucket, prefix = '') => {
  const files = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset })
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`)
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) files.push(...(await listAll(bucket, path))) // klasör
      else files.push({ path, size: item.metadata?.size || 0, createdAt: item.created_at })
    }
    if (data.length < 1000) break
  }
  return files
}

/** Veritabanında kullanılan media dosya yolları */
const usedMediaPaths = async () => {
  const [products, settings, categories, orders, carts] = await Promise.all([
    supabase.from('products').select('images, image_variants'),
    supabase.from('settings').select('hero_slides, logo'),
    supabase.from('categories').select('image_url'),
    supabase.from('orders').select('items'),
    supabase.from('carts').select('items'),
  ])

  const urls = []
  for (const p of must(products)) urls.push(...(p.images || []), ...(p.image_variants || []).map((v) => v.url))
  for (const s of must(settings)) urls.push(s.logo, ...(s.hero_slides || []).map((h) => h.imageUrl))
  for (const c of must(categories)) urls.push(c.image_url)
  for (const o of [...must(orders), ...must(carts)]) urls.push(...(o.items || []).map((i) => i.image))

  return new Set(urls.map(getPublicId).filter(Boolean))
}

const usedSupportPaths = async () => {
  const rows = must(await supabase.from('support_requests').select('attachment_url'))
  return new Set(rows.map((r) => r.attachment_url).filter(Boolean))
}

const summarize = (bucket, files, used) => {
  const folders = {}
  for (const f of files) {
    const folder = f.path.includes('/') ? f.path.split('/')[0] : '(kök)'
    folders[folder] ||= { count: 0, size: 0 }
    folders[folder].count++
    folders[folder].size += f.size
  }
  const now = Date.now()
  const orphans = files.filter((f) => !used.has(f.path))
  const removable = orphans.filter((f) => now - new Date(f.createdAt).getTime() > GRACE_MS)

  return {
    bucket,
    count: files.length,
    size: files.reduce((s, f) => s + f.size, 0),
    folders,
    orphanCount: orphans.length,
    orphanSize: orphans.reduce((s, f) => s + f.size, 0),
    recentOrphans: orphans.length - removable.length,
    removable,
    deleted: 0,
  }
}

const removeFiles = async (bucket, files) => {
  for (let i = 0; i < files.length; i += 100) {
    const { error } = await supabase.storage.from(bucket).remove(files.slice(i, i + 100).map((f) => f.path))
    if (error) throw new Error(`${bucket} silme hatası: ${error.message}`)
  }
  return files.length
}

/**
 * @param {{ deleteOrphans?: boolean }} options
 * @returns {Promise<Array<ReturnType<typeof summarize>>>} bucket başına rapor
 */
export const runStorageCleanup = async ({ deleteOrphans = false } = {}) => {
  const [mediaFiles, mediaUsed, supportFiles, supportUsed] = await Promise.all([
    listAll(MEDIA_BUCKET), usedMediaPaths(), listAll(SUPPORT_BUCKET), usedSupportPaths(),
  ])

  const reports = [
    summarize(MEDIA_BUCKET, mediaFiles, mediaUsed),
    summarize(SUPPORT_BUCKET, supportFiles, supportUsed),
  ]

  if (deleteOrphans) {
    for (const r of reports) {
      if (r.removable.length) r.deleted = await removeFiles(r.bucket, r.removable)
    }
  }
  return reports
}
