import crypto from 'crypto'

/**
 * Veritabanı (snake_case, id) <-> API (camelCase, _id) dönüşümleri.
 * Frontend eskiden Mongo'dan gelen şekli beklediği için API çıktısı aynı tutulur:
 *   - her kayıtta `_id` (ve `id`)
 *   - camelCase alan adları
 *   - yabancı anahtarlar `user_id` -> `user`, `product_id` -> `product` vb.
 * JSONB kolonlarının içeriği zaten API şeklinde saklandığı için dokunulmaz.
 */

const FOREIGN_KEYS = {
  user_id: 'user',
  product_id: 'product',
  order_id: 'order',
  coupon_id: 'coupon',
  parent_id: 'parent',
}

// Hiçbir zaman API'den dışarı çıkmaması gereken kolonlar
const SECRET_COLUMNS = new Set([
  'password',
  'email_verify_token',
  'reset_password_token',
  'search_vector',
])

const toCamel = (key) => key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())
const toSnake = (key) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * DB satırını API nesnesine çevirir.
 * @param {object} row
 * @param {string[]} relations embed edilmiş ilişki anahtarları (ör. ['user', 'product'])
 */
export const toApi = (row, relations = []) => {
  if (!row) return row
  const out = {}

  for (const [key, value] of Object.entries(row)) {
    if (SECRET_COLUMNS.has(key)) continue

    if (FOREIGN_KEYS[key]) {
      const relKey = FOREIGN_KEYS[key]
      // Embed edilmiş nesne varsa onu kullan, yoksa sadece id
      if (!(relKey in row)) out[relKey] = value
      continue
    }

    if (relations.includes(key)) {
      out[key] = Array.isArray(value)
        ? value.map((v) => toApi(v))
        : isPlainObject(value) ? toApi(value) : value
      continue
    }

    out[toCamel(key)] = value
  }

  if (row.id !== undefined) out._id = row.id
  return out
}

export const toApiList = (rows, relations = []) => (rows || []).map((r) => toApi(r, relations))

/**
 * API'den gelen gövdeyi DB satırına çevirir; sadece izin verilen alanlar alınır.
 * @param {object} body camelCase alanlar
 * @param {string[]} allowed izin verilen camelCase alan adları
 */
export const toDb = (body = {}, allowed = []) => {
  const out = {}
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined) {
      out[toSnake(key)] = body[key]
    }
  }
  return out
}

/** JSONB alt kayıtları için Mongo tarzı _id */
export const newSubId = () => crypto.randomUUID()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (value) => UUID_RE.test(String(value || ''))

/** PostgREST `or=(...)` ve `ilike` filtrelerinde sorun çıkaran karakterleri temizler */
export const sanitizeSearch = (value = '') =>
  String(value).replace(/[%*,()\\:"'.]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)

const PG_ERROR_MESSAGES = {
  23505: 'Bu kayıt zaten mevcut.',
  23503: 'İlişkili kayıt bulunamadı.',
  23514: 'Geçersiz değer.',
  '22P02': 'Geçersiz kimlik veya değer formatı.',
}

/**
 * Supabase sonucunu açar; hata varsa uygun HTTP koduyla fırlatır.
 * Kullanım: const rows = must(await supabase.from('x').select())
 */
export const must = ({ data, error }) => {
  if (error) {
    const err = new Error(PG_ERROR_MESSAGES[error.code] || error.message)
    err.statusCode = PG_ERROR_MESSAGES[error.code] ? 400 : 500
    err.cause = error
    throw err
  }
  return data
}

/** HTTP hatası fırlatmak için kısayol */
export const httpError = (statusCode, message) => {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}
