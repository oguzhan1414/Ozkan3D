/**
 * Admin hesabı oluşturur veya mevcut kullanıcıyı admin yapar.
 *
 * Kullanım (backend klasöründe):
 *   node seeder.js admin@ornek.com 'GucluBirSifre123'
 *   (veya .env içinde ADMIN_EMAIL / ADMIN_PASSWORD)
 *
 * Kullanıcı zaten varsa şifresine dokunulmaz, sadece rolü admin yapılır.
 */
import './config/env.js'
import { supabase } from './config/supabase.js'
import { must } from './utils/db.js'
import { hashPassword, findUserRowByEmail } from './services/userService.js'

const email = String(process.argv[2] || process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const password = process.argv[3] || process.env.ADMIN_PASSWORD

const run = async () => {
  if (!email) {
    throw new Error('Kullanım: node seeder.js <email> <şifre>  (veya ADMIN_EMAIL / ADMIN_PASSWORD)')
  }

  const existing = await findUserRowByEmail(email)
  if (existing) {
    must(
      await supabase.from('users').update({ role: 'admin', email_verified: true, is_active: true }).eq('id', existing.id)
    )
    console.log(`✅ Mevcut kullanıcı admin yapıldı: ${email}`)
    return
  }

  if (!password || String(password).length < 8) {
    throw new Error('Yeni admin için en az 8 karakterlik bir şifre verin.')
  }

  must(
    await supabase.from('users').insert({
      first_name: 'Admin',
      last_name: 'Ozkan3d',
      email,
      password: await hashPassword(password),
      role: 'admin',
      email_verified: true,
    })
  )
  console.log(`✅ Admin hesabı oluşturuldu: ${email}`)
}

run().catch((err) => {
  console.error('❌ Hata:', err.message)
  process.exitCode = 1
})
