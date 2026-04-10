import api from './axios'

export const getMySupportRequestsApi = async () => {
  const res = await api.get('/support/mine')
  return res.data
}

export const createSupportRequestApi = async (formData) => {
  const res = await api.post('/support', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return res.data
}
