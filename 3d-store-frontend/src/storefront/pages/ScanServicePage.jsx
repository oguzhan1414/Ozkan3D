import { useId, useState } from 'react'
import { FiTool, FiBox, FiArchive } from 'react-icons/fi'
import SEO from '../../components/SEO'
import {
  ServiceHero, ServiceSection, ExampleCards, Steps, FactorTable, RequestForm, Faq, CrossLink, scrollToId,
} from '../components/service/ServiceKit'
import '../storefront.css'
import './ScanServicePage.css'

const WA_TEXT = 'Merhaba, 3D tarama hakkında bilgi almak istiyorum.'
const FORM_ID = 'tarama-talebi'

const INITIAL = { object: '', size: '', surface: '', purpose: '' }

/* Yarısı fiziksel obje, yarısı dijital tel kafes; ortasından tarama çizgisi geçer */
const VASE = 'M157 58 Q200 42 243 58 L232 105 C225 133 276 178 270 249 Q264 290 200 298 Q136 290 130 249 C124 178 175 133 168 105Z'

const ScanVisual = () => {
  const id = useId().replace(/:/g, '')
  return (
    <svg className="sc-visual" viewBox="0 0 400 340" role="img" aria-label="Bir vazonun sol yarısı fiziksel, sağ yarısı dijital tel kafes model olarak çizilmiş; ortasından tarama çizgisi geçiyor">
      <defs>
        <clipPath id={`${id}-left`}><rect x="0" y="0" width="200" height="340" /></clipPath>
        <clipPath id={`${id}-right`}><rect x="200" y="0" width="200" height="340" /></clipPath>
        <clipPath id={`${id}-body`}><path d={VASE} /></clipPath>
      </defs>

      <ellipse cx="200" cy="306" rx="96" ry="10" fill="#e4e4e4" />

      {/* Fiziksel yarı */}
      <path d={VASE} fill="#222" clipPath={`url(#${id}-left)`} />

      {/* Dijital yarı: tel kafes */}
      <g clipPath={`url(#${id}-right)`}>
        <path d={VASE} fill="#fff" stroke="#222" strokeWidth="1.5" />
        <g clipPath={`url(#${id}-body)`} fill="none" stroke="#222" strokeWidth="0.8" opacity="0.55">
          {Array.from({ length: 17 }, (_, i) => (
            <path key={`h${i}`} d={`M120 ${56 + i * 15} H280`} />
          ))}
          {[12, 26, 40, 54, 68].map((dx) => (
            <path key={`v${dx}`} d={`M${200 + dx * 0.55} 46 C${200 + dx * 0.3} 125 ${200 + dx * 1.45} 185 ${200 + dx * 0.8} 300`} />
          ))}
        </g>
        {[[214, 101], [236, 171], [247, 231], [222, 282], [229, 130]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill="#fff" stroke="#222" strokeWidth="1.2" />
        ))}
      </g>

      {/* Tarama çizgisi */}
      <g className="sc-beam">
        <path d="M70 170 H330" stroke="#ff385c" strokeWidth="2" />
        <circle cx="70" cy="170" r="4" fill="#ff385c" />
        <circle cx="330" cy="170" r="4" fill="#ff385c" />
      </g>
      <path d="M200 30 V316" stroke="#222" strokeWidth="1" strokeDasharray="3 5" opacity="0.35" />
    </svg>
  )
}

const ScanHeroMedia = () => (
  <div className="sc-hero-media">
    <ScanVisual />
    <div className="sc-hero-labels" aria-hidden="true">
      <span>Fiziksel obje</span>
      <span>Dijital model</span>
    </div>
  </div>
)

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

const STEPS = [
  { title: 'Fotoğraf gönder', text: 'Objenin birkaç açıdan fotoğrafını ve yaklaşık ölçüsünü paylaş. Taramaya uygun mu bakalım.' },
  { title: 'Teklif ve gönderim', text: 'Fiyatı, süreyi ve objeyi bize nasıl ulaştıracağını yazılı olarak iletiriz.' },
  { title: 'Tarama ve düzenleme', text: 'Objeyi tarar, oluşan modeldeki boşlukları ve gürültüyü temizleriz.' },
  { title: 'Model teslimi', text: 'Dijital model dosyanı gönderir, objeni sana geri kargolarız.' },
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
      <div className="sf-container">
        <ServiceHero
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
          media={<ScanHeroMedia />}
        />

        <ServiceSection id="ornekler" title="Ne için taratılır?" lead="Örneğe tıkla, form senin için dolsun.">
          <ExampleCards items={EXAMPLES} onPick={pickExample} pickLabel="Benimki de böyle" />
        </ServiceSection>

        <ServiceSection id="nasil" title="Nasıl çalışır?">
          <Steps items={STEPS} />
        </ServiceSection>

        <ServiceSection id="fiyat" title="Fiyatı ne belirler?" lead="Her obje farklı olduğu için fotoğrafları gördükten sonra objeye özel teklif veriyoruz.">
          <FactorTable rows={FACTORS} note="Fotoğrafla ön değerlendirme ücretsizdir." />
        </ServiceSection>

        <RequestForm
          id={FORM_ID}
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
