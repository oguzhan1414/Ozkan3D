import { FiBookOpen } from 'react-icons/fi'
import './PolicyPages.css'

const BlogPage = () => {
  return (
    <div className="policy-page">
      <div className="policy-header">
        <h1 className="policy-title">Kütüphane ve Blog</h1>
        <p className="policy-updated">3D dünyasındaki yenilikleri ve gelişmeleri yakından takip edin.</p>
      </div>
      
      <div className="blog-placeholder">
        <FiBookOpen className="blog-placeholder-icon" />
        <h2>Çok Yakında İçeriklerimizle Buradayız!</h2>
        <p style={{ maxWidth: '500px', color: '#475569', margin: '0 auto' }}>Türkiye'nin en yenilikçi 3D baskı ve modelleme rehberleri, ürün kullanım senaryoları ve haberler çok yakında bu sayfada olacak.</p>
      </div>
    </div>
  )
}

export default BlogPage
