import { FiHeart } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useFavorite } from '../context/FavoriteContext'
import { useAuth } from '../context/AuthContext'
import './FavoriteButton.css'

const FavoriteButton = ({ productId, className = '' }) => {
  const { isFavorite, toggleFavorite } = useFavorite()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const favored = isFavorite(productId)

  const handleToggle = (e) => {
    e.preventDefault() // Link tıklamasını engellemek için
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } })
      return
    }
    toggleFavorite(productId)
  }

  return (
    <button
      className={`favorite-btn ${favored ? 'favored' : ''} ${className}`}
      onClick={handleToggle}
      title={favored ? "Favorilerden Çıkar" : "Favorilere Ekle"}
    >
      <FiHeart size={20} className={favored ? 'heart-filled' : 'heart-outline'} />
    </button>
  )
}

export default FavoriteButton
