import { useState } from 'react'
import {
  FiTool, FiBox, FiArchive, FiCamera, FiFileText, FiAperture, FiDownload, FiImage, FiLayers,
} from 'react-icons/fi'
import SEO from '../../components/SEO'
import {
  ServicePage, ServiceHero, ServiceSection, Steps, UseCases, ScanTile, SpecCards, Factors, RequestForm, Faq, CrossLink, scrollToId,
} from '../components/service/ServiceKit'
import '../storefront.css'

const WA_TEXT = 'Merhaba, 3D tarama hakkında bilgi almak istiyorum.'
const FORM_ID = 'tarama-talebi'

const INITIAL = { object: '', size: '', surface: '', purpose: '' }

const STEPS = [
  { icon: FiCamera, who: 'Sen', title: 'Fotoğraf gönder', text: 'Objenin birkaç açıdan fotoğrafını ve yaklaşık ölçüsünü gönder; taranmaya uygun mu bakalım.' },
  { icon: FiFileText, who: 'Biz', title: 'Teklif ve gönderim', text: 'Fiyatı, süreyi ve objeyi nasıl göndereceğini yazılı iletiriz. Onaylarsan objeni kargolarsın.' },
  { icon: FiAperture, who: 'Biz', title: 'Tarama ve düzenleme', text: 'Objeyi tarayıp yüzeyini dijitale aktarır, boşlukları ve gürültüyü temizleyerek modeli hazırlarız.' },
  { icon: FiDownload, who: 'Teslim', title: 'Dosyan ve objen sende', text: 'Model dosyanı gönderir, objeni özenle geri kargolarız. İstersen kopyasını da basarız.' },
]

const EXAMPLES = [
  {
    tag: 'Yedek parça',
    title: 'Kırık ya da eksik parça',
    text: 'Artık bulunmayan bir parçanın kopyasını çıkarmak için önce taranır, sonra yenisi basılır.',
    media: <ScanTile icon={<FiTool aria-hidden="true" />} />,
    prefill: { object: 'Kırılan bir parçanın kopyasını çıkarmak istiyorum. Parça: …', purpose: '3D baskı (kopyasını bastırmak)' },
  },
  {
    tag: 'Çoğaltma',
    title: 'Figür, heykel ve obje',
    text: 'El yapımı bir figürü ya da özel bir objeyi dijital modele çevirip çoğaltmak veya ölçeklemek.',
    media: <ScanTile icon={<FiBox aria-hidden="true" />} />,
    prefill: { object: 'Bir figürü taratmak istiyorum. Malzemesi: …', purpose: '3D baskı (kopyasını bastırmak)' },
  },
  {
    tag: 'Arşiv',
    title: 'Tasarım ve arşiv',
    text: 'Bir ürünün yeniden tasarımına referans olacak ya da arşivlenecek dijital kaydını oluşturmak.',
    media: <ScanTile icon={<FiArchive aria-hidden="true" />} />,
    prefill: { object: 'Bir objenin dijital kaydını çıkarmak istiyorum.', purpose: 'Dijital arşiv' },
  },
]

/* Yüzey uygunluğu: SSS ve fiyat etkenlerindeki bilgiyle aynı */
const SURFACES = [
  {
    title: 'Mat yüzey',
    subtitle: 'Plastik, ahşap, alçı, taş',
    badge: 'Kolay taranır',
    tone: 'ok',
    color: '#b9b4a8',
    text: 'Işığı dağıtan mat yüzeyler en temiz sonucu verir. Çoğu parça ve figür bu gruptadır.',
  },
  {
    title: 'Parlak ya da yansıtıcı',
    subtitle: 'Metal, cilalı, lake',
    badge: 'Ek hazırlık',
    tone: 'warn',
    color: '#c9ced6',
    text: 'Yansımalar taramayı bozabilir. Yüzey geçici olarak matlaştırılarak taranır; bunu teklifte belirtiriz.',
  },
  {
    title: 'Şeffaf ya da çok koyu',
    subtitle: 'Cam, akrilik, siyah parlak',
    badge: 'Ek hazırlık',
    tone: 'warn',
    color: '#2b2b2b',
    text: 'Işığı geçiren ya da yutan yüzeyler zorlar. Göndermeden önce fotoğrafını at, uygun olup olmadığını söyleyelim.',
  },
]

const FORMATS = [
  { title: 'STL', subtitle: 'Baskı için', color: '#ff6b5a', text: 'Kopyasını bastırmak istiyorsan en yaygın format. Neredeyse her dilimleme programı açar.', best: ['3D baskı'] },
  { title: 'OBJ', subtitle: 'Görsel ve tasarım', color: '#5c8fb8', text: 'Tasarım ve görselleştirme programlarında rahat kullanılır, renk ve doku bilgisi taşıyabilir.', best: ['Tasarım', 'Görselleştirme'] },
  { title: 'PLY', subtitle: 'Ham tarama verisi', color: '#6f6a5f', text: 'Taramanın nokta ve yüzey verisini saklar. Arşiv ya da ileri düzenleme için uygundur.', best: ['Arşiv', 'Düzenleme'] },
]

const FACTORS = [
  ['Boyut', 'Büyük objeler daha fazla tarama ve birleştirme gerektirir.'],
  ['Yüzey', 'Mat yüzeyler kolay taranır. Parlak, yansıtıcı, şeffaf ya da çok koyu yüzeyler ek hazırlık ister.'],
  ['Detay seviyesi', 'İnce oymalar, yazılar ve küçük girintiler daha hassas tarama ve daha uzun düzenleme demektir.'],
  ['Kullanım amacı', 'Sadece görsel arşiv yeterliyse daha az iş gerekir. Baskıya hazır, kapalı bir model ya da ölçülü bir CAD modeli istenirse düzenleme süresi uzar.'],
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
    window.setTimeout(() => document.querySelector(`#${FORM_ID} textarea`)?.focus({ preventScroll: true }), 450)
  }

  return (
    <ServicePage variant="scan">
      <SEO
        title="3D Tarama Hizmeti"
        description="Fiziksel objeni 3D tarama ile dijital modele çevirelim. Kırık parça kopyası, figür, prototip ve arşiv için STL, OBJ, PLY teslim; istersen baskısını da yapalım."
        url="/scan"
      />

      <ServiceHero
        film="scan"
        kicker="3D tarama"
        title="Elindeki objeyi dijital modele"
        accent="çevirelim."
        lead="Kopyasını bastırmak, ölçüsünü değiştirmek ya da arşivlemek için objenin yüzeyini 3D tarayıcıyla dijital modele aktarıyoruz."
        primaryLabel="Tarama için teklif iste"
        onPrimary={() => scrollToId(FORM_ID)}
        whatsappText={WA_TEXT}
        
        facts={[
          ['Başlangıç', 'Birkaç fotoğraf ve yaklaşık ölçü', FiImage],
          ['Teslim', 'STL, OBJ ya da PLY dosyası', FiDownload],
          ['Sonrası', 'İstersen kopyasını da basarız', FiLayers],
        ]}
      />

      <ServiceSection
        id="nasil"
        eyebrow="Nasıl çalışır"
        title="Objeden dosyaya dört adım."
        lead="Objen bize gelir, taranır ve sana geri döner. Elinde artık dijital bir kopyası da olur."
      >
        <Steps items={STEPS} />
      </ServiceSection>

      <ServiceSection
        id="ornekler"
        eyebrow="Ne için taranır"
        title="Bir örnek seç, formu senin için dolduralım."
        lead="Kartlardan birine dokun; tarama talebi o örneğe göre hazır gelsin, sadece detayları değiştir."
      >
        <UseCases items={EXAMPLES} onPick={pickExample} />
      </ServiceSection>

      <ServiceSection
        id="yuzey"
        tone="stone"
        eyebrow="Taranabilirlik"
        title="Objen taramaya uygun mu?"
        lead="Sonucu en çok yüzey belirler. Emin değilsen formda “Emin değilim” seç, fotoğrafına bakıp söyleyelim."
      >
        <SpecCards items={SURFACES} />
      </ServiceSection>

      <ServiceSection
        id="format"
        tone="stone"
        eyebrow="Teslim formatı"
        title="Dosyanı nasıl teslim alırsın?"
        lead="Kullanacağın programa göre birlikte seçeriz."
      >
        <SpecCards items={FORMATS} />
      </ServiceSection>

      <ServiceSection
        id="fiyat"
        eyebrow="Şeffaf fiyat"
        title="Fiyatı ne belirler?"
        lead="Her obje farklı olduğu için sabit fiyat yerine objene özel teklif veriyoruz."
      >
        <Factors rows={FACTORS} note="Fotoğrafla ön değerlendirme ücretsizdir." />
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

      <ServiceSection id="sss" eyebrow="SSS" title="Sık sorulanlar">
        <Faq items={FAQ} />
      </ServiceSection>

      <CrossLink
        eyebrow="Özel baskı"
        title="Taramadan sonra baskı mı istiyorsun?"
        text="Dijital modeli çıkarıp aynı ya da farklı ölçüde, istediğin renkte basabiliriz."
        to="/custom"
        label="Özel baskıya bak"
      />
    </ServicePage>
  )
}

export default ScanServicePage
