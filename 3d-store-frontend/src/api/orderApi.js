import api from './axios'

export const createOrderApi = async (data) => {
  const res = await api.post('/orders', data)
  return res.data
}

export const getMyOrdersApi = async () => {
  const res = await api.get('/orders/mine')
  return res.data
}

export const getOrderApi = async (id) => {
  const res = await api.get(`/orders/${id}`)
  return res.data
}

export const getOrdersApi = async (params = {}) => {
  const res = await api.get('/orders', { params })
  return res.data
}

export const updateOrderStatusApi = async (id, status, note) => {
  const res = await api.put(`/orders/${id}/status`, { status, note })
  return res.data
}

export const updateTrackingApi = async (id, data) => {
  const res = await api.put(`/orders/${id}/track`, data)
  return res.data
}

export const getInvoicePDFApi = async (id) => {
  const res = await api.get(`/orders/${id}/pdf`, { responseType: 'blob' })
  return res.data
}

export const cancelOrderApi = async (id) => {
  const res = await api.put(`/orders/${id}/cancel`)
  return res.data
}

export const checkPurchaseApi = async (productId) => {
  const res = await api.get(`/orders/check-purchase/${productId}`)
  return res.data
}