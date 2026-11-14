/**
 * Dış adreslerdeki görselleri (Cloudinary, Wikimedia vb.) Supabase Storage'a taşır
 * ve veritabanındaki URL'leri günceller.
 *
 * Kullanım (backend klasöründe):
 *   node scripts/migrate-images-to-storage.js --dry-run   # sadece listeler
 *   node scripts/migrate-images-to-storage.js
 *
 * Kapsam: products.images, products.image_variants, settings.hero_slides, settings.logo,
 *         orders.items[].image, carts.items[].image
 * Tekrar çalıştırılabilir: zaten Storage'da olan URL'lere dokunmaz.
 */
import 'dotenv/config'
import { supabase } from '../config/supabase.js'
import { must } from '../utils/db.js'
import { uploadImage, getPublicId } from '../utils/imageUpload.js'

const DRY_RUN = process.argv.includes('--dry-run')
const isExternal = (url) => typeof url === 'string' && /^https?:\/\//i.test(url) && !getPublicId(url)

const cache = new Map() // eski URL -> yeni URL
const failed = new Map()

const migrateUrl = async (url, folder) => {
  if (!isExternal(url)) return url
  if (cache.has(url)) return cache.get(url)
  if (failed.has(url)) return url

  if (DRY_RUN) {
    cache.set(url, `(storage) ${folder}/...`)
    return url
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'image-migration-script/1.0' },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    const { secure_url } = await uploadImage(buffer, folder)
    cache.set(url, secure_url)
    process.stdout.write('.')
    await new Promise((r) => setTimeout(r, 300)) // kaynak siteyi yormamak için
    return secure_url
  } catch (err) {
    failed.set(url, err.message)
    return url
  }
}

const run = async () => {
  console.log(DRY_RUN ? '🧪 DRY RUN\n' : '🚚 Görseller Supabase Storage\'a taşınıyor\n')

  // ---- ürünler
  const products = must(await supabase.from('products').select('id, images, image_variants'))
  let productUpdates = 0
  for (const p of products) {
    const images = []
    for (const url of p.images || []) images.push(await migrateUrl(url, 'products'))
    const variants = []
    for (const v of p.image_variants || []) variants.push({ ...v, url: await migrateUrl(v.url, 'products') })

    const changed =
      JSON.stringify(images) !== JSON.stringify(p.images) ||
      JSON.stringify(variants) !== JSON.stringify(p.image_variants)
    if (changed && !DRY_RUN) {
      must(await supabase.from('products').update({ images, image_variants: variants }).eq('id', p.id))
      productUpdates++
    }
  }

  // ---- ayarlar (slider + logo)
  const settingsRows = must(await supabase.from('settings').select('id, hero_slides, logo'))
  let settingsUpdates = 0
  for (const s of settingsRows) {
    const slides = []
    for (const slide of s.hero_slides || []) {
      slides.push({ ...slide, imageUrl: await migrateUrl(slide.imageUrl, 'home-hero') })
    }
    const logo = await migrateUrl(s.logo, 'home-hero')
    if (!DRY_RUN && (JSON.stringify(slides) !== JSON.stringify(s.hero_slides) || logo !== s.logo)) {
      must(await supabase.from('settings').update({ hero_slides: slides, logo }).eq('id', s.id))
      settingsUpdates++
    }
  }

  // ---- sipariş ve sepet kalemlerindeki küçük görseller
  // (çoğu ürün görseliyle aynı URL olduğu için cache'ten gelir)
  let itemUpdates = 0
  for (const table of ['orders', 'carts']) {
    const rows = must(await supabase.from(table).select('id, items'))
    for (const row of rows) {
      const items = []
      for (const it of row.items || []) items.push({ ...it, image: await migrateUrl(it.image, 'products') })
      if (!DRY_RUN && JSON.stringify(items) !== JSON.stringify(row.items)) {
        must(await supabase.from(table).update({ items }).eq('id', row.id))
        itemUpdates++
      }
    }
  }

  console.log(`\n\n📊 Dış görsel sayısı: ${cache.size + failed.size}`)
  if (!DRY_RUN) {
    console.log(`✅ Taşınan: ${cache.size}`)
    console.log(`   Güncellenen kayıt: ${productUpdates} ürün, ${settingsUpdates} ayar, ${itemUpdates} sipariş/sepet`)
  }
  if (failed.size) {
    console.warn(`⚠️  Taşınamayan ${failed.size} görsel (eski URL bırakıldı):`)
    for (const [url, msg] of failed) console.warn(`   - ${msg}: ${url}`)
    process.exitCode = 1
  }
}

run().catch((err) => {
  console.error(`\n❌ ${err.message}`)
  process.exitCode = 1
})
