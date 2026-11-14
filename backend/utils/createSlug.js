import slugify from 'slugify'
import { supabase } from '../config/supabase.js'
import { must } from './db.js'

/**
 * Benzersiz slug üretir. Aynı slug varsa sonuna -1, -2 ... ekler.
 * @param {string} name
 * @param {'products'|'categories'} table
 * @param {string|null} excludeId güncellenen kaydın kendisi (çakışma sayılmasın)
 */
export const createSlug = async (name, table = 'products', excludeId = null) => {
  const base = slugify(String(name || ''), { lower: true, strict: true, locale: 'tr' }) || 'urun'

  let query = supabase.from(table).select('slug').like('slug', `${base}%`)
  if (excludeId) query = query.neq('id', excludeId)
  const taken = new Set(must(await query).map((r) => r.slug))

  if (!taken.has(base)) return base
  let counter = 1
  while (taken.has(`${base}-${counter}`)) counter++
  return `${base}-${counter}`
}
