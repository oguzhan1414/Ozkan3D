import crypto from 'crypto'

// Fiyatı etkileyen ürün seçenekleri (Boyut, Boya, ...) ve kişiselleştirme.
// Fiyat HER ZAMAN burada, veritabanındaki ürüne göre hesaplanır; istemcinin
// gönderdiği fiyata güvenilmez.

const MAX_GROUPS = 6
const MAX_VALUES = 20
const MAX_PERSONALIZATION = 120

const shortId = () => crypto.randomBytes(4).toString('hex')
const cleanText = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const money = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

/** Admin formundan gelen seçenek gruplarını doğrular ve kimlik atar */
export const sanitizeOptionGroups = (input) => {
  if (!Array.isArray(input)) return []
  return input
    .slice(0, MAX_GROUPS)
    .map((g) => {
      const name = cleanText(g?.name, 40)
      const seen = new Set()
      const values = (Array.isArray(g?.values) ? g.values : [])
        .slice(0, MAX_VALUES)
        .map((v) => ({
          id: /^[a-z0-9]{4,16}$/i.test(v?.id || '') ? v.id : shortId(),
          label: cleanText(v?.label, 60),
          priceDelta: money(v?.priceDelta),
        }))
        .filter((v) => v.label && !seen.has(v.label.toLowerCase()) && seen.add(v.label.toLowerCase()))
      return {
        id: /^[a-z0-9]{4,16}$/i.test(g?.id || '') ? g.id : shortId(),
        name,
        values,
      }
    })
    .filter((g) => g.name && g.values.length > 0)
}

/** null = kişiselleştirme kapalı */
export const sanitizePersonalization = (input) => {
  if (!input || typeof input !== 'object' || !input.enabled) return null
  return {
    enabled: true,
    label: cleanText(input.label, 60) || 'Kişiselleştirme notu',
    maxLength: Math.min(MAX_PERSONALIZATION, Math.max(1, Math.trunc(Number(input.maxLength) || 30))),
    required: Boolean(input.required),
    priceDelta: Math.max(0, money(input.priceDelta)),
  }
}

/** Hata mesajlı istisna (controller'lar 400 döner) */
export class SelectionError extends Error {}

/**
 * Müşteri seçimini ürüne göre doğrular ve birim fiyatı hesaplar.
 * @param product  DB satırı (price, option_groups, personalization)
 * @param selection { options: { [groupId]: valueId }, personalization: string }
 */
export const resolveSelection = (product, selection = {}) => {
  const groups = Array.isArray(product.option_groups) ? product.option_groups : []
  // { groupId: valueId } ya da sepetteki [{ groupId, valueId }] biçimi kabul edilir
  const raw = selection?.options
  const chosen = Array.isArray(raw)
    ? Object.fromEntries(raw.map((o) => [o?.groupId, o?.valueId]))
    : raw && typeof raw === 'object' ? raw : {}

  let unitPrice = money(product.price)
  const options = []
  for (const group of groups) {
    const value = group.values?.find((v) => v.id === chosen[group.id])
    if (!value) throw new SelectionError(`${product.name}: "${group.name}" seçimi yapılmalı.`)
    unitPrice += money(value.priceDelta)
    options.push({ groupId: group.id, valueId: value.id, group: group.name, value: value.label, priceDelta: money(value.priceDelta) })
  }

  let personalization = null
  const p = product.personalization
  if (p?.enabled) {
    const rawText = typeof selection?.personalization === 'object' ? selection.personalization?.text : selection?.personalization
    const text = cleanText(rawText, p.maxLength || MAX_PERSONALIZATION)
    if (p.required && !text) throw new SelectionError(`${product.name}: "${p.label}" alanı zorunlu.`)
    if (text) {
      personalization = { label: p.label, text }
      unitPrice += money(p.priceDelta)
    }
  }

  return { unitPrice: Math.max(0, money(unitPrice)), options, personalization }
}

/** Sepette aynı satırı bulmak için seçim anahtarı */
export const selectionKey = ({ product, material, color, options, personalization }) =>
  [
    product,
    material || '',
    color || '',
    (options || []).map((o) => `${o.groupId}:${o.valueId}`).sort().join(','),
    personalization?.text || '',
  ].join('|')

/** Satın alınabilir mi? Siparişe özel ürünlerde stok sınırı yok */
export const hasStockFor = (product, quantity) => product.made_to_order || Number(product.stock) >= quantity
