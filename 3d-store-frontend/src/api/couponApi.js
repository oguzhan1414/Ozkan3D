import api from './axios'

export const validateCouponApi = async (code, orderTotal) => {
  const res = await api.post('/coupons/validate', { code, orderTotal })
  return res.data
}

export const getCouponsApi = async () => {
  const res = await api.get('/coupons')
  return res.data
}

export const createCouponApi = async (data) => {
  const res = await api.post('/coupons', data)
  return res.data
}

export const updateCouponApi = async (id, data) => {
  const res = await api.put(`/coupons/${id}`, data)
  return res.data
}

export const deleteCouponApi = async (id) => {
  const res = await api.delete(`/coupons/${id}`)
  return res.data
}