import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Yeni bir gezinmede (link tıklaması) sayfanın en üstüne gider.
 * Sadece sorgu değişse de (/shop?cat=a → /shop?cat=b) çalışır.
 * Geri/ileri tuşunda (POP) kaydırmaz; tarayıcı eski konumu geri yükler.
 * #bölüm bağlantılarında da kaydırmaz, o bölüme gidilir.
 */
const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (navigationType === 'POP' || hash) return
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, search, hash, navigationType])

  return null
}

export default ScrollToTop
