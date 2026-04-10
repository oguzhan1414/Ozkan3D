import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  markRead: () => {},
  clearAll: () => {},
})

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { isAuthenticated, isAdmin, user } = useAuth()

  const addNotification = useCallback((notif) => {
    setNotifications(prev => [notif, ...prev].slice(0, 50))
    setUnreadCount(prev => prev + 1)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    socketRef.current = io(
      import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
      { withCredentials: true }
    )

    const socket = socketRef.current

    socket.on('connect', () => {
      console.log('🔌 Socket bağlandı:', socket.id)
      if (isAdmin) socket.emit('joinAdmin')
      if (user?._id) socket.emit('joinUser', user._id)
    })

    if (isAdmin) {
      socket.on('newOrder', (data) => {
        addNotification({
          id: Date.now(),
          type: 'newOrder',
          title: 'Yeni Sipariş!',
          message: data.message,
          data: data.order,
          timestamp: data.timestamp || new Date(),
          read: false,
        })
      })

      socket.on('newUser', (data) => {
        addNotification({
          id: Date.now(),
          type: 'newUser',
          title: 'Yeni Üye!',
          message: data.message,
          data: data.user,
          timestamp: data.timestamp || new Date(),
          read: false,
        })
      })
    }

    socket.on('orderCreated', (data) => {
      addNotification({
        id: Date.now(),
        type: 'orderCreated',
        title: 'Sipariş Alındı!',
        message: data.message,
        timestamp: data.timestamp || new Date(),
        read: false,
      })
    })

    socket.on('disconnect', () => {
      console.log('🔌 Socket ayrıldı')
    })

    socket.on('connect_error', (err) => {
      console.log('🔌 Socket bağlantı hatası:', err.message)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
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