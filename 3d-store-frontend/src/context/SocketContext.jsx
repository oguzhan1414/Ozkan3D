// Eskiden socket.io kullanıyordu; Vercel serverless kalıcı WebSocket tutamadığı için
// artık Supabase Realtime Broadcast dinleniyor. Dışa açılan API (SocketProvider,
// useSocket) aynı kaldığı için bu context'i kullanan bileşenler değişmedi.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import api from '../api/axios'
import { useAuth } from './AuthContext'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Sadece Realtime için kullanılıyor; veritabanına doğrudan erişim yok (RLS kapalı tutuyor)
const realtimeClient = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

const SocketContext = createContext({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  markRead: () => {},
  clearAll: () => {},
})

export const SocketProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { isAuthenticated, isAdmin, user } = useAuth()

  const addNotification = useCallback((notif) => {
    setNotifications(prev => [notif, ...prev].slice(0, 50))
    setUnreadCount(prev => prev + 1)
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !realtimeClient) return

    let cancelled = false
    const channels = []

    const subscribe = (name, handlers) => {
      const channel = realtimeClient.channel(name)
      for (const [event, handler] of Object.entries(handlers)) {
        channel.on('broadcast', { event }, ({ payload }) => handler(payload || {}))
      }
      channel.subscribe()
      channels.push(channel)
    }

    // Kanal adları sunucuda gizli anahtarla üretilir; sadece giriş yapmış kullanıcıya verilir
    api.get('/auth/realtime')
      .then(({ data }) => {
        if (cancelled) return
        const { user: userTopic, admin: adminTopic } = data?.data || {}

        if (userTopic) {
          subscribe(userTopic, {
            orderCreated: (payload) => addNotification({
              id: Date.now(),
              type: 'orderCreated',
              title: 'Sipariş Alındı!',
              message: payload.message,
              timestamp: payload.timestamp || new Date(),
              read: false,
            }),
          })
        }

        if (isAdmin && adminTopic) {
          subscribe(adminTopic, {
            newOrder: (payload) => addNotification({
              id: Date.now(),
              type: 'newOrder',
              title: 'Yeni Sipariş!',
              message: payload.message,
              data: payload.order,
              timestamp: payload.timestamp || new Date(),
              read: false,
            }),
            newUser: (payload) => addNotification({
              id: Date.now(),
              type: 'newUser',
              title: 'Yeni Üye!',
              message: payload.message,
              data: payload.user,
              timestamp: payload.timestamp || new Date(),
              read: false,
            }),
          })
        }
      })
      .catch((err) => {
        console.log('Bildirim kanalları alınamadı:', err.message)
      })

    return () => {
      cancelled = true
      channels.forEach((channel) => realtimeClient.removeChannel(channel))
    }
  }, [isAuthenticated, isAdmin, user?._id, addNotification])

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const markRead = (id) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, read: true } : n
    ))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const clearAll = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  return (
    <SocketContext.Provider value={{
      notifications,
      unreadCount,
      markAllRead,
      markRead,
      clearAll,
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    return {
      notifications: [],
      unreadCount: 0,
      markAllRead: () => {},
      markRead: () => {},
      clearAll: () => {},
    }
  }
  return context
}
