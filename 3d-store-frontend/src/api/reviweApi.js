import api from './axios'

export const getProductReviewsApi = async (productId) => {
  const res = await api.get(`/reviews/product/${productId}`)
  return res.data
}

export const createReviewApi = async (data) => {
  const res = await api.post('/reviews', data)
  return res.data
}

export const getReviewsApi = async (params = {}) => {
  const res = await api.get('/reviews', { params })
  return res.data
}

export const updateReviewStatusApi = async (id, status) => {
  const res = await api.put(`/reviews/${id}/status`, { status })
  return res.data
}

export const deleteReviewApi = async (id) => {
  const res = await api.delete(`/reviews/${id}`)
  return res.data
}

export const getMyReviewsApi = async () => {
  const res = await api.get('/reviews/my')
  return res.data
}