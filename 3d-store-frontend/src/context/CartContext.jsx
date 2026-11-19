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

/** Sepet satırı kimliği: ürün + malzeme + renk + fiyatlı seçenekler + kişiselleştirme */
export const lineKey = (i) => [
  i.productId,
  i.material || '',
  i.color || '',
  (i.options || []).map((o) => `${o.groupId}:${o.valueId}`).sort().join(','),
  i.personalization?.text || '',
].join('|')

const toServerItem = (i) => ({
  productId: i.productId,
  quantity: i.quantity,
  material: i.material,
  color: i.color,
  options: (i.options || []).map((o) => ({ groupId: o.groupId, valueId: o.valueId })),
  personalization: i.personalization?.text || '',
})

const cartItemToLocal = (item) => ({
  _id: item._id,
  productId: item.product?._id?.toString() || item.product?.toString(),
  name: item.name || item.product?.name,
  image: item.image || item.product?.images?.[0],
  price: item.price || item.product?.price,
  quantity: item.quantity,
  material: item.material,
  color: item.color,
  options: item.options || [],
  personalization: item.personalization || null,
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

      if (localCart.length > 0) {
        for (const item of localCart) {
          try {
            await api.post('/cart', toServerItem(item))
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
  // extras: { options: [{groupId, valueId, group, value, priceDelta}], personalization: {label, text}, unitPrice }
  const addToCart = useCallback(async (product, quantity = 1, material = null, color = null, extras = {}) => {
    const newItem = {
      productId: product._id?.toString() || product.id?.toString(),
      name: product.name,
      image: product.images?.[0] || product.image || null,
      // Gösterim için; asıl fiyatı sunucu siparişte yeniden hesaplar
      price: extras.unitPrice ?? product.price,
      quantity,
      material: material || product.material?.[0] || null,
      color: color || product.colors?.[0] || null,
      options: extras.options || [],
      personalization: extras.personalization?.text ? extras.personalization : null,
      slug: product.slug,
    }
    const key = lineKey(newItem)

    setItems((prev) => {
      const existing = prev.find((i) => lineKey(i) === key)
      if (existing) {
        return prev.map((i) => (lineKey(i) === key ? { ...i, quantity: i.quantity + quantity, price: newItem.price } : i))
      }
      return [...prev, newItem]
    })

    // Giriş yapıldıysa sunucu sepetine de ekle; hata çağırana iletilir
    if (isAuthenticated) {
      let res
      try {
        res = await api.post('/cart', toServerItem(newItem))
      } catch (err) {
        // Sunucu reddettiyse (stok, eksik seçim) yerel eklemeyi geri al
        setItems((prev) => prev
          .map((i) => (lineKey(i) === key ? { ...i, quantity: i.quantity - quantity } : i))
          .filter((i) => i.quantity > 0))
        throw new Error(err.response?.data?.message || 'Sepete eklenemedi.')
      }
      const backendItem = (res.data.data?.items || []).map(cartItemToLocal).find((i) => lineKey(i) === key)
      if (backendItem?._id) {
        setItems((prev) => prev.map((i) => (lineKey(i) === key ? { ...i, _id: backendItem._id, price: backendItem.price } : i)))
      }
    }
  }, [isAuthenticated])

  // Adet güncelle (satır nesnesiyle)
  const updateQuantity = useCallback(async (line, quantity) => {
    if (quantity < 1) return
    const key = lineKey(line)
    setItems((prev) => prev.map((i) => (lineKey(i) === key ? { ...i, quantity } : i)))

    if (isAuthenticated && line._id) {
      try {
        await api.put(`/cart/${line._id}`, { quantity })
      } catch (err) {
        console.log('Backend adet güncellenemedi:', err.message)
      }
    }
  }, [isAuthenticated])

  // Ürün sil (satır nesnesiyle)
  const removeFromCart = useCallback(async (line) => {
    const key = lineKey(line)
    setItems((prev) => prev.filter((i) => lineKey(i) !== key))

    if (isAuthenticated && line._id) {
      try {
        await api.delete(`/cart/${line._id}`)
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