import './BrandLogo.css'

const brandPath = `${import.meta.env.BASE_URL}brand/`

// Kaynak: output/logo-references/final (şeffaf, kırpılmış ve küçültülmüş sürümler public/brand altında)
const WORDMARK = { dark: `${brandPath}ozkan3d-wordmark.png`, light: `${brandPath}ozkan3d-wordmark-light.png`, width: 720, height: 121 }
const ICON = { src: `${brandPath}ozkan3d-icon.png`, size: 256 }

/**
 * Ozkan3d logosu.
 * - compact: yalnızca kare "3d" simgesi (dar alanlar, mobil)
 * - responsive: dar ekranda simgeye geçer
 * - tone="light": koyu zeminler için açık renkli yazı
 */
const BrandLogo = ({ compact = false, responsive = false, tone = 'dark', className = '', ...props }) => {
  const logo = compact ? (
    <img
      className={`sf-logo sf-logo--symbol ${className}`}
      src={ICON.src}
      alt="Ozkan3d"
      width={ICON.size}
      height={ICON.size}
      decoding="async"
      {...props}
    />
  ) : (
    <img
      className={`sf-logo ${className}`}
      src={tone === 'light' ? WORDMARK.light : WORDMARK.dark}
      alt="Ozkan3d"
      width={WORDMARK.width}
      height={WORDMARK.height}
      decoding="async"
      {...props}
    />
  )

  return responsive && !compact ? (
    <picture className="sf-logo-picture">
      <source media="(max-width: 559px)" srcSet={ICON.src} width={ICON.size} height={ICON.size} />
      {logo}
    </picture>
  ) : logo
}

export default BrandLogo
