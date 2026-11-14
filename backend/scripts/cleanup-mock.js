/**
 * Mock/demo veriyi ve görsellerini siler (supabase/mock/seed_mock.sql ile eklenenler).
 * Gerçek veriye dokunmaz. Kategoriler silinmez (gerçek mağaza da aynılarını kullanıyor).
 *
 * Kullanım (backend klasöründe):
 *   node scripts/cleanup-mock.js --dry-run
 *   node scripts/cleanup-mock.js
 */
import '../config/env.js'
import { supabase } from '../config/supabase.js'
import { must } from '../utils/db.js'
import { getPublicId, MEDIA_BUCKET } from '../utils/imageUpload.js'

const DRY_RUN = process.argv.includes('--dry-run')
const MOCK_EMAIL = '%@mock.ozkan3d.test'
const MOCK_HERO_ALTS = ['3D baskı atölyesi', 'Sırt çantasında 3D yazıcı', '3D yazıcı çiftliği']

const run = async () => {
  const products = must(await supabase.from('products').select('id, images, image_variants').like('sku', 'MOCK-%'))
  const users = must(await supabase.from('users').select('id').like('email', MOCK_EMAIL))
  const userIds = users.map((u) => u.id)
  const settings = must(await supabase.from('settings').select('id, hero_slides'))

  const paths = new Set()
  for (const p of products) {
    for (const url of [...(p.images || []), ...(p.image_variants || []).map((v) => v.url)]) {
      const path = getPublicId(url)
      if (path) paths.add(path)
    }
  }
  const mockSlides = settings.flatMap((s) => (s.hero_slides || []).filter((h) => MOCK_HERO_ALTS.includes(h.altText)))
  for (const h of mockSlides) {
    const path = getPublicId(h.imageUrl)
    if (path) paths.add(path)
  }

  console.log(`Silinecek: ${products.length} ürün, ${users.length} kullanıcı (+ sipariş/yorum/destek), ${mockSlides.length} slayt, ${paths.size} görsel dosyası`)
  if (DRY_RUN) return console.log('🧪 Dry run — hiçbir şey silinmedi.')

  if (userIds.length) {
    must(await supabase.from('reviews').delete().in('user_id', userIds))
    must(await supabase.from('orders').delete().in('user_id', userIds))
    must(await supabase.from('support_requests').delete().in('user_id', userIds))
    must(await supabase.from('users').delete().in('id', userIds))
  }
  must(await supabase.from('products').delete().like('sku', 'MOCK-%'))
  must(await supabase.from('coupons').delete().like('code', 'MOCK%'))
  for (const s of settings) {
    const kept = (s.hero_slides || []).filter((h) => !MOCK_HERO_ALTS.includes(h.altText))
    if (kept.length !== (s.hero_slides || []).length) {
      must(await supabase.from('settings').update({ hero_slides: kept }).eq('id', s.id))
    }
  }

  const list = [...paths]
  for (let i = 0; i < list.length; i += 100) {
    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(list.slice(i, i + 100))
    if (error) console.warn('Görsel silme hatası:', error.message)
  }

  console.log('✅ Mock veri ve görselleri silindi.')
}

run().catch((err) => {
  console.error(`❌ ${err.message}`)
  process.exitCode = 1
})
