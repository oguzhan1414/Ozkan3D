import api from './axios'
export const getSettingsApi = async () => {
  const res = await api.get('/settings')
  return res.data
}

export const updateSettingsApi = async (data) => {
  const res = await api.put('/settings', data)
  return res.data
}