import api from './axios'

/** Renk paleti + varsayılan hazırlık süresi: { data: [{_id,name,hex}], leadDays: {min,max} } */
export const getColorsApi = async () => {
  const res = await api.get('/colors')
  return res.data
}

export const createColorApi = async (data) => {
  const res = await api.post('/colors', data)
  return res.data
}

export const updateColorApi = async (id, data) => {
  const res = await api.put(`/colors/${id}`, data)
  return res.data
}

export const deleteColorApi = async (id) => {
  const res = await api.delete(`/colors/${id}`)
  return res.data
}
