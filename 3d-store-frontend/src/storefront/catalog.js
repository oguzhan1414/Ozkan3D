// Mağaza kataloğu ve biçimlendirme yardımcıları

// Kategoriler artık veritabanından gelir: bkz. useCategories.js

/**
 * Adres için kısa ad: "Hediyelik / Dekor" → "hediyelik-dekor", "PS5 & Xbox Aksesuarları" → "ps5-xbox-aksesuarlari".
 * Backend'deki slugify (locale: tr, strict) ile aynı sonucu verir.
 */
const TR_MAP = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' }
export const toSlug = (value = '') =>
  String(value)
    .toLocaleLowerCase('tr')
    .replace(/[çğıiöşüâîû]/g, (ch) => TR_MAP[ch] || ch)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// Kategori nesnesi (slug'lı) ya da sadece ad kabul eder
const slugOf = (c) => (typeof c === 'string' ? toSlug(c) : c?.slug || toSlug(c?.name))
export const categoryHref = (c) => `/shop?cat=${slugOf(c)}`
export const subcategoryHref = (sub, parent) =>
  parent ? `/shop?cat=${slugOf(parent)}&sub=${slugOf(sub)}` : `/shop?sub=${slugOf(sub)}`

/** URL'deki değeri kategoriyle eşle: kısa ad, sadeleştirilmiş ad ya da tam ad (eski bağlantılar) */
export const matchCategory = (param, list = []) => {
  if (!param) return null
  const key = toSlug(param)
  return list.find((c) => c.slug === param || c.slug === key || toSlug(c.name) === key || c.name === param) || null
}
export const productHref = (p) => `/product/${p.slug || p._id}`

const tl = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })
export const formatPrice = (value) => `${tl.format(Number(value) || 0)} ₺`

/** 14 -> "14 sa", 0.5 -> "30 dk", 38 -> "1 gün 14 sa" */
export const formatPrintTime = (hours) => {
  const h = Number(hours)
  if (!Number.isFinite(h) || h <= 0) return null
  if (h < 1) return `${Math.round(h * 60)} dk`
  if (h >= 24) {
    const days = Math.floor(h / 24)
    const rest = Math.round(h - days * 24)
    return rest ? `${days} gün ${rest} sa` : `${days} gün`
  }
  return `${Math.round(h)} sa`
}

export const formatDimensions = (d) => {
  if (!d) return null
  const parts = [d.width, d.height, d.depth].map(Number)
  if (parts.some((n) => !Number.isFinite(n) || n <= 0)) return null
  return `${parts.map((n) => tl.format(n)).join(' × ')} cm`
}

export const discountPercent = (price, oldPrice) => {
  const p = Number(price)
  const o = Number(oldPrice)
  if (!o || !p || o <= p) return null
  return Math.round(((o - p) / o) * 100)
}

/** Ürün kartında tek satırlık teknik özet: "PLA · 14 sa" */
export const specLine = (p) =>
  [p.material?.[0], formatPrintTime(p.printTime)].filter(Boolean).join(' · ')

export const badgeLabel = (badge) => badge || null

export const initials = (user) =>
  `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || '?'
