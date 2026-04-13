import { Helmet } from 'react-helmet-async'

const SEO = ({ title, description, keywords, image, url, noIndex = false }) => {
  const siteTitle = title ? `${title} | Özkan3D - 3D Baskı ve Tasarım` : 'Özkan3D - Profesyonel 3D Baskı ve Tasarım Hizmetleri'
  const defaultDesc = "Özkan3D ile yüksek kaliteli 3D baskı, figür, özel tasarım prototip ve 3D tarama hizmetleri."
  const defaultKeywords = "3d baskı, 3d yazıcı, 3d modelleme, özel 3d tasarım, pla, abs, reçine baskı, 3d tarama, prototip üretimi"
  const defaultUrl = 'https://www.ozkan3d.com.tr'
  const defaultImage = `${defaultUrl}/favicon.png`
  const canonicalUrl = url || (typeof window !== 'undefined'
    ? `${defaultUrl}${window.location.pathname}${window.location.search}`
    : defaultUrl)
  const metaImage = image || defaultImage
  const robotsValue = noIndex ? 'noindex, nofollow' : 'index, follow'

  return (
    <Helmet>
      {/* Standart Meta Etiketleri */}
      <title>{siteTitle}</title>
      <meta name="description" content={description || defaultDesc} />
      <meta name="keywords" content={keywords || defaultKeywords} />
      <meta name="robots" content={robotsValue} />
      <meta name="googlebot" content={robotsValue} />

      {/* 🌟 YENİ: Arama motoru kopya içerik cezası engelleme */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook / WhatsApp İçin */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description || defaultDesc} />
      <meta property="og:site_name" content="Özkan3D" />
      <meta property="og:url" content={canonicalUrl} />
      {/* 🌟 YENİ: Hedef kitle lokasyonu */}
      <meta property="og:locale" content="tr_TR" />
      <meta property="og:image" content={metaImage} />

      {/* Twitter Optimizasyonu */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description || defaultDesc} />
      <meta name="twitter:image" content={metaImage} />
    </Helmet>
  )
}

export default SEO