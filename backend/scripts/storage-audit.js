/**
 * Storage raporu ve sahipsiz dosya temizliği (elle çalıştırma).
 * Aynı temizlik canlıda haftada bir Vercel cron ile otomatik çalışır (/api/cron/storage-cleanup).
 *
 * Kullanım (backend klasöründe):
 *   npm run storage:audit              # sadece rapor (hiçbir şey silmez)
 *   npm run storage:audit -- --delete  # sahipsiz dosyaları siler
 */
import '../config/env.js'
import { runStorageCleanup } from '../services/storageCleanup.js'

const DELETE = process.argv.includes('--delete')
const kb = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`)

const run = async () => {
  console.log(DELETE ? '🧹 Storage temizliği' : '🔎 Storage raporu (silmek için: -- --delete)')
  const reports = await runStorageCleanup({ deleteOrphans: DELETE })

  for (const r of reports) {
    console.log(`\n📦 ${r.bucket}: ${r.count} dosya, ${kb(r.size)}`)
    for (const [folder, v] of Object.entries(r.folders)) {
      console.log(`   ${folder.padEnd(16)} ${String(v.count).padStart(4)} dosya  ${kb(v.size)}`)
    }
    if (r.orphanCount === 0) {
      console.log('   ✅ Sahipsiz dosya yok.')
      continue
    }
    console.log(`   ⚠️  Sahipsiz: ${r.orphanCount} dosya, ${kb(r.orphanSize)}` +
      (r.recentOrphans ? ` (${r.recentOrphans} tanesi 24 saatten yeni, dokunulmadı)` : ''))
    for (const f of r.removable.slice(0, 20)) console.log(`      - ${f.path} (${kb(f.size)})`)
    if (r.removable.length > 20) console.log(`      … ve ${r.removable.length - 20} dosya daha`)
    if (r.deleted) console.log(`   🗑️  ${r.deleted} dosya silindi.`)
  }

  if (DELETE && reports.every((r) => !r.deleted)) console.log('\nSilinecek bir şey yok.')
}

run().catch((err) => {
  console.error(`❌ ${err.message}`)
  process.exitCode = 1
})
