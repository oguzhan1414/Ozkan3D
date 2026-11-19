import './BrandLogo.css'

const brandPath = `${import.meta.env.BASE_URL}brand/`

/** Selected 1B identity; compact shows only the Ö symbol. */
const BrandLogo = ({ compact = false, responsive = false, className = '', ...props }) => {
  const symbol = `${brandPath}ozkan3d-symbol.png`
  const logo = (
    <img
      className={`sf-logo ${compact ? 'sf-logo--symbol' : ''} ${className}`}
      src={compact ? symbol : `${brandPath}ozkan3d-logo-horizontal.png`}
      alt="Özkan3D"
      width={compact ? 1254 : 2114}
      height={compact ? 1254 : 744}
      decoding="async"
      {...props}
    />
  )

  return responsive ? (
    <picture className="sf-logo-picture">
      <source media="(max-width: 559px)" srcSet={symbol} />
      {logo}
    </picture>
  ) : logo
}

export default BrandLogo
