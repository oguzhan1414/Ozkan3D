import SupportLayout, { SupportArticle, SUPPORT_EMAIL } from './SupportLayout'

const DistanceSellingPage = () => (
  <SupportLayout
    current="Mesafeli satış sözleşmesi"
    title="Mesafeli Satış Sözleşmesi"
    intro="Sitemizden verdiğin siparişlerde tarafların hak ve yükümlülükleri bu sözleşmeyle belirlenir."
  >
    <SupportArticle>
      <section id="taraflar">
        <h2>Madde 1 · Taraflar</h2>
        <p>
          <strong>Satıcı:</strong> Ozkan3d<br />
          <strong>E-posta:</strong> <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a><br />
          <strong>Alıcı e-posta adresi:</strong> Alıcı tarafından sipariş anında sağlanan e-posta adresi.
        </p>
      </section>
      <section id="konu">
        <h2>Madde 2 · Sözleşmenin Konusu</h2>
        <p>İşbu sözleşmenin konusu, ALICI'nın SATICI'ya ait elektronik ticaret internet sitesinden elektronik ortamda siparişini yaptığı ürün/hizmetin satışı ve teslimi ile ilgili olarak Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmelere Dair Yönetmelik hükümleri gereğince tarafların hak ve yükümlülüklerinin saptanmasıdır.</p>
      </section>
      <section id="urunler">
        <h2>Madde 3 · Sözleşme Konusu Ürün ve Hizmetler</h2>
        <p>Ürünlerin cinsi ve türü, miktarı, marka/modeli, rengi ve tüm vergiler dâhil satış bedeli internet sitesinde ödeme öncesi sunulan sipariş özetindeki gibidir.</p>
      </section>
      <section id="genel">
        <h2>Madde 4 · Genel Hükümler</h2>
        <ul>
          <li>Yazılı olmayan 3D basım hizmetlerinde tasarım onaylanıp baskı işlemine geçildikten sonra iptal işlemi uygulanamaz.</li>
          <li>Özel üretim (siparişe dayalı) ürünlerin Cayma Hakkı kapsamı dışında olduğu ALICI tarafından kabul edilir.</li>
          <li>Kargo firmasının teslimatı sırasında üründe hasar tespit edilmesi halinde ALICI kargo tutanağı tutturmakla yükümlüdür.</li>
        </ul>
      </section>
    </SupportArticle>
    <p className="sf-support-updated">Son güncelleme: 1 Ocak 2026</p>
  </SupportLayout>
)

export default DistanceSellingPage
