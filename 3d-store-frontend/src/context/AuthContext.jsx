import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { loginApi, registerApi, logoutApi, getMeApi } from '../api/authApi'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('token') || null)
  const [loading, setLoading] = useState(true)

  // Kullanıcı bilgilerini yükle
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await getMeApi()
          setUser(res.data)
          localStorage.setItem('user', JSON.stringify(res.data))
        } catch (err) {
          logout()
        }
      }
      setLoading(false)
    }
    loadUser()
  }, [token])

  const login = async (email, password) => {
    const res = await loginApi({ email, password })
    setUser(res.user)
    setToken(res.token)
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
    return res
  }

  const register = async (data) => {
    const res = await registerApi(data)
    setUser(res.user)
    setToken(res.token)
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
    return res
  }

  const logout = useCallback(async () => {
    try { await logoutApi() } catch (err) {}
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('ozkan3d_cart')
    localStorage.removeItem('ozkan3d_cart_synced')
  }, [])

  const isAdmin = user?.role === 'admin'
  const isAuthenticated = !!user && !!token

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, register, logout,
      isAdmin, isAuthenticated,
      setUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)