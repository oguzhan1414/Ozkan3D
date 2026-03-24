import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiCheck, FiShoppingBag, FiHome, FiMail, FiMapPin, FiPackage } from 'react-icons/fi'
import './OrderSuccessPage.css'

const CanvasConfetti = () => {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: ['#2563eb', '#16a34a', '#f59e0b', '#e53e3e', '#8b5cf6', '#06b6d4'][Math.floor(Math.random() * 6)],
      speed: Math.random() * 3 + 1,
      angle: Math.random() * 360,
      spin: (Math.random() - 0.5) * 4,
    }))

    let animId
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      pieces.forEach(p => {
        p.y += p.speed
        p.angle += p.spin
        if (p.y < canvas.height) alive = true
        ctx.save()
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2)
        ctx.rotate((p.angle * Math.PI) / 180)
        ctx.globalAlpha = Math.max(0, 1 - p.y / canvas.height)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })
      if (alive) animId = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(animId)
  }, [])
  return <canvas ref={canvasRef} className="confetti-canvas" />
}

const OrderSuccessPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const order = location.state

  // State yoksa checkout'a yönlendir
  useEffect(() => {
    if (!order?.orderNo) {
      navigate('/')
    }
  }, [])

  if (!order?.orderNo) return null

  return (
    <div className="success-page">
      <CanvasConfetti />

      <div className="success-card">

        {/* Başarı ikonu */}
        <div className="success-icon">
          <FiCheck size={40} />
        </div>

        {/* Başlık */}
        <div className="success-content">
          <p className="success-order-no">
            Sipariş No: <strong>{order.orderNo}</strong>
          </p>
          <h1 className="success-title">Siparişiniz Alındı! 🎉</h1>
          <p className="success-desc">
            Siparişiniz başarıyla oluşturuldu. Üretim süreciniz başladı,
            kargo takip bilgileri e-posta adresinize gönderilecektir.
          </p>
        </div>

        {/* Sipariş Adımları */}
        <div className="success-steps">
          {[
            { icon: '✅', label: 'Sipariş Alındı', done: true },
            { icon: '🖨️', label: 'Üretimde', done: false },
            { icon: '📦', label: 'Paketlendi', done: false },
            { icon: '🚚', label: 'Kargoda', done: false },
            { icon: '🏠', label: 'Teslim Edildi', done: false },
          ].map((s, i) => (
            <div key={i} className={`success-step ${s.done ? 'success-step-done' : ''}`}>
              <div className="success-step-icon">{s.icon}</div>
              <span>{s.label}</span>
              {i < 4 && <div className={`success-step-line ${s.done ? 'line-done' : ''}`} />}
            </div>
          ))}
        </div>

        {/* Sipariş Detayı */}
        <div className="success-order-detail">

          {/* Ürünler */}
          {order.items?.length > 0 && (
            <div className="success-detail-section">
              <div className="success-detail-title">
                <FiPackage size={15} />
                <span>Sipariş Edilen Ürünler</span>
              </div>
              <div className="success-items">
                {order.items.map((item, i) => (
                  <div key={i} className="success-item">
                    <div className="success-item-img">
                      {item.image ? (
                        <img src={item.image} alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                      ) : (
                        <div className="success-item-placeholder">3D</div>
                      )}
                    </div>
                    <div className="success-item-info">
                      <strong>{item.name}</strong>
                      <span>
                        {item.material && `${item.material}`}
                        {item.color && ` · `}
                        {item.color && (
                          <span className="success-item-color" style={{ background: item.color }} />
                        )}
                        {` · ${item.quantity} adet`}
                      </span>
                    </div>
                    <span className="success-item-price">
                      {(item.price * item.quantity).toLocaleString('tr-TR')}₺
                    </span>
                  </div>
                ))}
              </div>
              <div className="success-total-row">
                <span>Toplam</span>
                <strong>{order.totalPrice?.toLocaleString('tr-TR')}₺</strong>
              </div>
            </div>
          )}

          {/* Teslimat Adresi */}
          {order.shippingAddress && (
            <div className="success-detail-section">
              <div className="success-detail-title">
                <FiMapPin size={15} />
                <span>Teslimat Adresi</span>
              </div>
              <div className="success-address">
                <strong>{order.shippingAddress.fullName}</strong>
                <span>{order.shippingAddress.address}</span>
                <span>{order.shippingAddress.district} / {order.shippingAddress.city}</span>
                <span>{order.shippingAddress.phone}</span>
              </div>
            </div>
          )}
        </div>

        {/* Mail bildirimi */}
        <div className="success-info-box">
          <FiMail size={16} />
          <span>Sipariş detayları ve kargo takip bilgileri e-posta adresinize gönderildi.</span>
        </div>

        {/* Butonlar */}
        <div className="success-actions">
          <Link to="/account?tab=orders" className="btn-orders">
            <FiShoppingBag size={16} />
            Siparişlerimi Gör
          </Link>
          <Link to="/" className="btn-home">
            <FiHome size={16} />
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  )
}

export default OrderSuccessPage