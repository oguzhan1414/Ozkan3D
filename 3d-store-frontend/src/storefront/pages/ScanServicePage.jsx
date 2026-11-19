import { useState } from 'react'
import { FiTool, FiBox, FiArchive } from 'react-icons/fi'
import SEO from '../../components/SEO'
import {
  ServiceCinema, QuickPicks, FactorList, ServiceSection, RequestForm, Faq, CrossLink, scrollToId,
} from '../components/service/ServiceKit'
import '../storefront.css'

const WA_TEXT = 'Merhaba, 3D tarama hakkında bilgi almak istiyorum.'
const FORM_ID = 'tarama-talebi'

const INITIAL = { object: '', size: '', surface: '', purpose: '' }

/* Yarısı fiziksel obje, yarısı dijital tel kafes; ortasından tarama çizgisi geçer */
const EXAMPLES = [
  {
    title: 'Kırık ya da eksik parça',
    text: 'Artık bulunmayan bir parçanın kopyasını çıkarmak için önce taranır, sonra yenisi basılır.',
    media: <span className="sv-example-icon"><FiTool aria-hidden="true" /></span>,
    prefill: { object: 'Kırılan bir parçanın kopyasını çıkarmak istiyorum. Parça: …', purpose: '3D baskı (kopyasını bastırmak)' },
  },
  {
    title: 'Figür, heykel ve obje',
    text: 'El yapımı bir figürü ya da özel bir objeyi dijital modele çevirip çoğaltmak veya ölçeklemek.',
    media: <span className="sv-example-icon"><FiBox aria-hidden="true" /></span>,
    prefill: { object: 'Bir figürü taratmak istiyorum. Malzemesi: …', purpose: '3D baskı (kopyasını bastırmak)' },
  },
  {
    title: 'Tasarım ve arşiv',
    text: 'Bir ürünün yeniden tasarımına referans olacak ya da arşivlenecek dijital kaydını oluşturmak.',
    media: <span className="sv-example-icon"><FiArchive aria-hidden="true" /></span>,
    prefill: { object: 'Bir objenin dijital kaydını çıkarmak istiyorum.', purpose: 'Dijital arşiv' },
  },
]


const FACTORS = [
  ['Boyut', 'Büyük objeler daha fazla tarama ve birleştirme gerektirir.'],
  ['Yüzey', 'Mat yüzeyler kolay taranır. Parlak, yansıtıcı, şeffaf ya da çok koyu yüzeyler ek hazırlık ister.'],
  ['Detay seviyesi', 'İnce oymalar, yazılar ve küçük girintiler daha hassas tarama ve daha uzun düzenleme demektir.'],
  ['Modelin kullanım amacı', 'Sadece görsel arşiv yeterliyse daha az iş gerekir. Baskıya hazır, kapalı bir model ya da ölçülü bir CAD modeli istenirse düzenleme süresi uzar.'],
]

const FAQ = [
  ['Her obje taranabilir mi?', 'Çoğu obje taranabilir. Parlak, şeffaf, çok koyu ya da çok ince detaylı yüzeyler zorlayabilir. Göndermeden önce fotoğrafını at, uygun olup olmadığını söyleyelim.'],
  ['Objemi nasıl göndereceğim, geri alacak mıyım?', 'Teklifi onayladıktan sonra paketleme ve kargo bilgisini iletiriz. Tarama bitince objen aynı özenle sana geri gönderilir.'],
  ['Hangi dosya formatında teslim alırım?', 'STL, OBJ veya PLY. Kullanacağın programa göre birlikte seçeriz.'],
  ['Tarama sonucu CAD modeli olur mu?', 'Tarama yüzeyin üçgenlerden oluşan bir modelini (mesh) verir; ölçüleri düzenlenebilen bir CAD modeli değildir. CAD modeli gerekiyorsa taramayı referans alıp ayrıca modelleriz, bunu teklifte belirtiriz.'],
  ['Taranan modeli bastırabilir miyim?', 'Evet. Talepte baskı istediğini belirt; tarama ve baskıyı tek teklifte birleştirelim.'],
]

const buildMessage = (v) => [
  `Obje: ${v.object.trim()}`,
  `Yaklaşık ölçü: ${v.size.trim() || 'Belirtilmedi'}`,
  `Yüzey: ${v.surface || 'Belirtilmedi'}`,
  `Kullanım amacı: ${v.purpose || 'Belirtilmedi'}`,
].join('\n')

const ScanServicePage = () => {
  const [values, setValues] = useState(INITIAL)
  const change = (name, value) => setValues((v) => ({ ...v, [name]: value }))

  const pickExample = (prefill) => {
    setValues({ ...INITIAL, ...prefill })
    scrollToId(FORM_ID)
    window.setTimeout(() => document.querySelector(`#${FORM_ID} textarea`)?.focus({ preventScroll: true }), 350)
  }

  return (
    <div className="sf-root sf-page sv-page">
      <SEO
        title="3D Tarama Hizmeti"
        description="Fiziksel objeni 3D tarama ile dijital modele çevirelim. Kırık parça kopyası, figür, prototip ve arşiv için STL, OBJ, PLY teslim; istersen baskısını da yapalım."
        url="/scan"
      />
      <ServiceCinema
        kicker="3D tarama"
        title="Elindeki objeyi dijital modele çevirelim."
        lead="Kopyasını bastırmak, ölçüsünü değiştirmek ya da arşivlemek için objenin yüzeyini 3D tarayıcıyla dijital modele aktarıyoruz."
        primaryLabel="Tarama için teklif iste"
        onPrimary={() => scrollToId(FORM_ID)}
        whatsappText={WA_TEXT}
        facts={[
          ['Başlangıç', 'Birkaç fotoğraf ve yaklaşık ölçü'],
          ['Teslim', 'STL · OBJ · PLY'],
          ['Sonrası', 'İstersen baskısını da yaparız'],
        ]}
        film="scan"
      />
      <div className="sf-container">
        <RequestForm
          id={FORM_ID}
          aside={(
            <>
              <QuickPicks items={EXAMPLES} onPick={pickExample} />
              <FactorList rows={FACTORS} note="Fotoğrafla ön değerlendirme ücretsizdir." />
            </>
          )}
          title="Tarama için teklif iste"
          lead="Objeyi ve ne yapmak istediğini anlat. Fotoğrafları formdan sonra WhatsApp ya da e-postayla gönderebilirsin."
          subject="3D Tarama Talebi"
          whatsappText={WA_TEXT}
          values={values}
          onChange={change}
          buildMessage={buildMessage}
          submitLabel="Tarama talebini gönder"
          successTitle="Tarama talebin bize ulaştı."
          fields={[
            {
              name: 'object', label: 'Taranacak obje ne?', type: 'textarea', required: true, wide: true, rows: 5,
              requiredMessage: 'Objeyi kısaca anlat.',
              placeholder: 'Örn. Eski bir radyonun kırılan düğmesi. Plastik, mat siyah. Kopyasını bastırmak istiyorum.',
            },
            { name: 'size', label: 'Yaklaşık ölçü', placeholder: 'Örn. 15 × 10 × 8 cm' },
            { name: 'surface', label: 'Yüzeyi nasıl?', type: 'select', options: ['Seç', 'Mat', 'Parlak / yansıtıcı', 'Şeffaf', 'Emin değilim'] },
            {
              name: 'purpose', label: 'Modeli ne için kullanacaksın?', type: 'select', wide: true,
              options: ['Seç', '3D baskı (kopyasını bastırmak)', 'Tasarım / prototip', 'Dijital arşiv', 'Diğer'],
            },
          ]}
        />

        <ServiceSection id="sss" title="Sık sorulanlar">
          <Faq items={FAQ} />
        </ServiceSection>

        <CrossLink
          title="Taramadan sonra baskı mı istiyorsun?"
          text="Dijital modeli çıkarıp aynı ya da farklı ölçüde, istediğin renkte basabiliriz."
          to="/custom"
          label="Özel baskıya bak"
        />
      </div>
    </div>
  )
}

export default ScanServicePage
