import { supabase } from '../config/supabase.js'
import { must, toApiList, toApi, isUuid } from '../utils/db.js'

const HEX = /^#[0-9a-f]{6}$/

const cleanName = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)
const cleanHex = (v) => {
  let hex = String(v ?? '').trim().toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(hex)) hex = `#${[...hex.slice(1)].map((c) => c + c).join('')}`
  return HEX.test(hex) ? hex : null
}

// @desc    Renk paleti + varsayılan hazırlık süresi (mağaza ve admin kullanır)
// @route   GET /api/colors
// @access  Public
export const getColors = async (req, res) => {
  const [colors, settings] = await Promise.all([
    supabase.from('colors').select('id, name, hex, sort_order').order('sort_order').order('name'),
    supabase.from('settings').select('default_lead_min_days, default_lead_max_days').limit(1).maybeSingle(),
  ])
  const s = must(settings)
  res.status(200).json({
    success: true,
    data: toApiList(must(colors)),
    leadDays: { min: s?.default_lead_min_days ?? 1, max: s?.default_lead_max_days ?? 6 },
  })
}

// @desc    Palete renk ekle
// @route   POST /api/colors
// @access  Admin
export const createColor = async (req, res) => {
  const name = cleanName(req.body.name)
  const hex = cleanHex(req.body.hex)
  if (!name || !hex) {
    res.status(400)
    throw new Error('Renk adı ve geçerli bir renk kodu (#rrggbb) gerekli.')
  }

  const existing = must(await supabase.from('colors').select('id, name').eq('hex', hex).maybeSingle())
  if (existing) {
    res.status(409)
    throw new Error(`Bu renk kodu zaten "${existing.name}" adıyla kayıtlı.`)
  }

  const { data: last } = await supabase.from('colors').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const row = must(await supabase
    .from('colors')
    .insert({ name, hex, sort_order: (last?.sort_order ?? 0) + 1 })
    .select('id, name, hex, sort_order')
    .single())
  res.status(201).json({ success: true, data: toApi(row) })
}

// @desc    Renk adını güncelle (kod değişmez; ürünler kodu tutar)
// @route   PUT /api/colors/:id
// @access  Admin
export const updateColor = async (req, res) => {
  const name = cleanName(req.body.name)
  if (!isUuid(req.params.id) || !name) {
    res.status(400)
    throw new Error('Geçerli bir renk adı girin.')
  }
  const row = must(await supabase.from('colors').update({ name }).eq('id', req.params.id).select('id, name, hex, sort_order').maybeSingle())
  if (!row) {
    res.status(404)
    throw new Error('Renk bulunamadı.')
  }
  res.status(200).json({ success: true, data: toApi(row) })
}

// @desc    Renk sil (ürünlerde kullanılıyorsa engellenir)
// @route   DELETE /api/colors/:id
// @access  Admin
export const deleteColor = async (req, res) => {
  const row = isUuid(req.params.id)
    ? must(await supabase.from('colors').select('id, hex, name').eq('id', req.params.id).maybeSingle())
    : null
  if (!row) {
    res.status(404)
    throw new Error('Renk bulunamadı.')
  }

  const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).contains('colors', [row.hex])
  if (count) {
    res.status(409)
    throw new Error(`"${row.name}" ${count} üründe kullanılıyor; önce ürünlerden kaldırın.`)
  }

  must(await supabase.from('colors').delete().eq('id', row.id))
  res.status(200).json({ success: true })
}
