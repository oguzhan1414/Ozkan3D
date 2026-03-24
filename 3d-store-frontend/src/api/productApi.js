import api from './axios'

export const getProductsApi = async (params = {}) => {
  const res = await api.get('/products', { params })
  return res.data
}

export const getProductApi = async (slug) => {
  const res = await api.get(`/products/${slug}`)
  return res.data
}

export const getFeaturedProductsApi = async () => {
  const res = await api.get('/products/featured')
  return res.data
}

export const createProductApi = async (data) => {
  const res = await api.post('/products', data)
  return res.data
}

export const updateProductApi = async (id, data) => {
  const res = await api.put(`/products/${id}`, data)
  return res.data
}

export const deleteProductApi = async (id) => {
  const res = await api.delete(`/products/${id}`)
  return res.data
}

export const uploadProductImageApi = async (id, formData) => {
  const res = await api.post(`/products/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export const updateStockApi = async (id, stock) => {
  const res = await api.put(`/products/${id}/stock`, { stock })
  return res.data
}