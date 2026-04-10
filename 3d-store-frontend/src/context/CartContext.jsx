import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import api from '../api/axios'

const CartContext = createContext()
const CART_KEY = 'ozkan3d_cart'
const SYNC_KEY = 'ozkan3d_cart_synced'

const loadLocalCart = () => {
  try {
    const data = localStorage.getItem(CART_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

const saveLocalCart = (items) => {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}

const cartItemToLocal = (item) => ({
  _id: item._id,
  productId: item.product?._id?.toString() || item.product?.toString(),
  name: item.name || item.product?.name,
  image: item.image || item.product?.images?.[0],
  price: item.price || item.product?.price,
  quantity: item.quantity,
  material: item.material,
  color: item.color,
  slug: item.product?.slug,
})

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(loadLocalCart)
  const [syncing, setSyncing] = useState(false)
  const isSyncingRef = useRef(false)
  const { isAuthenticated, user } = useAuth()
  const userId = user?._id?.toString() || ''

  // items değişince localStorage'a kaydet
  useEffect(() => {
    if (!isSyncingRef.current) {
      saveLocalCart(items)
    }
  }, [items])

  // Backend'den sepeti çek — sadece göster, merge etme
  const fetchBackendCart = useCallback(async () => {
    try {
      const res = await api.get('/cart')
      const backendCart = res.data.data?.items || []
      if (backendCart.length > 0) {
        isSyncingRef.current = true
        localStorage.removeItem(CART_KEY)
        setItems(backendCart.map(cartItemToLocal))
        isSyncingRef.current = false
      } else {
        setItems([])
        localStorage.removeItem(CART_KEY)
      }
    } catch (err) {
      console.log('Backend cart çekme hatası:', err.message)
    }
  }, [])

  // İlk giriş — local + backend merge
  const syncWithBackend = useCallback(async () => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    setSyncing(true)

    try {
      const res = await api.get('/cart')
      const backendCart = res.data.data?.items || []
      const localCart = loadLocalCart()

      console.log('🔄 Sync — Local:', localCart.length, 'Backend:', backendCart.length)

      if (localCart.length > 0) {
        for (const item of localCart) {
          try {
            await api.post('/cart', {
              productId: item.productId,
              quantity: item.quantity,
              material: item.material,
              color: item.color,
              name: item.name,
              image: item.image,
              price: item.price,
            })
          } catch (err) {
            console.log('❌ Item sync hatası:', err.response?.data?.message)
          }
        }
        const updated = await api.get('/cart')
        const mergedItems = updated.data.data?.items || []
        localStorage.removeItem(CART_KEY)
        setItems(mergedItems.map(cartItemToLocal))
      } else if (backendCart.length > 0) {
        localStorage.removeItem(CART_KEY)
        setItems(backendCart.map(cartItemToLocal))
      } else {
        setItems([])
        localStorage.removeItem(CART_KEY)
      }

      // Sync tamamlandı — işaretle
      if (userId) {
        localStorage.setItem(SYNC_KEY, userId)
      }

    } catch (err) {
      console.log('❌ Sync hatası:', err.response?.data?.message || err.message)
    } finally {
      isSyncingRef.current = false
      setSyncing(false)
    }
  }, [userId])

  // Auth değişince
  useEffect(() => {
    if (isAuthenticated && userId) {
      const alreadySynced = localStorage.getItem(SYNC_KEY) === userId
      if (!alreadySynced) {
        syncWithBackend()
      } else {
        fetchBackendCart()
      }
    }

    if (!isAuthenticated) {
      isSyncingRef.current = false
      localStorage.removeItem(SYNC_KEY)
      setItems([])
      localStorage.removeItem(CART_KEY)
    }
  }, [isAuthenticated, userId, syncWithBackend, fetchBackendCart])

  // Sepete ekle
  const addToCart = useCallback(async (product, quantity = 1, material = null, color = null) => {
    const newItem = {
      productId: product._id?.toString() || product.id?.toString(),
      name: product.name,
      image: product.images?.[0] || product.image || null,
      price: product.price,
      quantity,
      material: material || product.material?.[0] || null,
      color: color || product.colors?.[0] || null,
      slug: product.slug,
    }

    // Önce local güncelle
    setItems(prev => {
      const existing = prev.find(i =>
        i.productId === newItem.productId &&
        i.material === newItem.material &&
        i.color === newItem.color
      )
      if (existing) {
        return prev.map(i =>
          i.productId === newItem.productId &&
          i.material === newItem.material &&
          i.color === newItem.color
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      }
      return [...prev, newItem]
    })

    // Giriş yapıldıysa backend'e de ekle
    if (isAuthenticated) {
      try {
        const res = await api.post('/cart', {
          productId: newItem.productId,
          quantity,
          material: newItem.material,
          color: newItem.color,
          name: newItem.name,
          image: newItem.image,
          price: newItem.price,
        })
        // Backend'den gelen _id'yi ekle
        const backendItem = res.data.data?.items?.find(i =>
          i.product?.toString() === newItem.productId &&
          i.material === newItem.material &&
          i.color === newItem.color
        )
        if (backendItem?._id) {
          setItems(prev => prev.map(i =>
            i.productId === newItem.productId &&
            i.material === newItem.material &&
            i.color === newItem.color
              ? { ...i, _id: backendItem._id }
              : i
          ))
        }
      } catch (err) {
        console.log('Backend sepet eklenemedi:', err.response?.data?.message)
      }
    }
  }, [isAuthenticated])

  // Adet güncelle
  const updateQuantity = useCallback(async (productId, quantity, material, color) => {
    if (quantity < 1) return

    setItems(prev => prev.map(i =>
      i.productId === productId && i.material === material && i.color === color
        ? { ...i, quantity }
        : i
    ))

    if (isAuthenticated) {
      try {
        const currentItems = loadLocalCart()
        const item = currentItems.find(i =>
          i.productId === productId &&
          i.material === material &&
          i.color === color
        )
        if (item?._id) {
          await api.put(`/cart/${item._id}`, { quantity })
        }
      } catch (err) {
        console.log('Backend adet güncellenemedi:', err.message)
      }
    }
  }, [isAuthenticated])

  // Ürün sil
  const removeFromCart = useCallback(async (productId, material, color) => {
    const currentItems = loadLocalCart()
    const item = currentItems.find(i =>
      i.productId === productId &&
      i.material === material &&
      i.color === color
    )

    setItems(prev => prev.filter(i =>
      !(i.productId === productId &&
        i.material === material &&
        i.color === color)
    ))

    if (isAuthenticated && item?._id) {
      try {
        await api.delete(`/cart/${item._id}`)
      } catch (err) {
        console.log('Backend ürün silinemedi:', err.message)
      }
    }
  }, [isAuthenticated])

  // Sepeti temizle
  const clearCart = useCallback(async () => {
    setItems([])
    localStorage.removeItem(CART_KEY)
    localStorage.removeItem(SYNC_KEY)
    if (isAuthenticated) {
      try {
        await api.delete('/cart')
      } catch (err) {
        console.log('Backend sepet temizlenemedi:', err.message)
      }
    }
  }, [isAuthenticated])

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)

  return (
    <CartContext.Provider value={{
      items,
      totalItems,
      totalPrice,
      syncing,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)