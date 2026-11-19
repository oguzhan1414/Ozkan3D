import api from './axios'

/** Satış raporu: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' } */
export const getReportApi = async (params = {}) => {
  const res = await api.get('/reports', { params })
  return res.data
}

/** Aralıktaki siparişleri CSV olarak indirir */
export const downloadOrdersCsvApi = async (params = {}) => {
  const res = await api.get('/reports/orders.csv', { params, responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `siparisler-${params.from || ''}_${params.to || ''}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
