import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiHome, FiShoppingBag, FiArrowLeft } from 'react-icons/fi'
import './NotFoundPage.css'

const NotFoundPage = () => {
  const navigate = useNavigate()
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    let W = window.innerWidth
    let H = window.innerHeight
    canvas.width = W
    canvas.height = H

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.4 + 0.1,
      color: Math.random() > 0.5 ? '#2563eb' : '#93c5fd',
    }))

    const animate = () => {
      ctx.clearRect(0, 0, W, H)
      particles.forEach(p => {
        p.x += p.speedX
        p.y += p.speedY
        if (p.x < 0) p.x = W
        if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H
        if (p.y > H) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.fill()
      })
      animId = requestAnimationFrame(animate)
    }

    animate()
    const onResize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W
      canvas.height = H
    }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize) }
  }, [])

  return (
    <div className="notfound-page">
      <canvas ref={canvasRef} className="notfound-canvas" />

      <div className="notfound-content">
        <div className="notfound-number">
          <span className="notfound-4">4</span>
          <div className="notfound-cube-wrap">
            <div className="notfound-cube">
              <div className="nf-face nf-front">0</div>
              <div className="nf-face nf-back">0</div>
              <div className="nf-face nf-left">?</div>
              <div className="nf-face nf-right">!</div>
              <div className="nf-face nf-top" />
              <div className="nf-face nf-bottom" />
            </div>
          </div>
          <span className="notfound-4">4</span>
        </div>

        <div className="notfound-text">
          <h1>Sayfa Bulunamadı</h1>
          <p>Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.</p>
        </div>

        <div className="notfound-actions">
          <Link to="/" className="nf-btn-primary">
            <FiHome size={16} />
            Ana Sayfaya Dön
          </Link>
          <Link to="/shop" className="nf-btn-outline">
            <FiShoppingBag size={16} />
            Mağazaya Git
          </Link>
          <button className="nf-btn-back" onClick={() => navigate(-1)}>
            <FiArrowLeft size={16} />
            Geri Dön
          </button>
        </div>

        <div className="notfound-links">
          <span>Popüler sayfalar:</span>
          <Link to="/shop">Mağaza</Link>
          <Link to="/custom">Özel Tasarım</Link>
          <Link to="/contact">İletişim</Link>
          <Link to="/cart">Sepet</Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage