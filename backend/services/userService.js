import bcrypt from 'bcryptjs'
import { supabase } from '../config/supabase.js'
import { must, toApi, isUuid } from '../utils/db.js'

export const hashPassword = async (plain) => bcrypt.hash(String(plain), await bcrypt.genSalt(10))

export const matchPassword = async (plain, hash) => {
  if (!plain || !hash) return false
  return bcrypt.compare(String(plain), hash)
}

/** DB satırı -> API kullanıcısı (şifre ve tokenlar çıkarılmış) */
export const userToApi = (row) => {
  if (!row) return row
  const user = toApi(row)
  user.fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim()
  return user
}

/** Ham satır (şifre dahil) — sadece backend içinde kullan */
export const findUserRowById = async (id) => {
  if (!isUuid(id)) return null
  return must(await supabase.from('users').select('*').eq('id', id).maybeSingle())
}

export const findUserRowByEmail = async (email) => {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return null
  return must(await supabase.from('users').select('*').eq('email', normalized).maybeSingle())
}

export const findUserByEmail = async (email) => userToApi(await findUserRowByEmail(email))
export const findUserById = async (id) => userToApi(await findUserRowById(id))

/** Kısmi güncelleme; snake_case alanlar alır, güncel API kullanıcısını döner */
export const updateUserRow = async (id, fields) => {
  const row = must(await supabase.from('users').update(fields).eq('id', id).select('*').single())
  return userToApi(row)
}

export const deleteUserRow = async (id) => {
  must(await supabase.from('users').delete().eq('id', id))
}
