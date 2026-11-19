import { Link } from 'react-router-dom'
import SupportLayout, { SupportArticle, SUPPORT_EMAIL } from './SupportLayout'

const ReturnsPage = () => (
  <SupportLayout current="İade ve değişim" title="İade ve Değişim Koşulları" intro="Standart ürünlerde iade koşulları, özel tasarım siparişlerin kapsamı ve talep adımları. İhtiyacın olan bilgileri burada bulabilirsin.">
    <SupportArticle>
      <section id="iade-kosullari"><h2>İade koşulları</h2><p>Satın almış olduğunuz hazır paket/standart ürünleri teslimat tarihinden itibaren <strong>14 gün içinde</strong> hiçbir gerekçe göstermeksizin iade edebilirsiniz. İade şartları şöyledir:</p><ul><li>Ürünün hiç kullanılmamış veya hasar görmemiş olması gerekir.</li><li>Orijinal kutusu ve ambalajı zarar görmeyecek şekilde (bantlanmamalı vb.) iade gönderilmelidir.</li><li>Kutu içeriğinde eksik parça veya belge olmamalıdır.</li></ul></section>
      <section id="ozel-urun"><h2>Özel tasarım ürünlerde iade</h2><p>Tüketici Kanununa göre alıcının istekleri veya açıkça kişisel ihtiyaçları doğrultusunda <strong>özel olarak üretilen 3D basım parçalarda iade hakkı bulunmamaktadır.</strong> Tasarım dosyanız üzerinden basılan materyallerin ölçü uyuşmazlığından sorumluluk tarafımızca kabul edilmez.</p></section>
      <section id="iade-sureci"><h2>İade sürecini nasıl başlatırım?</h2><ol><li><Link to="/account">Hesabım</Link> sayfasından ilgili siparişin bilgilerini kontrol edebilirsiniz.</li><li>Sipariş numaranızla birlikte <Link to="/contact?subject=iade">iletişim sayfasından</Link> veya <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> adresinden iade talebinizi iletebilirsiniz.</li><li>Sunulan İade Kodu ile ürün, anlaşmalı firmamıza ücretsiz teslim edilir.</li><li>Ürün tarafımıza ulaştığında incelemesi yapılır, iade onaylandığında para iadeniz otomatik olarak kartınıza/hesabınıza 1-3 iş günü içinde yansır.</li></ol></section>
    </SupportArticle>
    <p className="sf-support-updated">Koşulların son güncellemesi: 1 Ocak 2026</p>
  </SupportLayout>
)

export default ReturnsPage
