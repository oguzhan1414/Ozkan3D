import SupportLayout, { SupportArticle, SUPPORT_EMAIL } from './SupportLayout'

const DeliveryPage = () => (
  <SupportLayout current="Teslimat koşulları" title="Teslimat ve Sipariş Koşulları" intro="Siparişin nasıl hazırlanıyor, ne zaman kargoya veriliyor? Teslimat sürecine dair bilmen gerekenler burada.">
    <SupportArticle>
      <section id="gonderim"><h2>Gönderim kapsamı</h2><p>Tüm siparişlerimiz Türkiye'nin dört bir yanına anlaşmalı kargo şirketimiz aracılığıyla gönderilmektedir.</p></section>
      <section id="sure"><h2>İşlem süresi</h2><p>Stokta bulunan ürünler genellikle sipariş onayından sonraki 1-2 iş günü içerisinde kargoya verilmektedir. Özel üretim ve 3D tasarım baskı talepleriniz, boyutuna ve malzeme çeşidine göre 3 ile 7 iş günü arasında hazırlandıktan sonra yola çıkar.</p></section>
      <section id="ucret"><h2>Kargo ücretlendirmesi</h2><p>Kargo bedeli sipariş adımında açıkça gösterilir ve ürünle birlikte tahsil edilir. Güncel gönderim modelimizde ücretsiz kargo kampanyası bulunmamaktadır.</p></section>
      <section id="hasar"><h2>Hasarlı teslimat süreci</h2><p>Paket teslimi sırasında hasar tespit ederseniz, paketi teslim almayarak kargo görevlisine <strong>Hasar Tespit Tutanağı</strong> hazırlatmanız önem arz etmektedir. Tutanağı bize (<a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>) e-posta üzerinden ilettikten sonra, yenileme veya iptal işlemi derhal gerçekleştirilecektir.</p></section>
    </SupportArticle>
    <p className="sf-support-updated">Koşulların son güncellemesi: 1 Ocak 2026</p>
  </SupportLayout>
)

export default DeliveryPage
