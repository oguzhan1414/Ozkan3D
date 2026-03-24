import api from './axios'

export const registerApi = async (data) => {
  const res = await api.post('/auth/register', data)
  return res.data
}

export const loginApi = async (data) => {
  const res = await api.post('/auth/login', data)
  return res.data
}

export const logoutApi = async () => {
  const res = await api.post('/auth/logout')
  return res.data
}

export const getMeApi = async () => {
  const res = await api.get('/auth/me')
  return res.data
}

export const updateProfileApi = async (data) => {
  const res = await api.put('/auth/profile', data)
  return res.data
}

export const changePasswordApi = async (data) => {
  const res = await api.put('/auth/change-password', data)
  return res.data
}

export const forgotPasswordApi = async (email) => {
  const res = await api.post('/auth/forgot-password', { email })
  return res.data
}

export const resetPasswordApi = async (token, password) => {
  const res = await api.post(`/auth/reset-password/${token}`, { password })
  return res.data
}

export const addAddressApi = async (data) => {
  const res = await api.post('/auth/address', data)
  return res.data
}

export const deleteAddressApi = async (addressId) => {
  const res = await api.delete(`/auth/address/${addressId}`)
  return res.data
}