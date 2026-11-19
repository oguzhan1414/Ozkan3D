import api from './axios'

export const getCategoriesApi = async () => {
  const res = await api.get('/categories')
  return res.data
}

export const createCategoryApi = async (data) => {
  const res = await api.post('/categories', data)
  return res.data
}

export const updateCategoryApi = async (id, data) => {
  const res = await api.put(`/categories/${id}`, data)
  return res.data
}

export const deleteCategoryApi = async (id) => {
  const res = await api.delete(`/categories/${id}`)
  return res.data
}
// Admin: pasifler dahil tüm kategoriler + ürün sayıları
export const getAllCategoriesAdminApi = async () => {
  const res = await api.get('/categories/admin/all')
  return res.data
}

// Admin: kategori kapak görseli
export const uploadCategoryImageApi = async (id, file, imageAlt) => {
  const fd = new FormData()
  fd.append('image', file)
  if (imageAlt !== undefined) fd.append('imageAlt', imageAlt)
  const res = await api.post(`/categories/${id}/image`, fd)
  return res.data
}

export const removeCategoryImageApi = async (id) => {
  const res = await api.delete(`/categories/${id}/image`)
  return res.data
}
