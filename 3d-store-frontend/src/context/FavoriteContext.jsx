import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getFavoritesApi, toggleFavoriteApi } from '../api/userApi'

const FavoriteContext = createContext()

export const FavoriteProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(false)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) fetchFavorites()
    else setFavorites([])
  }, [isAuthenticated])

  const fetchFavorites = async () => {
    setLoading(true)
    try {
      const res = await getFavoritesApi()
      setFavorites(res.data || [])
    } catch (err) {
      console.log('Favoriler yüklenemedi:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = useCallback(async (productId) => {
    if (!isAuthenticated) return false

    // Optimistic update
    const isFav = favorites.some(f => (f._id || f) === productId)
    if (isFav) {
      setFavorites(prev => prev.filter(f => (f._id || f) !== productId))
    } else {
      setFavorites(prev => [...prev, { _id: productId }])
    }

    try {
      const res = await toggleFavoriteApi(productId)
      // Backend'den gelen gerçek listeyle güncelle
      await fetchFavorites()
      return res.isFavorite
    } catch (err) {
      // Hata durumunda geri al
      fetchFavorites()
      console.log('Favori güncellenemedi:', err.message)
      return isFav
    }
  }, [favorites, isAuthenticated])

  const isFavorite = useCallback((productId) => {
    return favorites.some(f => (f._id || f)?.toString() === productId?.toString())
  }, [favorites])

  return (
    <FavoriteContext.Provider value={{
      favorites,
      loading,
      toggleFavorite,
      isFavorite,
      fetchFavorites,
    }}>
      {children}
    </FavoriteContext.Provider>
  )
}

export const useFavorite = () => useContext(FavoriteContext)