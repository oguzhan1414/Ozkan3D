import './PolicyPages.css'

const DeliveryPage = () => {
  return (
    <div className="policy-page">
      <div className="policy-header">
        <h1 className="policy-title">Teslimat ve Sipariş Koşulları</h1>
        <p className="policy-updated">Son Güncelleme: 1 Ocak 2026</p>
      </div>
      <div className="policy-content">
        <h2>1. Gönderim Kapsamı</h2>
        <p>Tüm siparişlerimiz Türkiye'nin dört bir yanına anlaşmalı kargo şirketimiz aracılığıyla gönderilmektedir.</p>

        <h2>2. İşlem Süresi </h2>
        <p>Stokta bulunan ürünler genellikle sipariş onayından sonraki 1-2 iş günü içerisinde kargoya verilmektedir. Özel üretim ve 3D tasarım baskı talepleriniz, boyutuna ve malzeme çeşidine göre 3 ile 7 iş günü arasında hazırlandıktan sonra yola çıkar.</p>

        <h2>3. Kargo Ücretlendirmesi</h2>
        <p>Kargo bedeli sipariş adımında açıkça gösterilir ve ürünle birlikte tahsil edilir. Güncel gönderim modelimizde ücretsiz kargo kampanyası bulunmamaktadır.</p>

        <h2>4. Hasarlı Teslimat Süreci</h2>
        <p>Paket teslimi sırasında hasar tespit ederseniz, paketi teslim almayarak kargo görevlisine <strong>Hasar Tespit Tutanağı</strong> hazırlatmanız önem arz etmektedir. Tutanağı bize (ozkan3d.design@gmail.com) e-posta üzerinden ilettikten sonra, yenileme veya iptal işlemi derhal gerçekleştirilecektir.</p>
      </div>
    </div>
  )
}

export default DeliveryPage
