import Category from '../models/Category.js'
import { createSlug } from '../utils/createSlug.js'

// @desc    Tüm kategorileri getir
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .sort({ order: 1 })
    .populate('parent', 'name slug')
    .lean()

  res.status(200).json({ success: true, count: categories.length, data: categories })
}

// @desc    Tek kategori getir
// @route   GET /api/categories/:slug
// @access  Public
export const getCategory = async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug })
    .populate('parent', 'name slug')
    .lean()

  if (!category) {
    res.status(404)
    throw new Error('Kategori bulunamadı.')
  }

  res.status(200).json({ success: true, data: category })
}

// @desc    Kategori oluştur
// @route   POST /api/categories
// @access  Admin
export const createCategory = async (req, res) => {
  const { name, icon, parent, order } = req.body

  const slug = await createSlug(name, Category)

  const category = await Category.create({ name, slug, icon, parent, order })

  res.status(201).json({ success: true, data: category })
}

// @desc    Kategori güncelle
// @route   PUT /api/categories/:id
// @access  Admin
export const updateCategory = async (req, res) => {
  const { name, icon, parent, order, isActive } = req.body

  const category = await Category.findById(req.params.id)
  if (!category) {
    res.status(404)
    throw new Error('Kategori bulunamadı.')
  }

  if (name && name !== category.name) {
    category.slug = await createSlug(name, Category)
    category.name = name
  }

  if (icon !== undefined) category.icon = icon
  if (parent !== undefined) category.parent = parent
  if (order !== undefined) category.order = order
  if (isActive !== undefined) category.isActive = isActive

  await category.save()

  res.status(200).json({ success: true, data: category })
}

// @desc    Kategori sil
// @route   DELETE /api/categories/:id
// @access  Admin
export const deleteCategory = async (req, res) => {
  const category = await Category.findById(req.params.id)
  if (!category) {
    res.status(404)
    throw new Error('Kategori bulunamadı.')
  }

  await category.deleteOne()
  res.status(200).json({ success: true, message: 'Kategori silindi.' })
}