import api from './axios'

export const createPaymentApi = async (data) => {
  const res = await api.post('/payment/create', data)
  return res.data
}

export const refundPaymentApi = async (data) => {
  const res = await api.post('/payment/refund', data)
  return res.data
}

export const getPaymentDetailApi = async (paymentId) => {
  const res = await api.get(`/payment/${paymentId}`)
  return res.data
}
