import { Link } from 'react-router-dom'
import './PolicyPages.css'

const ReturnsPage = () => {
  return (
    <div className="policy-page">
      <div className="policy-header">
        <h1 className="policy-title">İade ve Değişim İşlemleri</h1>
        <p className="policy-updated">Son Güncelleme: 1 Ocak 2026</p>
      </div>
      <div className="policy-content">
        <h2>İade Koşulları</h2>
        <p>Satın almış olduğunuz hazır paket/standart ürünleri teslimat tarihinden itibaren <strong>14 gün içinde</strong> hiçbir gerekçe göstermeksizin iade edebilirsiniz. İade şartları şöyledir:</p>
        <ul>
          <li>Ürünün hiç kullanılmamış veya hasar görmemiş olması gerekir.</li>
          <li>Orijinal kutusu ve ambalajı zarar görmeyecek şekilde (bantlanmamalı vb.) iade gönderilmelidir.</li>
          <li>Kutu içeriğinde eksik parça veya belge olmamalıdır.</li>
        </ul>

        <h2>Özel Tasarım Ürünlerde İade</h2>
        <p>Tüketici Kanununa göre alıcının istekleri veya açıkça kişisel ihtiyaçları doğrultusunda <strong>özel olarak üretilen 3D basım parçalarda iade hakkı bulunmamaktadır.</strong> Tasarım dosyanız üzerinden basılan materyallerin ölçü uyuşmazlığından sorumluluk tarafımızca kabul edilmez.</p>

        <h2>İade Sürecini Nasıl Başlatırım?</h2>
        <ol>
          <li>Üyelerimiz <Link to="/account">Hesabım</Link> sayfasındaki ilgili sipariş üzerinden iade butonuna tıklayarak talebini iletir.</li>
          <li>Üyeliksiz alışveriş yapan kullanıcılarımız iletişim sayfasında veya bilgi@ozkan3d.design mailinden bizimle iletişime geçer.</li>
          <li>Sunulan İade Kodu ile ürün, anlaşmalı firmamıza ücretsiz teslim edilir.</li>
          <li>Ürün tarafımıza ulaştığında incelemesi yapılır, iade onaylandığında para iadeniz otomatik olarak kartınıza/hesabınıza 1-3 iş günü içinde yansır.</li>
        </ol>
      </div>
    </div>
  )
}

export default ReturnsPage
