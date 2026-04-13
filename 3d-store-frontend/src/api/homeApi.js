import api from './axios'

export const getHomeBootstrapApi = async (params = {}) => {
  const res = await api.get('/home/bootstrap', { params })
  return res.data
}
