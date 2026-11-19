import { supabase } from '../config/supabase.js'
import { must, toApi, toApiList, isUuid } from '../utils/db.js'
import { createSlug } from '../utils/createSlug.js'
import { uploadImage, deleteImage, getPublicId } from '../utils/imageUpload.js'

// Kategoriler iki seviyeli: ana kategori (parent_id null) ve alt kategori.
// Ürünler category_id / subcategory_id ile bağlı; isim değişince ürünler
// veritabanı trigger'ı ile güncellenir (bkz. migration product_category_ids).

// Üst kategori bilgisi PostgREST embed yerine aynı listeden eşlenir (self-join embed'e güvenmiyoruz)
const withParent = (row, all) => {
  const api = toApi(row)
  if (!row.parent_id) return api
  const p = all.find((c) => c.id === row.parent_id)
  return { ...api, parent: p ? { _id: p.id, id: p.id, name: p.name, slug: p.slug } : row.parent_id }
}

const findCategoryRow = async (id) => {
  if (!isUuid(id)) return null
  return must(await supabase.from('categories').select('*').eq('id', id).maybeSingle())
}

const parentIdOf = (parent) => {
  const id = parent?._id || parent
  return id && isUuid(id) ? id : null
}

const nameTaken = async (name, exceptId = null) => {
  // Büyük/küçük harf duyarsız tam eşleşme; % ve _ joker karakter sayılmasın
  let q = supabase.from('categories').select('id').ilike('name', name.replace(/[%_\\]/g, '\\$&'))
  if (exceptId) q = q.neq('id', exceptId)
  return must(await q).length > 0
}

/** Üst kategori geçerli bir ANA kategori mi? (en fazla iki seviye) */
const assertValidParent = async (parentId, res, selfId = null) => {
  if (!parentId) return
  if (parentId === selfId) {
    res.status(400)
    throw new Error('Bir kategori kendi altına taşınamaz.')
  }
  const parent = await findCategoryRow(parentId)
  if (!parent) {
    res.status(400)
    throw new Error('Seçilen üst kategori bulunamadı.')
  }
  if (parent.parent_id) {
    res.status(400)
    throw new Error('Alt kategoriler sadece ana kategorilerin altına eklenebilir.')
  }
}

// @desc    Aktif kategorileri getir (mağaza)
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req, res) => {
  const rows = must(
    await supabase.from('categories').select('*').eq('is_active', true).order('order').order('name')
  )
  // Pasif bir ana kategorinin alt kategorileri de mağazada görünmesin
  const activeIds = new Set(rows.map((r) => r.id))
  const visible = rows.filter((r) => !r.parent_id || activeIds.has(r.parent_id))
  const categories = visible.map((r) => withParent(r, rows))

  res.status(200).json({ success: true, count: categories.length, data: categories })
}

// @desc    Tüm kategoriler + ürün sayıları (admin)
// @route   GET /api/categories/admin/all
// @access  Admin
export const getAllCategoriesAdmin = async (req, res) => {
  const [cats, products] = await Promise.all([
    supabase.from('categories').select('*').order('order').order('name'),
    supabase.from('products').select('category_id, subcategory_id'),
  ])

  const counts = {}
  for (const p of must(products)) {
    if (p.category_id) counts[p.category_id] = (counts[p.category_id] || 0) + 1
    if (p.subcategory_id) counts[p.subcategory_id] = (counts[p.subcategory_id] || 0) + 1
  }

  const data = toApiList(must(cats)).map((c) => ({ ...c, productCount: counts[c._id] || 0 }))
  res.status(200).json({ success: true, count: data.length, data })
}

// @desc    Tek kategori getir
// @route   GET /api/categories/:slug
// @access  Public
export const getCategory = async (req, res) => {
  const row = must(
    await supabase.from('categories').select('*').eq('slug', req.params.slug).maybeSingle()
  )

  if (!row) {
    res.status(404)
    throw new Error('Kategori bulunamadı.')
  }

  const parent = row.parent_id ? await findCategoryRow(row.parent_id) : null
  res.status(200).json({ success: true, data: withParent(row, parent ? [parent] : []) })
}

// @desc    Kategori oluştur
// @route   POST /api/categories
// @access  Admin
export const createCategory = async (req, res) => {
  const { icon, parent, order, isActive } = req.body
  const name = String(req.body.name || '').trim()
  const imageAlt = req.body.imageAlt !== undefined ? String(req.body.imageAlt).trim().slice(0, 200) || null : null

  if (!name) {
    res.status(400)
    throw new Error('Kategori adı zorunludur.')
  }
  if (name.length > 60) {
    res.status(400)
    throw new Error('Kategori adı en fazla 60 karakter olabilir.')
  }
  if (await nameTaken(name)) {
    res.status(400)
    throw new Error(`"${name}" adında bir kategori zaten var.`)
  }

  const parentId = parentIdOf(parent)
  await assertValidParent(parentId, res)

  const slug = await createSlug(name, 'categories')
  const row = must(
    await supabase
      .from('categories')
      .insert({
        name,
        slug,
        ...(icon !== undefined ? { icon } : {}),
        parent_id: parentId,
        order: Number(order) || 0,
        is_active: isActive !== false,
        image_alt: imageAlt,
      })
      .select('*')
      .single()
  )

  res.status(201).json({ success: true, data: { ...toApi(row), productCount: 0 } })
}

// @desc    Kategori güncelle (ad, sıra, aktiflik, üst kategori)
// @route   PUT /api/categories/:id
// @access  Admin
export const updateCategory = async (req, res) => {
  const { icon, parent, order, isActive } = req.body

  const category = await findCategoryRow(req.params.id)
  if (!category) {
    res.status(404)
    throw new Error('Kategori bulunamadı.')
  }

  const fields = {}
  const name = req.body.name !== undefined ? String(req.body.name).trim() : undefined

  if (name !== undefined && name !== category.name) {
    if (!name) {
      res.status(400)
      throw new Error('Kategori adı boş olamaz.')
    }
    if (await nameTaken(name, category.id)) {
      res.status(400)
      throw new Error(`"${name}" adında bir kategori zaten var.`)
    }
    fields.name = name
    fields.slug = await createSlug(name, 'categories', category.id)
  }

  if (parent !== undefined) {
    const parentId = parentIdOf(parent)
    if (parentId !== category.parent_id) {
      await assertValidParent(parentId, res, category.id)
      if (parentId) {
        // Alt kategorisi olan bir ana kategori, başka kategorinin altına giremez
        const children = must(await supabase.from('categories').select('id').eq('parent_id', category.id).limit(1))
        if (children.length) {
          res.status(400)
          throw new Error('Alt kategorileri olan bir kategori başka bir kategorinin altına taşınamaz.')
        }
      } else if (category.parent_id) {
        // Alt kategoriden ana kategoriye: bu alt kategorideki ürünler artık ana kategoriye bağlı olur
        const used = must(await supabase.from('products').select('id').eq('subcategory_id', category.id).limit(1))
        if (used.length) {
          res.status(400)
          throw new Error('İçinde ürün olan bir alt kategori ana kategoriye çevrilemez. Önce ürünleri taşı.')
        }
      }
      fields.parent_id = parentId
    }
  }

  if (icon !== undefined) fields.icon = icon
  if (req.body.imageAlt !== undefined) fields.image_alt = String(req.body.imageAlt).trim().slice(0, 200) || null
  if (order !== undefined) fields.order = Number(order) || 0
  if (isActive !== undefined) fields.is_active = Boolean(isActive)

  const row = Object.keys(fields).length
    ? must(await supabase.from('categories').update(fields).eq('id', category.id).select('*').single())
    : category

  res.status(200).json({ success: true, data: toApi(row) })
}

// @desc    Kategori sil (boşsa)
// @route   DELETE /api/categories/:id
// @access  Admin
export const deleteCategory = async (req, res) => {
  const category = await findCategoryRow(req.params.id)
  if (!category) {
    res.status(404)
    throw new Error('Kategori bulunamadı.')
  }

  const [children, products] = await Promise.all([
    supabase.from('categories').select('id', { count: 'exact', head: true }).eq('parent_id', category.id),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .or(`category_id.eq.${category.id},subcategory_id.eq.${category.id}`),
  ])
  must(children)
  must(products)

  if (children.count > 0) {
    res.status(400)
    throw new Error(`Bu kategorinin ${children.count} alt kategorisi var. Önce onları sil ya da taşı.`)
  }
  if (products.count > 0) {
    res.status(400)
    throw new Error(`Bu kategoride ${products.count} ürün var. Silmeden önce ürünleri başka kategoriye taşı ya da kategoriyi pasif yap.`)
  }

  must(await supabase.from('categories').delete().eq('id', category.id))
  if (category.image_url) {
    await deleteImage(getPublicId(category.image_url)).catch((err) => console.log('Kategori görseli silinemedi:', err.message))
  }
  res.status(200).json({ success: true, message: 'Kategori silindi.' })
}

// @desc    Kategori kapak görseli yükle (eskisini değiştirir)
// @route   POST /api/categories/:id/image
// @access  Admin
export const uploadCategoryImage = async (req, res) => {
  const category = await findCategoryRow(req.params.id)
  if (!category) {
    res.status(404)
    throw new Error('Kategori bulunamadı.')
  }
  if (!req.file?.buffer) {
    res.status(400)
    throw new Error('Yüklenecek görsel bulunamadı.')
  }

  const { secure_url } = await uploadImage(req.file.buffer, 'categories')
  const fields = { image_url: secure_url }
  if (req.body?.imageAlt !== undefined) fields.image_alt = String(req.body.imageAlt).trim().slice(0, 200) || null

  const row = must(await supabase.from('categories').update(fields).eq('id', category.id).select('*').single())

  // Eski görsel bizim Storage'ımızdaysa sil
  if (category.image_url && category.image_url !== secure_url) {
    await deleteImage(getPublicId(category.image_url)).catch((err) => console.log('Eski kategori görseli silinemedi:', err.message))
  }

  res.status(200).json({ success: true, data: toApi(row) })
}

// @desc    Kategori kapak görselini kaldır
// @route   DELETE /api/categories/:id/image
// @access  Admin
export const removeCategoryImage = async (req, res) => {
  const category = await findCategoryRow(req.params.id)
  if (!category) {
    res.status(404)
    throw new Error('Kategori bulunamadı.')
  }

  const row = must(await supabase.from('categories').update({ image_url: null }).eq('id', category.id).select('*').single())
  if (category.image_url) {
    await deleteImage(getPublicId(category.image_url)).catch((err) => console.log('Kategori görseli silinemedi:', err.message))
  }

  res.status(200).json({ success: true, data: toApi(row) })
}
