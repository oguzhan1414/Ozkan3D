import crypto from 'crypto'
import express from 'express'
import { runStorageCleanup } from '../services/storageCleanup.js'

/**
 * Zamanlanmış görevler (Vercel Cron). vercel.json'daki "crons" bu adresleri çağırır.
 * Vercel, CRON_SECRET ortam değişkeni tanımlıysa isteğe
 * "Authorization: Bearer <CRON_SECRET>" başlığını ekler; başka kimse çalıştıramaz.
 */
const router = express.Router()

const requireCronSecret = (req, res, next) => {
  const secret = process.env.CRON_SECRET
  const given = req.headers.authorization || ''
  const expected = `Bearer ${secret}`
  const ok = secret
    && given.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  if (!ok) {
    res.status(401)
    throw new Error('Yetkisiz.')
  }
  next()
}

// Haftalık: sahipsiz Storage dosyalarını sil
router.get('/storage-cleanup', requireCronSecret, async (req, res) => {
  const reports = await runStorageCleanup({ deleteOrphans: true })
  const summary = reports.map((r) => ({
    bucket: r.bucket,
    files: r.count,
    bytes: r.size,
    orphans: r.orphanCount,
    deleted: r.deleted,
  }))
  console.log('[cron] storage-cleanup', JSON.stringify(summary))
  res.status(200).json({ success: true, data: summary })
})

export default router
