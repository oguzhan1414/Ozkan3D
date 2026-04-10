import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiBell, FiX, FiCheck, FiTrash2, FiShoppingBag, FiUser } from 'react-icons/fi'
import { useSocket } from '../../context/SocketContext'
import './NotificationPanel.css'

const NotificationPanel = () => {
  const [open, setOpen] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const panelRef = useRef(null)
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useSocket()

  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  const getTimeAgo = (timestamp) => {
    const diff = nowMs - new Date(timestamp).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Az önce'
    if (mins < 60) return `${mins} dk önce`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} sa önce`
    return `${Math.floor(hours / 24)} gün önce`
  }

  const getNotifLink = (notif) => {
    if (notif.type === 'newOrder') return `/admin/orders`
    if (notif.type === 'newUser') return `/admin/customers`
    if (notif.type === 'orderCreated') return `/account?tab=orders`
    return '#'
  }

  return (
    <div className="notif-wrap" ref={panelRef}>
      <button
        className={`notif-trigger ${open ? 'notif-trigger-active' : ''}`}
        onClick={() => { setOpen(p => !p); if (!open) markAllRead() }}
      >
        <FiBell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <h4>Bildirimler</h4>
            <div className="notif-panel-actions">
              {notifications.length > 0 && (
                <button className="notif-clear-btn" onClick={clearAll}>
                  <FiTrash2 size={13} /> Temizle
                </button>
              )}
            </div>
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <FiBell size={28} />
                <p>Henüz bildirim yok</p>
              </div>
            ) : (
              notifications.map(notif => (
                <Link
                  key={notif.id}
                  to={getNotifLink(notif)}
                  className={`notif-item ${!notif.read ? 'notif-unread' : ''}`}
                  onClick={() => { markRead(notif.id); setOpen(false) }}
                >
                  <div className="notif-item-icon">
                    {notif.type === 'newOrder' && <FiShoppingBag size={16} />}
                    {notif.type === 'newUser' && <FiUser size={16} />}
                    {notif.type === 'orderCreated' && <FiCheck size={16} />}
                  </div>
                  <div className="notif-item-content">
                    <p className="notif-item-title">{notif.title}</p>
                    <p className="notif-item-message">{notif.message}</p>
                    <span className="notif-item-time">{getTimeAgo(notif.timestamp)}</span>
                  </div>
                  {!notif.read && <div className="notif-dot" />}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationPanel