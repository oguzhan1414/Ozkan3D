import { Children, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import './Rail.css'

/** Başlıklı, oklarla kaydırılan yatay şerit (sayfalama noktası yok). */
const Rail = ({ title, href, children, itemWidth = 'var(--sf-rail-item)', label }) => {
  const trackRef = useRef(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const update = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    update()
    const el = trackRef.current
    if (!el) return undefined
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [update, children])

  const scroll = (dir) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' })
  }

  // İçerik yoksa başlık tek başına kalmasın
  if (Children.toArray(children).length === 0) return null

  return (
    <section className="sf-section" aria-label={label || title}>
      <div className="sf-section-head">
        <h2 className="sf-section-title">
          {href ? (
            <Link to={href}>
              {title} <FiChevronRight aria-hidden="true" />
            </Link>
          ) : title}
        </h2>
        {/* Kaydırılacak içerik yoksa oklar gizlenir */}
        <div className="sf-arrows" hidden={!canPrev && !canNext}>
          <button type="button" className="sf-arrow" onClick={() => scroll(-1)} disabled={!canPrev} aria-label="Önceki ürünler">
            <FiChevronLeft />
          </button>
          <button type="button" className="sf-arrow" onClick={() => scroll(1)} disabled={!canNext} aria-label="Sonraki ürünler">
            <FiChevronRight />
          </button>
        </div>
      </div>
      <div className="sf-rail" ref={trackRef} style={{ '--sf-item-w': itemWidth }}>
        {children}
      </div>
    </section>
  )
}

export default Rail
