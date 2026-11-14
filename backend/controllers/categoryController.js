import { supabase } from '../config/supabase.js'
import { must, toApi, toApiList, isUuid } from '../utils/db.js'
import { createSlug } from '../utils/createSlug.js'

const WITH_PARENT = '*, parent:categories!categories_parent_id_fkey(id, name, slug)'

const findCategoryRow = async (id) => {
  if (!isUuid(id)) return null
  return must(await supabase.from('categories').select('*').eq('id', id).maybeSingle())
}

const normalizeParent = (parent) => (parent && isUuid(parent?._id || parent) ? parent?._id || parent : null)

// @desc    Tüm kategorileri getir
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req, res) => {
  const rows = must(
    await supabase.from('categories').select(WITH_PARENT).eq('is_active', true).order('order')
  )
  const categories = toApiList(rows, ['parent'])

  res.status(200).json({ success: true, count: categories.length, data: categories })
}

// @desc    Tek kategori getir
// @route   GET /api/categories/:slug
// @access  Public
export const getCategory = async (req, res) => {
  const row = must(
    await supabase.from('categories').select(WITH_PARENT).eq('slug', req.params.slug).maybeSingle()
  )

  if (!row) {
    res.status(404)
    throw new Error('Kategori bulunamadı.')
  }

  res.status(200).json({ success: true, data: toApi(row, ['parent']) })
}

// @desc    Kategori oluştur
// @route   POST /api/categories
// @access  Admin
export const createCategory = async (req, res) => {
  const { name, icon, parent, order } = req.body

  if (!name || !String(name).trim()) {
    res.status(400)
    throw new Error('Kategori adı zorunludur')
  }

  const slug = await createSlug(name, 'categories')
  const row = must(
    await supabase
      .from('categories')
      .insert({
        name: String(name).trim(),
        slug,
        ...(icon !== undefined ? { icon } : {}),
        parent_id: normalizeParent(parent),
        order: Number(order) || 0,
      })
      .select('*')
      .single()
  )

  res.status(201).json({ success: true, data: toApi(row) })
}

// @desc    Kategori güncelle
// @route   PUT /api/categories/:id
// @access  Admin
export const updateCategory = async (req, res) => {
  const { name, icon, parent, order, isActive } = req.body

  const category = await findCategoryRow(req.params.id)
  if (!category) {
    res.status(404)
    throw new Error('Kategori bulunamadı.')
  }

  const fields = {}
  if (name && name !== category.name) {
    fields.slug = await createSlug(name, 'categories', category.id)
    fields.name = String(name).trim()
  }
  if (icon !== undefined) fields.icon = icon
  if (parent !== undefined) fields.parent_id = normalizeParent(parent)
  if (order !== undefined) fields.order = Number(order) || 0
  if (isActive !== undefined) fields.is_active = Boolean(isActive)

  const row = Object.keys(fields).length
    ? must(await supabase.from('categories').update(fields).eq('id', category.id).select('*').single())
    : category

  res.status(200).json({ success: true, data: toApi(row) })
}

// @desc    Kategori sil
// @route   DELETE /api/categories/:id
// @access  Admin
export const deleteCategory = async (req, res) => {
  const category = await findCategoryRow(req.params.id)
  if (!category) {
    res.status(404)
    throw new Error('Kategori bulunamadı.')
  }

  must(await supabase.from('categories').delete().eq('id', category.id))
  res.status(200).json({ success: true, message: 'Kategori silindi.' })
}
