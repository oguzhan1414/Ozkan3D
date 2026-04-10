import axios from 'axios'

const ensureApiBaseUrl = (rawBaseUrl) => {
  const fallbackBaseUrl = 'http://localhost:5000/api'
  const value = (rawBaseUrl || '').trim()

  if (!value) return fallbackBaseUrl

  if (value.startsWith('/')) {
    const normalizedPath = value.replace(/\/+$/, '')
    if (!normalizedPath || normalizedPath === '/') return '/api'
    return normalizedPath.endsWith('/api') ? normalizedPath : `${normalizedPath}/api`
  }

  try {
    const parsedUrl = new URL(value)
    const normalizedPath = parsedUrl.pathname.replace(/\/+$/, '')

    if (!normalizedPath || normalizedPath === '/') {
      parsedUrl.pathname = '/api'
    } else if (!normalizedPath.endsWith('/api')) {
      parsedUrl.pathname = `${normalizedPath}/api`
    } else {
      parsedUrl.pathname = normalizedPath
    }

    return parsedUrl.toString().replace(/\/+$/, '')
  } catch {
    return fallbackBaseUrl
  }
}

const apiBaseUrl = ensureApiBaseUrl(import.meta.env.VITE_API_URL)

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — her isteğe token ekle
api.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
      delete config.headers['content-type']
    }

    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — 401 gelirse çıkış yap
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api