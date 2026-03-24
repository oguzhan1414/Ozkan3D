import api from './axios'

export const getUsersApi = async (params = {}) => {
  const res = await api.get('/users', { params })
  return res.data
}

export const getUserApi = async (id) => {
  const res = await api.get(`/users/${id}`)
  return res.data
}

export const updateUserApi = async (id, data) => {
  const res = await api.put(`/users/${id}`, data)
  return res.data
}

export const deleteUserApi = async (id) => {
  const res = await api.delete(`/users/${id}`)
  return res.data
}

export const getDashboardStatsApi = async () => {
  const res = await api.get('/users/stats')
  return res.data
}

export const getFavoritesApi = async () => {
  const res = await api.get('/users/favorites')
  return res.data
}

export const toggleFavoriteApi = async (productId) => {
  const res = await api.post(`/users/favorites/${productId}`)
  return res.data
}