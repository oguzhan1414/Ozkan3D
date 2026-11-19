import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const ProtectedRoute = ({ children }) => {
  const location = useLocation()
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <div className="page-loading">Yükleniyor...</div>
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />

  return children
}

export const AdminRoute = ({ children }) => {
  const location = useLocation()
  const { isAuthenticated, isAdmin, loading } = useAuth()

  if (loading) return <div className="page-loading">Yükleniyor...</div>
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isAdmin) return <Navigate to="/" replace />

  return children
}
