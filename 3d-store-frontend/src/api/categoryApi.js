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