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

// ---- Admin
export const getSupportAdminApi = async (params = {}) => {
  const res = await api.get('/support/admin', { params })
  return res.data
}

export const getSupportAttachmentApi = async (id) => {
  const res = await api.get(`/support/admin/${id}/attachment`)
  return res.data
}

export const updateSupportApi = async (id, data) => {
  const res = await api.put(`/support/admin/${id}`, data)
  return res.data
}
