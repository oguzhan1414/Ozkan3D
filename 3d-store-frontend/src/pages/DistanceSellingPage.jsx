import './PolicyPages.css'

const DistanceSellingPage = () => {
  return (
    <div className="policy-page">
      <div className="policy-header">
        <h1 className="policy-title">Mesafeli Satış Sözleşmesi</h1>
        <p className="policy-updated">Son Güncelleme: 1 Ocak 2026</p>
      </div>
      <div className="policy-content">
        <h2>MADDE 1 - TARAFLAR</h2>
        <p><strong>Satıcı:</strong> Ozkan3D.design<br/>
        <strong>E-posta:</strong> ozkan3d.design@gmail.com<br/>
        <strong>E-posta adresi:</strong> Alıcı tarafından sipariş anında sağlanan e-posta adresi.</p>

        <h2>MADDE 2 - SÖZLEŞMENİN KONUSU</h2>
        <p>İşbu sözleşmenin konusu, ALICI'nın SATICI'ya ait elektronik ticaret internet sitesinden elektronik ortamda siparişini yaptığı ürün/hizmetin satışı ve teslimi ile ilgili olarak Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmelere Dair Yönetmelik hükümleri gereğince tarafların hak ve yükümlülüklerinin saptanmasıdır.</p>

        <h2>MADDE 3 - SÖZLEŞME KONUSU ÜRÜN VE HİZMETLER</h2>
        <p>Ürünlerin cinsi ve türü, miktarı, marka/modeli, rengi ve tüm vergiler dâhil satış bedeli internet sitesinde ödeme öncesi sunulan sipariş özetindeki gibidir.</p>

        <h2>MADDE 4 - GENEL HÜKÜMLER</h2>
        <ul>
          <li>Yazılı olmayan 3D basım hizmetlerinde tasarım onaylanıp baskı işlemine geçildikten sonra iptal işlemi uygulanamaz.</li>
          <li>Özel üretim (siparişe dayalı) ürünlerin Cayma Hakkı kapsamı dışında olduğu ALICI tarafından kabul edilir.</li>
          <li>Kargo firmasının teslimatı sırasında üründe hasar tespit edilmesi halinde ALICI kargo tutanağı tutturmakla yükümlüdür.</li>
        </ul>
      </div>
    </div>
  )
}

export default DistanceSellingPage
