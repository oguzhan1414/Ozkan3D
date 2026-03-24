import api from './axios'

export const sendContactMessageApi = async (formData) => {
  const response = await api.post('/contact', formData)
  return response.data
}

// Alias used by ScanServicePage and CustomPrintPage
export const submitContactFormApi = sendContactMessageApi
