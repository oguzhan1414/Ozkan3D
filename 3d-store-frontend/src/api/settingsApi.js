import api from './axios'
export const getSettingsApi = async () => {
  const res = await api.get('/settings')
  return res.data
}

export const updateSettingsApi = async (data) => {
  const res = await api.put('/settings', data)
  return res.data
}

export const uploadHeroImageApi = async (file) => {
  const formData = new FormData()
  formData.append('image', file)

  const res = await api.post('/settings/hero-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return res.data
}